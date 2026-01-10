import streamlit as st
import os
import numpy as np
import cv2
from PIL import Image
import io
import logging
import torch
from typing import Tuple, Optional
import time
import math
from streamlit.components.v1 import html

# Import functions from arbresV4.py
from arbresv4 import (
    load_image,
    segment_tree_multi_approach,
    detect_tree_extremes,
    estimate_height_and_dbh,
    render_overlay,
    create_vegetation_mask_by_color,
    try_maskrcnn_segmentation,
    create_fallback_mask,
    refine_tree_mask
)

# Import enhanced models
try:
    from arbresv4_enhanced import (
        segment_tree_multi_approach_enhanced,
        detect_tree_extremes_pca,
        estimate_height_and_dbh_enhanced
    )
    ENHANCED_AVAILABLE = True
except ImportError:
    ENHANCED_AVAILABLE = False

try:
    from arbres_depth_guided import (
        segment_tree_multi_approach_depth,
        refine_extremes_with_depth,
        load_midas,
        infer_depth
    )
    DEPTH_AVAILABLE = True
except ImportError:
    DEPTH_AVAILABLE = False

# Import trigonometric calculation function
from trigonometric_calculator import calculate_real_tree_height_with_distance# Set up logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger("arborvision_streamlit")

# Set page configuration
st.set_page_config(
    page_title="ArborVision - Tree Analysis",
    page_icon="🌲",
    layout="wide"
)

# Global variables for Midas model
midas_model = None
midas_transforms = None

def load_midas_model():
    """Load Midas model for depth estimation"""
    global midas_model, midas_transforms

    if midas_model is None:
        try:
            # Import Midas components
            from torchvision.transforms import Compose
            from midas.dpt_depth import DPTDepthModel
            from midas.transforms import Resize, NormalizeImage, PrepareForNet

            # Load model
            model_path = "midas_weights/dpt_large-midas-2f21e586.pt"
            if not os.path.exists(model_path):
                # Try to download the model if not present
                import urllib.request
                os.makedirs("midas_weights", exist_ok=True)
                url = "https://github.com/isl-org/MiDaS/releases/download/v3_1/dpt_large-midas-2f21e586.pt"
                urllib.request.urlretrieve(url, model_path)

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            midas_model = DPTDepthModel(
                path=model_path,
                backbone="vitl16_384",
                non_negative=True,
            )
            midas_model.to(device)
            midas_model.eval()

            # Load transforms
            midas_transforms = Compose([
                lambda img: {"image": img / 255.0},
                Resize(
                    384, 384,
                    resize_target=None,
                    keep_aspect_ratio=True,
                    ensure_multiple_of=32,
                    resize_method="minimal",
                    image_interpolation_method=cv2.INTER_CUBIC,
                ),
                NormalizeImage(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
                PrepareForNet(),
            ])

            log.info("Midas model loaded successfully")
            return True

        except Exception as e:
            log.error(f"Failed to load Midas model: {e}")
            return False

    return True

def estimate_depth_with_midas(img_rgb: np.ndarray) -> Optional[np.ndarray]:
    """Estimate depth using Midas model"""
    if not load_midas_model():
        return None

    try:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Prepare input
        img_input = midas_transforms({"image": img_rgb})["image"]

        # Convert to tensor and move to device
        img_tensor = torch.from_numpy(img_input).to(device).unsqueeze(0)

        with torch.no_grad():
            prediction = midas_model(img_tensor)

            # Resize prediction to original image size
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=img_rgb.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()

            # Convert to numpy
            depth_map = prediction.cpu().numpy()

            # Normalize depth map to 0-255 range for visualization
            depth_map_normalized = cv2.normalize(depth_map, None, 0, 255, cv2.NORM_MINMAX, cv2.CV_8U)

            return depth_map_normalized

    except Exception as e:
        log.error(f"Depth estimation failed: {e}")
        return None

def calculate_depth_based_scale(depth_map: np.ndarray, tree_mask: np.ndarray, known_height_m: float = 1.7) -> float:
    """Calculate pixels per meter using depth information and known reference height"""
    if depth_map is None or tree_mask is None:
        return None

    try:
        # Get depth values in the tree region
        tree_depths = depth_map[tree_mask > 0]

        if len(tree_depths) == 0:
            return None

        # Calculate average depth of the tree
        avg_tree_depth = np.mean(tree_depths)

        # Assume the camera is at a known height (typical person height)
        camera_height_m = known_height_m

        # Calculate the scale factor
        # Depth values are typically in inverse depth (1/distance)
        # Higher depth values = closer objects
        # We need to convert this to actual distance

        # Simple approximation: assume depth values are proportional to 1/distance
        # The scale factor relates pixel distances to real-world distances
        pixels_per_meter = avg_tree_depth / camera_height_m

        return pixels_per_meter

    except Exception as e:
        log.error(f"Scale calculation failed: {e}")
        return None

def calculate_distance_from_angles(h_cam: float, angle_base_deg: float, angle_top_deg: float) -> Optional[float]:
    """Calculate distance to tree using trigonometric method"""
    try:
        # Convert angles to radians
        theta_b = math.radians(angle_base_deg)
        theta_t = math.radians(angle_top_deg)

        # Calculate denominator
        denom = math.tan(theta_t) - math.tan(theta_b)

        if abs(denom) < 1e-6:
            return None  # Invalid angles

        # Calculate distance
        D = h_cam / denom
        return D

    except Exception as e:
        log.error(f"Distance calculation failed: {e}")
        return None

def calculate_real_tree_height_with_distance(pixel_height: int, distance_m: float, camera_height_m: float = 1.6) -> Tuple[float, float, str, float]:
    """Calculate real tree height using trigonometric distance and pixel measurements"""
    try:
        # Calculate the angle subtended by the tree in the image
        # This is an approximation - in reality we'd need the camera's field of view
        # For now, we'll use a simplified approach

        # Assume a typical smartphone camera field of view (approximately 60 degrees horizontal)
        fov_horizontal_deg = 60.0
        fov_horizontal_rad = math.radians(fov_horizontal_deg)

        # Calculate the angular width of the tree in the image
        # This is a rough approximation
        image_width_pixels = 1600  # Assuming standard image width
        tree_width_pixels = pixel_height * 0.3  # Rough estimate of tree width based on height

        angular_width_rad = (tree_width_pixels / image_width_pixels) * fov_horizontal_rad

        # Calculate real tree height using trigonometry
        # tan(angular_width/2) = (tree_width/2) / distance
        # So tree_width = 2 * distance * tan(angular_width/2)

        tree_width_m = 2 * distance_m * math.tan(angular_width_rad / 2)

        # For height calculation, we need to consider the camera position relative to tree base
        # If camera is at height h_cam and tree base is at ground level:
        # Real tree height = h_cam + (pixel_height_ratio * distance_adjustment)

        # Simplified calculation using similar triangles
        # The ratio of pixel height to total image height gives us the angular height
        image_height_pixels = 1200  # Assuming standard image height
        angular_height_rad = (pixel_height / image_height_pixels) * fov_horizontal_rad * (image_height_pixels / image_width_pixels)

        # Calculate real height using trigonometry
        real_height_m = distance_m * math.tan(angular_height_rad) + camera_height_m

        # Ensure positive height
        real_height_m = max(0.1, real_height_m)

        # Calculate uncertainty (rough estimate)
        uncertainty_pct = 0.25  # 25% uncertainty for trigonometric measurements
        height_ci = real_height_m * uncertainty_pct

        # Classify tree size
        if real_height_m < 3:
            size_label = "PETIT"
        elif real_height_m < 8:
            size_label = "MOYEN"
        else:
            size_label = "GRAND"

        # Estimate DBH (rough approximation)
        if size_label == "PETIT":
            dbh_m = real_height_m * 0.055
        elif size_label == "MOYEN":
            dbh_m = real_height_m * 0.065
        else:
            dbh_m = real_height_m * 0.075

        return real_height_m, height_ci, size_label, dbh_m

    except Exception as e:
        log.error(f"Real height calculation failed: {e}")
        # Fallback to original calculation
        return 0.66, 0.17, "PETIT", 0.036

def main():
    st.title("🌲 ArborVision - Tree Analysis")
    
    # Select analysis model
    analysis_model = st.sidebar.selectbox(
        "Analysis Model",
        ["Standard", "Enhanced", "Depth-guided"],
        help="Choose the analysis model to use for tree detection and measurement"
    )

    # Show model availability
    if analysis_model == "Enhanced" and not ENHANCED_AVAILABLE:
        st.sidebar.warning("Enhanced model not available")
        analysis_model = "Standard"
    if analysis_model == "Depth-guided" and not DEPTH_AVAILABLE:
        st.sidebar.warning("Depth-guided model not available")
        analysis_model = "Standard"

    # Maximum image size
    max_size = st.sidebar.slider("Maximum image size (px)", 400, 2000, 1600, 100)
    
    # Optional manual pixels per meter
    use_manual_ppm = st.sidebar.checkbox("Use manual pixels per meter", False)
    pixels_per_meter = None
    if use_manual_ppm:
        pixels_per_meter = st.sidebar.number_input("Pixels per meter", 1.0, 5000.0, 1000.0, 10.0)
    
    # Select segmentation method
    segmentation_method = st.sidebar.selectbox(
        "Segmentation method", 
        ["Auto (best available)", "Color-based", "Mask R-CNN (if available)", "Shape-based"]
    )
    
    # Depth estimation option
    use_depth_estimation = st.sidebar.checkbox("Use depth estimation (Midas)", False)
    camera_height = None
    if use_depth_estimation:
        camera_height = st.sidebar.number_input("Camera height (m)", 1.0, 3.0, 1.7, 0.1)
    
    # Trigonometric distance measurement
    st.sidebar.header("📏 Distance Measurement")
    use_trigonometric = st.sidebar.checkbox("Use trigonometric distance measurement", False)
    
    h_cam_trig = None
    angle_base = None
    angle_top = None
    calculated_distance = None
    
    if use_trigonometric:
        st.sidebar.markdown("**Instructions:**")
        st.sidebar.markdown("1. Stand at a stable position")
        st.sidebar.markdown("2. Measure camera height above ground")
        st.sidebar.markdown("3. Aim at tree base and click 'Take base angle'")
        st.sidebar.markdown("4. Aim at tree top and click 'Take top angle'")
        
        h_cam_trig = st.sidebar.number_input("Camera height (m)", 0.2, 3.0, 1.6, 0.01)
        
        # HTML/JS component for angle measurement
        angle_component_html = """
        <div style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0;">
            <p><strong>Angle Measurement:</strong></p>
            <button id="baseBtn" style="margin: 5px; padding: 8px 16px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Take Base Angle</button>
            <button id="topBtn" style="margin: 5px; padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Take Top Angle</button>
            <div id="angleDisplay" style="margin-top: 10px; font-family: monospace;"></div>
        </div>
        <script>
        let lastPitch = 0;
        let baseAngle = null;
        let topAngle = null;
        
        window.addEventListener('deviceorientation', (ev) => {
            // Use beta for pitch (up/down angle)
            const pitch = ev.beta || 0;
            lastPitch = pitch;
            document.getElementById('angleDisplay').innerHTML = 
                `Current angle: ${pitch.toFixed(1)}°<br>` +
                `Base angle: ${baseAngle !== null ? baseAngle.toFixed(1) + '°' : 'Not set'}<br>` +
                `Top angle: ${topAngle !== null ? topAngle.toFixed(1) + '°' : 'Not set'}`;
        });
        
        document.getElementById('baseBtn').onclick = () => {
            baseAngle = lastPitch;
            window.parent.postMessage({
                isStreamlitMessage: true, 
                type: 'ANGLE_BASE', 
                angle: baseAngle
            }, "*");
            document.getElementById('angleDisplay').innerHTML = 
                `Current angle: ${lastPitch.toFixed(1)}°<br>` +
                `Base angle: ${baseAngle.toFixed(1)}°<br>` +
                `Top angle: ${topAngle !== null ? topAngle.toFixed(1) + '°' : 'Not set'}`;
        };
        
        document.getElementById('topBtn').onclick = () => {
            topAngle = lastPitch;
            window.parent.postMessage({
                isStreamlitMessage: true, 
                type: 'ANGLE_TOP', 
                angle: topAngle
            }, "*");
            document.getElementById('angleDisplay').innerHTML = 
                `Current angle: ${lastPitch.toFixed(1)}°<br>` +
                `Base angle: ${baseAngle !== null ? baseAngle.toFixed(1) + '°' : 'Not set'}<br>` +
                `Top angle: ${topAngle.toFixed(1)}°`;
        };
        </script>
        """
        
        html(angle_component_html, height=200)
        
        # Manual angle inputs as fallback
        st.sidebar.markdown("**Or enter angles manually:**")
        angle_base = st.sidebar.number_input("Base angle (degrees)", -90.0, 90.0, 0.0, 0.1)
        angle_top = st.sidebar.number_input("Top angle (degrees)", -90.0, 90.0, 45.0, 0.1)
        
        # Calculate distance
        if st.sidebar.button("Calculate Distance"):
            calculated_distance = calculate_distance_from_angles(h_cam_trig, angle_base, angle_top)
            if calculated_distance is not None:
                st.sidebar.success(f"Calculated distance: {calculated_distance:.2f} m")
            else:
                st.sidebar.error("Invalid angles. Please ensure top angle > base angle.")
    
    # Upload image
    st.header("Upload an image of a tree")
    uploaded_file = st.file_uploader("Choose an image file", type=["jpg", "jpeg", "png"])
    
    # Camera input option
    use_camera = st.checkbox("Or use camera", False)
    camera_image = None
    if use_camera:
        camera_image = st.camera_input("Take a photo")
    
    # Process the image
    if uploaded_file is not None or camera_image is not None:
        col1, col2 = st.columns(2)
        
        with st.spinner("Processing image..."):
            try:
                # Get image data
                if uploaded_file is not None:
                    image_data = uploaded_file.read()
                    image_source = "upload"
                else:
                    image_data = camera_image.read()
                    image_source = "camera"
                
                # Create a temporary file to process with OpenCV
                temp_file = f"temp_{int(time.time())}.jpg"
                with open(temp_file, "wb") as f:
                    f.write(image_data)
                
                # Load and process image
                img_bgr, img_rgb, H, W = load_image(temp_file, max_side=max_size)
                
                # Display original image
                with col1:
                    st.subheader("Original Image")
                    st.image(img_rgb, channels="RGB", use_column_width=True)
                
                # Depth estimation with Midas (if enabled)
                depth_map = None
                depth_based_ppm = None
                if use_depth_estimation:
                    with st.spinner("Estimating depth with Midas..."):
                        depth_map = estimate_depth_with_midas(img_rgb)
                        if depth_map is not None:
                            st.success("Depth estimation completed!")
                        else:
                            st.warning("Depth estimation failed. Using fallback methods.")
                
                # Perform segmentation based on selected method and model
                if segmentation_method == "Color-based":
                    tree_mask = create_vegetation_mask_by_color(img_rgb)
                    if tree_mask is None:
                        st.error("No tree detected with color-based segmentation.")
                        return
                    tree_mask = refine_tree_mask(tree_mask, img_rgb)
                elif segmentation_method == "Mask R-CNN (if available)":
                    if torch.cuda.is_available():
                        device = "cuda"
                    else:
                        device = "cpu"
                    tree_mask = try_maskrcnn_segmentation(img_rgb, device=device)
                    if tree_mask is None:
                        st.error("No tree detected with Mask R-CNN segmentation.")
                        return
                    tree_mask = refine_tree_mask(tree_mask, img_rgb)
                elif segmentation_method == "Shape-based":
                    tree_mask = create_fallback_mask(img_rgb)
                    if tree_mask is None:
                        st.error("No tree detected with shape-based segmentation.")
                        return
                    tree_mask = refine_tree_mask(tree_mask, img_rgb)
                else:  # Auto (best available)
                    if analysis_model == "Enhanced":
                        tree_mask = segment_tree_multi_approach_enhanced(img_rgb, device="cpu")
                    elif analysis_model == "Depth-guided":
                        tree_mask = segment_tree_multi_approach_depth(img_rgb, device="cpu")
                    else:  # Standard
                        tree_mask = segment_tree_multi_approach(img_rgb, device="cpu")
                
                # Display mask
                with col2:
                    st.subheader("Tree Segmentation")
                    mask_display = np.zeros_like(img_rgb)
                    mask_display[tree_mask > 0] = [0, 255, 0]  # Green mask
                    alpha = 0.5
                    overlay = cv2.addWeighted(img_rgb, 1-alpha, mask_display, alpha, 0)
                    st.image(overlay, channels="RGB", use_column_width=True)
                
                # Display depth map if available
                if depth_map is not None:
                    st.subheader("Depth Map")
                    # Apply colormap to depth map for better visualization
                    depth_colored = cv2.applyColorMap(depth_map, cv2.COLORMAP_JET)
                    st.image(depth_colored, channels="BGR", use_column_width=True)
                    
                    # Calculate depth-based scale
                    if camera_height is not None:
                        depth_based_ppm = calculate_depth_based_scale(depth_map, tree_mask, camera_height)
                        if depth_based_ppm is not None:
                            st.info(f"Depth-based scale: {depth_based_ppm:.1f} pixels/meter")
                
                # Detect tree extremes based on selected model
                if analysis_model == "Enhanced":
                    (base_x, base_y), (top_x, top_y) = detect_tree_extremes_pca(tree_mask)
                elif analysis_model == "Depth-guided":
                    # Use depth-guided detection if depth map is available
                    if depth_map is not None:
                        (base_x, base_y), (top_x, top_y) = detect_tree_extremes_pca(tree_mask)
                        (base_x, base_y), (top_x, top_y) = refine_extremes_with_depth(tree_mask, (base_x, base_y), (top_x, top_y), depth_map)
                        st.info("Depth-guided extreme refinement applied!")
                    else:
                        (base_x, base_y), (top_x, top_y) = detect_tree_extremes_pca(tree_mask)
                else:  # Standard
                    (base_x, base_y), (top_x, top_y) = detect_tree_extremes(tree_mask)
                
                # Calculate pixel height
                pixel_height = abs(top_y - base_y)
                
                # Determine pixels per meter (use depth-based if available, otherwise manual or default)
                effective_ppm = pixels_per_meter
                scale_source = "manual"
                
                if depth_based_ppm is not None and not use_manual_ppm:
                    effective_ppm = depth_based_ppm
                    scale_source = "depth-based"
                elif not use_manual_ppm:
                    effective_ppm = None
                    scale_source = "default reference"
                
                # Estimate height - use trigonometric distance if available
                if calculated_distance is not None and use_trigonometric:
                    # Use trigonometric distance for more accurate calculation
                    height_m, height_ci, size_label, dbh_m = calculate_real_tree_height_with_distance(
                        pixel_height, calculated_distance, h_cam_trig
                    )
                    scale_source = "trigonometric distance"
                else:
                    # Use model-specific height estimation
                    if analysis_model == "Enhanced":
                        height_m, height_ci, size_label, dbh_m = estimate_height_and_dbh_enhanced(
                            pixel_height, manual_ppm=effective_ppm
                        )
                    else:  # Standard or Depth-guided
                        height_m, height_ci, size_label, dbh_m = estimate_height_and_dbh(
                            pixel_height, manual_ppm=effective_ppm
                        )
                
                # Render result
                result_image = render_overlay(
                    img_bgr, (base_x, base_y), (top_x, top_y),
                    height_m, height_ci, size_label, dbh_m
                )
                
                # Display results
                st.header("Analysis Results")
                col_result, col_metrics = st.columns(2)
                
                with col_result:
                    st.subheader("Detected Tree")
                    st.image(result_image, channels="BGR", use_column_width=True)
                
                with col_metrics:
                    st.subheader("Tree Measurements")
                    st.metric("Tree Height", f"{height_m:.2f} m", f"±{height_ci:.2f} m")
                    st.metric("Tree Size Classification", size_label)
                    st.metric("Estimated DBH (Diameter at Breast Height)", f"{dbh_m:.2f} m")
                    st.metric("Pixel Height", f"{pixel_height} px")
                    st.metric("Scale Source", scale_source)
                    if pixels_per_meter:
                        st.metric("Manual Scale", f"{pixels_per_meter:.1f} px/m")
                    if depth_based_ppm:
                        st.metric("Depth-based Scale", f"{depth_based_ppm:.1f} px/m")
                    if calculated_distance is not None:
                        st.metric("Trigonometric Distance", f"{calculated_distance:.2f} m")
                
                # Download options
                st.header("Download Results")
                
                # Convert result to bytes for download
                is_success, buffer = cv2.imencode(".jpg", result_image)
                io_buf = io.BytesIO(buffer)
                
                # Download buttons
                col_download1, col_download2 = st.columns(2)
                
                with col_download1:
                    st.download_button(
                        label="Download Annotated Image",
                        data=io_buf,
                        file_name=f"tree_analysis_{int(time.time())}.jpg",
                        mime="image/jpeg",
                    )
                
                # Clean up
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                
            except Exception as e:
                st.error(f"Error processing image: {str(e)}")
                st.exception(e)
                if os.path.exists(temp_file):
                    os.remove(temp_file)
    
    # Information section
    st.header("About ArborVision")
    st.markdown("""
    ArborVision is an application that helps estimate tree heights and diameters using computer vision.
    
    **How to use:**
    1. Upload an image containing a tree or take a photo with your camera
    2. The app will automatically detect the tree and calculate its dimensions
    3. You can adjust settings in the sidebar for more precise measurements
    
    **Analysis Models:**
    - **Standard**: Original ArborVision model with basic segmentation and height estimation
    - **Enhanced**: Improved segmentation with Test-Time Augmentation (TTA) and better color processing
    - **Depth-guided**: Uses MiDaS depth estimation to refine tree apex/base detection for improved accuracy
    
    **Segmentation methods:**
    - **Auto**: Uses the best available method
    - **Color-based**: Uses color filtering to identify vegetation
    - **Mask R-CNN**: Uses deep learning for object detection (if available)
    - **Shape-based**: Falls back to basic shape detection
    
    **Depth Estimation (NEW):**
    - **Midas Integration**: Uses deep learning to estimate depth from single images
    - **Automatic Scale Calculation**: Computes pixels-per-meter from depth information
    - **Improved Accuracy**: More precise measurements using depth-based scaling
    
    **Trigonometric Distance Measurement (NEW):**
    - **Device Orientation**: Uses smartphone sensors to measure angles
    - **Real-time Calculation**: Computes distance using trigonometric formulas
    - **Manual Input**: Fallback option for manual angle entry
    """)

if __name__ == "__main__":
    main()