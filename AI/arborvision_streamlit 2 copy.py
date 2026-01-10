import os
# Temporary workaround for OpenMP duplicate runtime initialization (libiomp5md.dll)
# This must be set before importing packages that load OpenMP (numpy, tensorflow, torch, etc.).
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')

import streamlit as st
# Streamlit configuration must be the first Streamlit command
st.set_page_config(page_title="ArborVision", layout="centered")
from PIL import Image, ImageDraw
# Ensure compatibility with older/newer streamlit where image_to_url may be missing
try:
    from streamlit.elements import image as _st_image
    if not hasattr(_st_image, 'image_to_url'):
        # provide a minimal compatible implementation that returns a data URL
        def _image_to_url_fallback(*args, **kwargs):
            """Compatibility shim: accept any signature and pick the first sensible image-like
            argument (positional or keyword). Returns a data-URL or a temp file path on failure.
            """
            try:
                import base64, io, tempfile, os

                # Try to find the image parameter from positional args first
                img = None
                for a in args:
                    if a is None:
                        continue
                    img = a
                    break

                # Common kw names used by callers
                if img is None:
                    for k in ('image', 'img', 'file', 'background_image'):
                        if k in kwargs and kwargs[k] is not None:
                            img = kwargs[k]
                            break

                # Last resort: take any kw value
                if img is None and kwargs:
                    img = next(iter(kwargs.values()))

                if img is None:
                    return ''

                # If a string path or URL is passed, return it unchanged
                if isinstance(img, str):
                    return img

                # If it's a numpy array, convert to PIL
                try:
                    from PIL import Image as _PILImage
                    if not hasattr(img, 'save'):
                        img = _PILImage.fromarray(img)
                except Exception:
                    pass

                buf = io.BytesIO()
                img.save(buf, format='PNG')
                b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                return f"data:image/png;base64,{b64}"
            except Exception:
                # best-effort: save to a temp file and return file path
                try:
                    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
                    try:
                        img.save(tmp.name)
                    except Exception:
                        # if img is bytes-like write bytes
                        try:
                            if hasattr(img, 'read'):
                                tmp.write(img.read())
                                tmp.flush()
                        except Exception:
                            pass
                    tmp.close()
                    return tmp.name
                except Exception:
                    return ''

        # Assign the fallback to several likely places so third-party packages
        # (like streamlit_drawable_canvas) find a callable regardless of how
        # they import the image helper.
        try:
            _st_image.image_to_url = _image_to_url_fallback
        except Exception:
            pass
        try:
            # top-level streamlit module may expose image helpers differently
            if hasattr(st, 'image'):
                setattr(st, 'image_to_url', _image_to_url_fallback)
        except Exception:
            pass
        try:
            import importlib
            for modname in ('streamlit.image', 'streamlit.elements.image', 'streamlit.elements.image_proto'):
                try:
                    m = importlib.import_module(modname)
                    setattr(m, 'image_to_url', _image_to_url_fallback)
                except Exception:
                    continue
        except Exception:
            pass
except Exception:
    # If anything goes wrong, we'll rely on try/except around st_canvas calls elsewhere
    pass
import io
import os
import re
import pandas as pd
import numpy as np
import cv2
import datetime
import tempfile
import time
import atexit
import io as _io

# Optional imports
try:
    import easyocr
    _EASYOCR_AVAILABLE = True
except Exception:
    _EASYOCR_AVAILABLE = False

try:
    import RPi.GPIO as GPIO
    _RPI_GPIO_AVAILABLE = True
except Exception:
    _RPI_GPIO_AVAILABLE = False

try:
    import pytesseract
    _PYTESSERACT_AVAILABLE = True
except Exception:
    _PYTESSERACT_AVAILABLE = False

# Optional model imports
try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except Exception:
    _YOLO_AVAILABLE = False

# Optional canvas for interactive annotation
try:
    from streamlit_drawable_canvas import st_canvas
    _CANVAS_AVAILABLE = True
except Exception:
    _CANVAS_AVAILABLE = False

try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    _TF_AVAILABLE = True
except Exception:
    _TF_AVAILABLE = False


@st.cache_resource
def load_models():
    """Attempt to load YOLO and a saved disease model if present.
    Returns (yolo_model or None, disease_model or None)
    """
    yolo = None
    disease = None

    if _YOLO_AVAILABLE:
        # prefer local weights if present
        for candidate in ("yolov8m.pt", "yolov8n.pt", "yolov8n-seg.pt", "yolov8m-seg.pt"):
            if os.path.exists(candidate):
                try:
                    yolo = YOLO(candidate)
                    break
                except Exception:
                    yolo = None

    if _TF_AVAILABLE:
        # try to load a saved Keras model if provided by the user
        if os.path.exists("plant_disease_pro_model.h5"):
            try:
                disease = load_model("plant_disease_pro_model.h5")
            except Exception:
                disease = None

    return yolo, disease


# load once
yolo_model, disease_model = load_models()

DB_PATH = "arbre_data.xlsx"
CAPTURES_DIR = "captures"
CAPTURES_CSV = "captures_log.csv"

# ----------------------- Helpers -----------------------

def ensure_session():
    if "step" not in st.session_state:
        st.session_state.step = "home"
    if "tree_type" not in st.session_state:
        st.session_state.tree_type = None
    if "tree_id" not in st.session_state:
        st.session_state.tree_id = None
    if "tree_info" not in st.session_state:
        st.session_state.tree_info = {}


def safe_rerun():
    """Call Streamlit rerun if available, otherwise stop the script safely.
    This avoids AttributeError on older/newer Streamlit builds where experimental_rerun
    may not exist.
    """
    try:
        # preferred
        getattr(st, 'experimental_rerun')()
    except Exception:
        try:
            # best-effort fallback: stop current run so UI can refresh on next interaction
            st.stop()
        except Exception:
            pass


def perform_ocr_from_image(pil_image: Image.Image):
    """Use EasyOCR (French) when available with parsing logic adapted from app2.py.
    Returns dict with keys: name, type, gps, raw
    """
    info = {
        'name': None,
        'type': None,
        'gps': None,
        'raw': ''
    }

    detected_texts = []

    if _EASYOCR_AVAILABLE:
        try:
            # prefer French language for labels
            reader = easyocr.Reader(['fr'], gpu=True)
            results = reader.readtext(np.array(pil_image),
                                      batch_size=4,
                                      text_threshold=0.3,
                                      low_text=0.3,
                                      link_threshold=0.3,
                                      decoder='beamsearch',
                                      blocklist='')

            # mirror app2.py parsing: find frutopy label, tree type and GPS
            frutopy_detected = False
            arbres_connus = {
                "Oranger", "Olivier", "Chêne", "Palmier", "Eucalyptus",
                "Pommier", "Cerisier", "Abricotier", "Poirier", "Citronnier"
            }

            gps_pattern = r'(\d{1,3}\.\d{4,}),\s*(\d{1,3}\.\d{4,})'

            for item in results:
                try:
                    bbox, text, prob = item
                except Exception:
                    # fallback structure
                    continue

                if prob < 0.2:
                    continue

                text = text.strip()
                detected_texts.append(text)
                info['raw'] += text + '\n'

                if 'frutopy' in text.lower():
                    frutopy_detected = True
                    continue

                if frutopy_detected and not info['name']:
                    info['name'] = text
                    frutopy_detected = False
                    continue

                for arbre in arbres_connus:
                    if arbre.lower() in text.lower():
                        info['type'] = arbre
                        break

                if re.search(gps_pattern, text):
                    info['gps'] = text

        except Exception:
            # fall through to pytesseract/fallback
            pass

    # pytesseract fallback
    if (not info['name'] and not info['type'] and not info['gps']) and _PYTESSERACT_AVAILABLE:
        try:
            txt = pytesseract.image_to_string(pil_image, lang='fra')
            detected_texts += [l.strip() for l in txt.splitlines() if l.strip()]
            info['raw'] += txt
            # simple split attempt
            parts = [p.strip() for p in txt.replace('\n', ';').split(';') if p.strip()]
            if parts:
                info['name'] = parts[0] if not info['name'] else info['name']
            if len(parts) > 1:
                info['type'] = parts[1] if not info['type'] else info['type']
            if len(parts) > 2:
                info['gps'] = parts[2] if not info['gps'] else info['gps']
        except Exception:
            pass

    # final fallbacks
    if not info['name'] and detected_texts:
        info['name'] = detected_texts[0]
    if not info['name']:
        info['name'] = 'AUTO_NAME'
    if not info['type']:
        info['type'] = 'Unknown'
    if not info['gps']:
        info['gps'] = ''

    return info


def simulate_sensors():
    # Read real sensors if available. Do NOT fabricate simulated values.
    if _RPI_GPIO_AVAILABLE:
        try:
            real = read_sensors_real()
            if isinstance(real, dict):
                return real
        except Exception:
            # hardware read failed -> return None to indicate unavailable
            return None

    # Sensors not available on this platform -> return None (no simulated data)
    return None


# ----- Raspberry Pi sensor helpers -----
_GPIO_INITIALIZED = False
_TRIG_PIN = 23
_ECHO_PIN = 24
_LASER_PIN = 2

def _init_gpio():
    global _GPIO_INITIALIZED
    if _GPIO_INITIALIZED:
        return
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(_TRIG_PIN, GPIO.OUT)
    GPIO.setup(_ECHO_PIN, GPIO.IN)
    GPIO.setup(_LASER_PIN, GPIO.IN)
    # ensure trigger low
    GPIO.output(_TRIG_PIN, False)
    time.sleep(0.1)
    _GPIO_INITIALIZED = True

def _cleanup_gpio():
    try:
        GPIO.cleanup()
    except Exception:
        pass

if _RPI_GPIO_AVAILABLE:
    atexit.register(_cleanup_gpio)


def get_ultrasonic_distance_once(timeout=0.02):
    """Trigger the ultrasonic sensor and measure distance in meters.
    Returns float meters or None on timeout/error.
    timeout: max wait for echo in seconds (per phase)
    """
    try:
        _init_gpio()
        # trigger
        GPIO.output(_TRIG_PIN, True)
        time.sleep(0.00001)
        GPIO.output(_TRIG_PIN, False)

        start = time.time()
        # wait for echo to go high
        t0 = time.time()
        while GPIO.input(_ECHO_PIN) == 0:
            t1 = time.time()
            if t1 - t0 > timeout:
                return None
            start = time.time()

        # wait for echo to go low
        t0 = time.time()
        stop = time.time()
        while GPIO.input(_ECHO_PIN) == 1:
            t1 = time.time()
            if t1 - t0 > timeout:
                return None
            stop = time.time()

        elapsed = stop - start
        # speed of sound ~34300 cm/s -> convert to meters
        distance_cm = (elapsed * 34300) / 2
        return round(distance_cm / 100.0, 2)
    except Exception:
        return None


def read_sensors_real():
    """Read laser (boolean) and ultrasonic (meters) and return dict similar to simulator."""
    _init_gpio()
    try:
        laser_state = GPIO.input(_LASER_PIN)
    except Exception:
        laser_state = 0

    distance_m = None
    if laser_state:
        # if laser detects (beam interrupted) then measure distance
        distance_m = get_ultrasonic_distance_once()

    # If distance measurement failed, return None values so caller can decide.
    if distance_m is None:
        return {'ultrasound_m': None, 'laser_m': None}

    return {'ultrasound_m': distance_m, 'laser_m': distance_m}


# ----- Pi camera preview helper (single-frame) -----
def capture_pi_frame(device_index=0, timeout_s=2.0):
    """Capture one frame from a V4L2 device (Pi camera via /dev/video0) using OpenCV.
    Returns a PIL.Image or None.
    """
    try:
        cap = cv2.VideoCapture(device_index, cv2.CAP_V4L)
    except Exception:
        try:
            cap = cv2.VideoCapture(device_index)
        except Exception:
            return None

    if not cap.isOpened():
        try:
            cap.release()
        except Exception:
            pass
        return None

    t0 = time.time()
    frame = None
    while time.time() - t0 < timeout_s:
        ret, f = cap.read()
        if ret and f is not None:
            frame = f
            break
        time.sleep(0.05)

    try:
        cap.release()
    except Exception:
        pass

    if frame is None:
        return None

    # convert BGR to RGB and to PIL
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def estimate_dimensions(image: Image.Image, sensors: dict):
    # Improved heuristic: try to detect trunk width in the image and use calibration
    h_px = image.height
    w_px = image.width
    px_per_m = st.session_state.get('px_per_m', None)

    # Height: prefer calibration when present
    if px_per_m and px_per_m > 0:
        height_m = round(h_px / px_per_m, 3)
    else:
        # If sensors are provided and valid use them; otherwise fall back to pixel-only estimate
        sensors_ok = bool(sensors and sensors.get('ultrasound_m') not in (None, 0) and sensors.get('laser_m') not in (None, 0))
        if sensors_ok:
            scale = (sensors.get('ultrasound_m', 0.0) + sensors.get('laser_m', 0.0)) / 2.0
            height_m = round(scale * (h_px / 500.0), 2)
        else:
            # Pixel-only heuristic: try to estimate tree silhouette height in pixels
            try:
                np_img = np.array(image.convert('RGB'))
                bgr = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
                hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
                lower_green = np.array([25, 40, 40])
                upper_green = np.array([100, 255, 255])
                mask_green = cv2.inRange(hsv, lower_green, upper_green)
                # clean
                k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
                mask_green = cv2.morphologyEx(mask_green, cv2.MORPH_OPEN, k)
                mask_green = cv2.morphologyEx(mask_green, cv2.MORPH_CLOSE, k)
                ys = np.where(np.any(mask_green > 0, axis=1))[0]
                if ys.size > 0:
                    tree_px_height = int(ys.max() - ys.min())
                else:
                    tree_px_height = h_px
                # If we have px_per_m we'd convert, but here we infer a rough px_per_m from species
                species = st.session_state.get('tree_info', {}).get('type', '')
                species_defaults = {
                    'Oranger': 3.0, 'Citronnier': 3.0, 'Pommier': 4.0, 'Cerisier': 4.0,
                    'Chêne': 10.0, 'Eucalyptus': 8.0, 'Olivier': 6.0
                }
                assumed_h_m = species_defaults.get(species, 5.0)
                px_per_m_est = tree_px_height / float(assumed_h_m) if assumed_h_m > 0 else (h_px / 5.0)
                height_m = round(tree_px_height / px_per_m_est, 3)
            except Exception:
                # best-effort fallback
                height_m = round(h_px / 100.0, 2)

    # Diameter estimation: more robust trunk thickness estimation using connected components + distance transform
    try:
        np_img = np.array(image.convert('RGB'))
        bgr = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        # Candidate trunk pixels: low saturation / darker / brownish hues in HSV
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        h_chan, s_chan, v_chan = cv2.split(hsv)
        # brownish hue range and low saturation/darker V are typical for trunks
        mask_brown = cv2.inRange(hsv, np.array([5, 30, 20]), np.array([30, 200, 200]))
        mask_dark = cv2.threshold(v_chan, 80, 255, cv2.THRESH_BINARY_INV)[1]
        # edges help when color alone is ambiguous
        edges = cv2.Canny(gray, 50, 150)
        # combine cues
        cand = cv2.bitwise_or(mask_brown, mask_dark)
        cand = cv2.bitwise_or(cand, edges)
        # focus on central area and lower half (trunk base more visible)
        mask_focus = np.zeros_like(cand)
        cx = w_px // 2
        fw = max(20, int(w_px * 0.6))
        x0 = max(0, cx - fw // 2)
        x1 = min(w_px, cx + fw // 2)
        y0 = int(h_px * 0.25)
        mask_focus[y0:h_px, x0:x1] = 255
        cand = cv2.bitwise_and(cand, mask_focus)

        # clean and fill candidate mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7,7))
        cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, kernel)
        cand = cv2.morphologyEx(cand, cv2.MORPH_OPEN, kernel)

        # find connected components and pick the component closest to image center
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats((cand>0).astype('uint8'), connectivity=8)
        trunk_width_px = None
        best_label = None
        best_dist = None
        for lab in range(1, num_labels):
            x, y, w_box, h_box, area = stats[lab]
            cx_lab, cy_lab = centroids[lab]
            # prefer components that are tall enough and near center x
            if h_box < max(10, int(h_px * 0.1)):
                continue
            dist = abs(cx_lab - (w_px/2))
            if best_label is None or dist < best_dist:
                best_label = lab
                best_dist = dist

        if best_label is not None:
            comp_mask = (labels == best_label).astype('uint8') * 255
            # fill holes
            comp_mask = cv2.morphologyEx(comp_mask, cv2.MORPH_CLOSE, kernel)
            # distance transform on foreground to get radius of largest inscribed circle
            dt = cv2.distanceTransform((comp_mask>0).astype('uint8'), cv2.DIST_L2, 5)
            max_r = np.max(dt)
            if max_r > 1.0:
                trunk_width_px = int(max_r * 2.0)

        # fallback simple method if still not found: use central edge projection median widths
        if trunk_width_px is None:
            strip_w = max(10, int(w_px * 0.25))
            cx = w_px // 2
            x0 = max(0, cx - strip_w // 2)
            x1 = min(w_px, cx + strip_w // 2)
            strip = edges[:, x0:x1]
            proj = np.sum(strip, axis=0)
            if proj.size > 0 and np.max(proj) > 0:
                peaks = np.where(proj > (0.1 * np.max(proj)))[0]
                if peaks.size > 0:
                    groups = np.split(peaks, np.where(np.diff(peaks) != 1)[0] + 1)
                    widths = [g.size for g in groups if g.size > 0]
                    if widths:
                        trunk_width_px = int(np.median(widths))

        # convert to meters if we have calibration or sensor-based height
        if trunk_width_px is not None and trunk_width_px > 0:
            if px_per_m and px_per_m > 0:
                diameter_m = round(trunk_width_px / float(px_per_m), 3)
            else:
                diameter_m = None
                if sensors and isinstance(sensors, dict):
                    vals = [v for v in (sensors.get('ultrasound_m'), sensors.get('laser_m')) if v is not None]
                    if vals:
                        avg_h = float(np.mean(vals))
                        if avg_h > 0:
                            px_per_m_est = float(h_px) / avg_h
                            diameter_m = round(trunk_width_px / px_per_m_est, 3)
                if diameter_m is None:
                    assumed_h_m = 5.0
                    px_per_m_est = float(h_px) / assumed_h_m if assumed_h_m > 0 else float(h_px) / 5.0
                    diameter_m = round(trunk_width_px / px_per_m_est, 3)
        else:
            # coarse fallback
            if px_per_m and px_per_m > 0:
                diameter_m = round(w_px / float(px_per_m), 3)
            else:
                diameter_m = round((w_px / max(1.0, (h_px/5.0))), 2)
    except Exception:
        # safe fallback
        if px_per_m and px_per_m > 0:
            diameter_m = round(w_px / float(px_per_m), 3)
        else:
            diameter_m = round((w_px / max(1.0, (h_px/5.0))), 2)

    return {'height_m': height_m, 'diameter_m': diameter_m}


def detect_fruits(image: Image.Image):
    # Prefer YOLO when available and the model provides names (custom fruit model best).
    if 'yolo_model' in globals() and yolo_model is not None:
        try:
            tmp = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            image.save(tmp.name)
            results = yolo_model(tmp.name, imgsz=640, conf=0.2, verbose=False)
            tmp.close()
            try:
                os.unlink(tmp.name)
            except Exception:
                pass

            detections = []
            if results and len(results) > 0:
                r = results[0]
                # try to map class names if model provides them
                model_names = getattr(yolo_model, 'names', {}) or getattr(r, 'names', {}) or {}
                if hasattr(r, 'boxes') and r.boxes is not None:
                    for box in r.boxes:
                        try:
                            class_id = int(box.cls[0]) if hasattr(box, 'cls') else None
                            conf = float(box.conf[0]) if hasattr(box, 'conf') else 0.0
                            xyxy = box.xyxy[0].tolist() if hasattr(box, 'xyxy') else []
                            name = model_names.get(class_id, str(class_id)) if class_id is not None else None
                        except Exception:
                            class_id, conf, xyxy, name = None, 0.0, [], None
                        detections.append({'name': name, 'class_id': class_id, 'confidence': conf, 'box': xyxy})

            # Strip class names for privacy/simplicity and return minimal estimate
            for d in detections:
                d.pop('name', None)
            min_count = len(detections)
            return {'presence': bool(min_count), 'min_count': min_count, 'detections': detections}
        except Exception:
            # any model error -> fall through to heuristic
            pass

    # Fallback: improved color + shape heuristics for specific fruits requested by user
    img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

    # Define color ranges (HSV) for fruits
    fruit_masks = {
        'Oranger/Orange': [np.array([5, 120, 120]), np.array([25, 255, 255])],      # orange/yellow
        'Citron/Citronnier/Lemon': [np.array([20,100,100]), np.array([35,255,255])],  # yellow
        'Citron vert/Lime': [np.array([35, 50, 50]), np.array([85, 255, 255])],       # green
        'Manguier/Mango': [np.array([10, 80, 80]), np.array([30, 255, 255])],         # yellow/orange
        'Goyavier/Guava': [np.array([25, 40, 40]), np.array([90, 255, 255])],         # green-ish
        'Pitaya/Dragonfruit': [np.array([140, 50, 50]), np.array([170, 255, 255])],   # magenta/pink (approx)
        'Dattier/Date': [np.array([0, 20, 20]), np.array([25, 200, 120])],            # brown-ish (loose)
        'Caféier/Coffee': [np.array([0, 70, 50]), np.array([10, 255, 255])],         # red cherries
    }

    detections = []
    min_area = max(50, (img.shape[0] * img.shape[1]) // 20000)  # adaptive min area

    for fname, (lower, upper) in fruit_masks.items():
        try:
            mask = cv2.inRange(hsv, lower, upper)
            # morphological clean
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

            # find contours
            cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in cnts:
                area = cv2.contourArea(c)
                if area < min_area:
                    continue
                perimeter = cv2.arcLength(c, True)
                if perimeter <= 0:
                    continue
                circularity = 4 * np.pi * area / (perimeter * perimeter)
                # allow elongated fruits too (mango) so relax circularity
                if circularity < 0.15 and fname.lower().find('mango')==-1:
                    continue

                x, y, w_box, h_box = cv2.boundingRect(c)
                conf = min(0.95, 0.5 + (area / (img.shape[0]*img.shape[1])))
                detections.append({
                    'name': fname,
                    'confidence': float(conf),
                    'box': [int(x), int(y), int(x+w_box), int(y+h_box)],
                    'area': int(area),
                    'circularity': float(circularity),
                    'size_px': int(max(w_box, h_box)),
                    'size_m': None
                })
        except Exception:
            continue

    # As additional heuristic, try Hough circles for round fruits (apple/coffee cherries etc.)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    circles = cv2.HoughCircles(gray, cv2.HOUGH_GRADIENT, dp=1.2, minDist=20,
                               param1=50, param2=30, minRadius=8, maxRadius=200)
    if circles is not None:
        circles = np.uint16(np.around(circles))
        for c in circles[0, :]:
            x, y, r = int(c[0]), int(c[1]), int(c[2])
            area = np.pi * (r**2)
            if area < min_area:
                continue
            detections.append({'name': 'round_fruit', 'confidence': 0.4, 'box': [x-r, y-r, x+r, y+r], 'area': int(area), 'size_px': int(2*r), 'size_m': None})

    # If calibration (px_per_m) is available in session, compute approximate sizes in meters
    try:
        px_per_m = st.session_state.get('px_per_m', None)
        if px_per_m and px_per_m > 0:
            for d in detections:
                try:
                    if d.get('size_px'):
                        d['size_m'] = round(d['size_px'] / px_per_m, 3)
                    elif d.get('area'):
                        diam_px = 2.0 * np.sqrt(d['area'] / np.pi)
                        d['size_px'] = int(diam_px)
                        d['size_m'] = round(diam_px / px_per_m, 3)
                except Exception:
                    d['size_m'] = None
    except Exception:
        pass

    # Final simplified output: presence flag and minimal count, remove detailed class names
    for d in detections:
        d.pop('name', None)
    min_count = len(detections)
    return {'presence': bool(min_count), 'min_count': min_count, 'detections': detections}


def detect_diseases(image: Image.Image):
    # If a TF disease model is available, use it first (preferred).
    if 'disease_model' in globals() and disease_model is not None:
        try:
            # model expects resized input similar to training script (300x300)
            img_r = image.resize((300, 300))
            arr = np.array(img_r).astype('float32') / 255.0
            arr = np.expand_dims(arr, axis=0)
            preds = disease_model.predict(arr)
            # Map predicted index to class name if possible
            class_idx = int(np.argmax(preds[0]))
            classes = ['healthy', 'bacterial', 'fungal']
            status = classes[class_idx] if class_idx < len(classes) else f'class_{class_idx}'
            return {'status': status, 'prob': float(np.max(preds[0]))}
        except Exception:
            pass
    # Heuristic fallback: improved multi-step lesion detection and severity scoring
    try:
        img_rgb = np.array(image)
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        h, w = img_bgr.shape[:2]

        # 1) Build a robust leaf mask: combine HSV range + Excess Green (ExG) index
        hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        lower_green = np.array([20, 30, 30])
        upper_green = np.array([100, 255, 255])
        mask_hsv = cv2.inRange(hsv, lower_green, upper_green)

        # Excess Green: 2*G - R - B (helps when HSV alone misses leaves)
        r = img_rgb[:, :, 0].astype('int32')
        g = img_rgb[:, :, 1].astype('int32')
        b = img_rgb[:, :, 2].astype('int32')
        exg = (2 * g - r - b).astype('int32')
        # Use an adaptive threshold based on image stats
        exg_thresh = max(10, int(np.percentile(exg, 70)))
        mask_exg = (exg > exg_thresh).astype('uint8') * 255

        leaf_mask = cv2.bitwise_or(mask_hsv, mask_exg)
        ksize = max(3, int(min(h, w) / 200))
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
        leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_OPEN, kernel)
        leaf_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_CLOSE, kernel)
        leaf_area = int(np.count_nonzero(leaf_mask))

        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB).astype('float32')

        total_lesion = 0
        lesion_areas = []

        # Process connected leaf components separately to avoid background influence
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats((leaf_mask > 0).astype('uint8'), connectivity=8)
        min_leaf_comp = max(200, (h * w) // 10000)
        for lab_id in range(1, num_labels):
            x, y, w_box, h_box, area = stats[lab_id]
            if area < min_leaf_comp:
                continue
            comp_mask = (labels == lab_id).astype('uint8') * 255

            # compute LAB mean for this component and per-pixel distance
            mean_lab = cv2.mean(lab, mask=comp_mask)[:3]
            mean_lab = np.array(mean_lab, dtype='float32')
            # extract dist only inside component
            comp_lab = lab.copy()
            diff = comp_lab - mean_lab.reshape((1, 1, 3))
            dist = np.sqrt(np.sum(diff * diff, axis=2))
            dist_comp = dist[comp_mask > 0]
            if dist_comp.size == 0:
                continue

            # adaptive threshold: mean + k * std, with a sensible minimum
            thresh = float(np.mean(dist_comp) + max(6.0, 0.8 * np.std(dist_comp)))
            thresh = max(thresh, 10.0)

            lesion_mask_comp = (dist > thresh).astype('uint8') * 255
            # keep only within component
            lesion_mask_comp = cv2.bitwise_and(lesion_mask_comp, comp_mask)

            # clean small noise
            k2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (max(3, ksize), max(3, ksize)))
            lesion_mask_comp = cv2.morphologyEx(lesion_mask_comp, cv2.MORPH_OPEN, k2)
            lesion_mask_comp = cv2.morphologyEx(lesion_mask_comp, cv2.MORPH_CLOSE, k2)

            # find contours for lesions in this component
            cnts, _ = cv2.findContours(lesion_mask_comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for c in cnts:
                a = cv2.contourArea(c)
                # require lesions to be a reasonable fraction of leaf comp area
                if a < max(20, area * 0.002):
                    continue
                lesion_areas.append(int(a))
                total_lesion += int(a)

        total_area = leaf_area if leaf_area > 0 else (h * w)
        severity = float(total_lesion) / float(total_area) if total_area > 0 else 0.0

        lesion_count = len(lesion_areas)

        # map severity to status with slightly stricter thresholds to reduce false positives
        if severity < 0.003:
            status = 'Healthy'
        elif severity < 0.02:
            status = 'Mild'
        elif severity < 0.06:
            status = 'Moderate'
        else:
            status = 'Severe'

        prob = float(min(0.99, severity * 5.0 + 0.02))

        return {
            'status': status,
            'severity': round(severity, 4),
            'lesion_count': int(lesion_count),
            'lesion_areas': lesion_areas,
            'leaf_area_px': int(leaf_area),
            'total_lesion_px': int(total_lesion),
            'prob': prob
        }
    except Exception:
        # final safe fallback (simpler color-ratio based)
        try:
            img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            lower_brown = np.array([10, 50, 20])
            upper_brown = np.array([30, 255, 200])
            mask = cv2.inRange(hsv, lower_brown, upper_brown)
            ratio = (np.count_nonzero(mask) / (mask.size))
            if ratio > 0.02:
                return {'status': 'Suspected', 'ratio': float(ratio)}
            return {'status': 'Healthy', 'ratio': float(ratio)}
        except Exception:
            return {'status': 'Unknown', 'ratio': 0.0}


def load_db(path=DB_PATH):
    if not os.path.exists(path):
        return pd.DataFrame(columns=['id','name','type','gps','height_m','diameter_m','fruits_count','disease','timestamp'])
    try:
        return pd.read_excel(path)
    except Exception:
        return pd.DataFrame(columns=['id','name','type','gps','height_m','diameter_m','fruits_count','disease','timestamp'])


def save_entry(entry: dict, path=DB_PATH):
    df = load_db(path)
    # ensure id uniqueness: overwrite if exists
    if entry['id'] in list(df['id']):
        df = df[df['id'] != entry['id']]
    df = pd.concat([df, pd.DataFrame([entry])], ignore_index=True)
    df.to_excel(path, index=False)
    return df


def get_db_bytes(df: pd.DataFrame):
    towrite = io.BytesIO()
    df.to_excel(towrite, index=False)
    towrite.seek(0)
    return towrite.read()


def save_capture(image: Image.Image, sensors: dict, tree_id: str = None, extra: dict = None,
                 captures_dir=CAPTURES_DIR, csv_path=CAPTURES_CSV):
    """Save PIL image to captures_dir with a timestamped filename and append a CSV row
    with sensors and optional metadata. Returns the saved filepath and the row dict.
    """
    os.makedirs(captures_dir, exist_ok=True)
    ts = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"capture_{ts}.jpg"
    filepath = os.path.join(captures_dir, filename)
    try:
        image.save(filepath, format='JPEG', quality=85)
    except Exception:
        # fallback: convert to RGB and try again
        image.convert('RGB').save(filepath, format='JPEG', quality=85)

    row = {
        'filename': filename,
        'filepath': filepath,
        'timestamp': datetime.datetime.now().isoformat(),
        'tree_id': tree_id or '',
        'ultrasound_m': sensors.get('ultrasound_m') if sensors else '',
        'laser_m': sensors.get('laser_m') if sensors else ''
    }
    if extra:
        for k, v in extra.items():
            row[k] = v

    # append to CSV (create if missing)
    try:
        if os.path.exists(csv_path):
            df_existing = pd.read_csv(csv_path)
            df = pd.concat([df_existing, pd.DataFrame([row])], ignore_index=True)
        else:
            df = pd.DataFrame([row])
        df.to_csv(csv_path, index=False)
    except Exception:
        # best-effort: write minimal CSV append
        try:
            import csv as _csv
            write_header = not os.path.exists(csv_path)
            with open(csv_path, 'a', newline='', encoding='utf-8') as f:
                writer = _csv.DictWriter(f, fieldnames=list(row.keys()))
                if write_header:
                    writer.writeheader()
                writer.writerow(row)
        except Exception:
            pass

    return filepath, row


# ----------------------- UI -----------------------

ensure_session()

st.title("ArborVision - Analyse d'arbres (Prototype)")

if st.session_state.step == "home":
    st.markdown("Choisissez le type d'analyse:")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("🆕 Nouvel Arbre", use_container_width=True):
            st.session_state.tree_type = 'new'
            st.session_state.step = 'ocr'
            safe_rerun()
    with col2:
        if st.button("📋 Arbre Existant", use_container_width=True):
            st.session_state.tree_type = 'existing'
            st.session_state.step = 'existing'
            safe_rerun()
    st.markdown("\n---\n")
    df_db = load_db()
    st.write(f"Entrées en base: {len(df_db)}")
    if st.button("Télécharger la base Excel"):
        st.download_button("Télécharger Excel", data=get_db_bytes(df_db), file_name=DB_PATH, mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

# ---------------- OCR PAGE ----------------
elif st.session_state.step == 'ocr':
    st.header("📝 Extraction de texte depuis les images")
    st.warning("Optimisé pour les plaques signalétiques d'arbres et les panneaux d'information")

    cam_img = st.camera_input("Prendre une photo (ou téléversez)")
    uploaded_file = st.file_uploader("Ou téléversez une image contenant du texte", type=["jpg", "png", "jpeg"])

    # prefer camera capture if provided, otherwise use uploaded file
    selected = None
    if cam_img is not None:
        selected = cam_img
    elif uploaded_file is not None:
        selected = uploaded_file

    if selected is not None:
        # Lecture de l'image avec prétraitement
        file_bytes = np.asarray(bytearray(selected.read()), dtype=np.uint8)
        image_np = cv2.imdecode(file_bytes, 1)

        # Prétraitement pour améliorer la détection OCR
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        _, thresholded = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        vis_image = cv2.cvtColor(thresholded, cv2.COLOR_GRAY2RGB)

        col1, col2 = st.columns(2)

        with col1:
            st.image(vis_image, caption="Image prétraitée", use_column_width=True)

        with col2:
            with st.spinner("Analyse OCR en cours..."):
                info = {
                    "Nom": "Non détecté",
                    "Arbre": "Non détecté",
                    "Géolocalisation": "Non détecté"
                }

                detected_texts = []
                results = []

                if _EASYOCR_AVAILABLE:
                    try:
                        reader_local = easyocr.Reader(['fr'], gpu=True)
                        results = reader_local.readtext(vis_image,
                                                        batch_size=4,
                                                        text_threshold=0.3,
                                                        low_text=0.3,
                                                        link_threshold=0.3,
                                                        decoder='beamsearch',
                                                        blocklist='')
                    except Exception:
                        results = []

                # if no easyocr results, try the helper fallback
                if not results:
                    parsed = perform_ocr_from_image(Image.fromarray(cv2.cvtColor(vis_image, cv2.COLOR_BGR2RGB)))
                    # map parsed fields into info
                    info["Nom"] = parsed.get('name') or info["Nom"]
                    info["Arbre"] = parsed.get('type') or info["Arbre"]
                    info["Géolocalisation"] = parsed.get('gps') or info["Géolocalisation"]

                else:
                    frutopy_detected = False
                    arbres_connus = {
                        "Oranger", "Olivier", "Chêne", "Palmier", "Eucalyptus",
                        "Pommier", "Cerisier", "Abricotier", "Poirier", "Citronnier"
                    }
                    gps_pattern = r'(\d{1,3}\.\d{4,}),\s*(\d{1,3}\.\d{4,})'

                    for i, item in enumerate(results):
                        try:
                            bbox, text, prob = item
                        except Exception:
                            continue

                        if prob < 0.2:
                            continue

                        text = text.strip()
                        detected_texts.append(text)

                        if "frutopy" in text.lower():
                            frutopy_detected = True
                            continue

                        if frutopy_detected and info["Nom"] == "Non détecté":
                            info["Nom"] = text
                            frutopy_detected = False
                            continue

                        for arbre in arbres_connus:
                            if arbre.lower() in text.lower():
                                info["Arbre"] = arbre
                                break

                        if re.search(gps_pattern, text):
                            info["Géolocalisation"] = text

                    if info["Nom"] == "Non détecté" and detected_texts:
                        info["Nom"] = detected_texts[0]

                # Affichage des résultats et dessin des boîtes si available
                st.success("Analyse terminée !")
                st.subheader("Informations extraites :")
                for key, value in info.items():
                    st.markdown(f"**{key}** : {value}")

                # Visualisation des zones de texte (draw on vis_image)
                img_show = vis_image.copy()
                for item in results:
                    try:
                        bbox, text, prob = item
                    except Exception:
                        continue
                    if prob < 0.2:
                        continue
                    (top_left, top_right, bottom_right, bottom_left) = bbox
                    top_left = tuple(map(int, top_left))
                    bottom_right = tuple(map(int, bottom_right))
                    cv2.rectangle(img_show, top_left, bottom_right, (0, 255, 0), 2)
                    cv2.putText(img_show, f"{text} ({prob:.2f})", top_left, cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                st.image(img_show, caption="Zones de texte détectées", use_column_width=True)

                # Map to internal session fields (name,type,gps)
                st.session_state.tree_info = {
                    'name': info.get('Nom') if info.get('Nom') != 'Non détecté' else None,
                    'type': info.get('Arbre') if info.get('Arbre') != 'Non détecté' else None,
                    'gps': info.get('Géolocalisation') if info.get('Géolocalisation') != 'Non détecté' else None
                }

                if st.button("✅ Valider et passer à l'analyse", use_container_width=True):
                    st.session_state.step = 'ocr_review'
                    safe_rerun()

elif st.session_state.step == 'ocr_review':
    st.header("Vérifier / Corriger les données extraites")
    info = st.session_state.get('tree_info', {})
    name = st.text_input("Nom de l'arbre", value=info.get('name',''))
    ttype = st.text_input('Type', value=info.get('type',''))
    gps = st.text_input('GPS', value=info.get('gps',''))
    if st.button('✅ Valider et passer à l\'analyse'):
        # create ID
        new_id = f"{ttype[:3].upper() if ttype else 'ARB'}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        st.session_state.tree_id = new_id
        st.session_state.tree_info = {'name': name, 'type': ttype, 'gps': gps}
    st.session_state.step = 'analysis'
    safe_rerun()

# ---------------- Existing tree selection ----------------
elif st.session_state.step == 'existing':
    st.header('Arbre existant')
    df_db = load_db()
    tree_id = st.text_input('Entrez l\'ID de l\'arbre')
    if st.button('Charger'):
        # Always accept the provided ID and continue to analysis.
        # If the ID exists in the DB, prefill info; otherwise start with empty info for this ID.
        st.session_state.tree_id = tree_id
        if 'id' in df_db.columns and tree_id in list(df_db['id']):
            row = df_db[df_db['id'] == tree_id].iloc[0]
            st.session_state.tree_info = {'name': row.get('name'), 'type': row.get('type'), 'gps': row.get('gps')}
        else:
            st.session_state.tree_info = {'name': None, 'type': None, 'gps': None}
        st.session_state.step = 'analysis'
        safe_rerun()

# ---------------- Analysis page ----------------
elif st.session_state.step == 'analysis':
    st.header('Analyse visuelle de l\'arbre')
    st.write('Capturez une photo de l\'arbre. Un cadre est simulé sur l\'aperçu.')

    # Pi camera inline preview with overlay (single-frame) - use if /dev/video0 is available
    st.markdown("**Aperçu direct Pi Camera :**")
    col_preview, col_camin = st.columns([1,1])
    pi_frame = None
    with col_preview:
        st.write("Aperçu (cliquez 'Refresh preview' pour capturer une image) :")
        if st.button('Refresh preview'):
            pi_frame = capture_pi_frame()
            if pi_frame is None:
                st.warning('Aucune image capturée depuis la caméra Pi')
            else:
                # draw guide on preview
                pv = pi_frame.copy()
                pw, ph = pv.size
                pdraw = ImageDraw.Draw(pv)
                pdraw.rectangle((int(pw*0.15), int(ph*0.05), int(pw*0.85), int(ph*0.95)), outline='red', width=5)
                st.image(pv, use_column_width=True)
        else:
            st.info('Appuyez sur Refresh preview pour capturer une image de la caméra Pi')

    # Provide camera_input or upload on the other column
    with col_camin:
        tree_img_file = st.camera_input('Prendre photo de l\'arbre pour analyse (mobile)')
        if tree_img_file is None:
            tree_img_file = st.file_uploader('Ou téléversez la photo de l\'arbre', type=['jpg','png','jpeg'])

    # If the user used Pi preview and clicked Use this photo, allow using that image
    if 'use_preview' not in st.session_state:
        st.session_state.use_preview = False

    # show Use this preview button if a pi_frame exists in this run
    if pi_frame is not None:
        if st.button('Utiliser cette photo depuis la preview'):
            # convert to bytes-like so it behaves like uploaded file
            buf = _io.BytesIO()
            pi_frame.save(buf, format='JPEG')
            buf.seek(0)
            tree_img_file = buf
            st.session_state.use_preview = True

    if tree_img_file is not None:
        # tree_img_file may be a stream/buffer or UploadFile; handle both
        if isinstance(tree_img_file, bytes) or hasattr(tree_img_file, 'read'):
            try:
                tree_image = Image.open(tree_img_file).convert('RGB')
            except Exception:
                # stream-like object from camera_input
                tree_image = Image.open(_io.BytesIO(tree_img_file.read())).convert('RGB')
        else:
            tree_image = Image.open(tree_img_file).convert('RGB')

        # draw overlay rectangle on the captured image for verification
        overlay = tree_image.copy()
        draw = ImageDraw.Draw(overlay)
        w, h = overlay.size

        # load or initialize simulated frame (fractions) in session
        if 'sim_frame' not in st.session_state:
            st.session_state['sim_frame'] = {'l': 0.15, 't': 0.05, 'r': 0.85, 'b': 0.95}
        sim = st.session_state['sim_frame']
        # convert fractions to pixel rect
        rect = (int(w * sim['l']), int(h * sim['t']), int(w * sim['r']), int(h * sim['b']))
        draw.rectangle(rect, outline='red', width=5)
        st.image(overlay, caption='Cadre de capture (simulé)')

        # allow editing the simulated frame
        if 'edit_sim_frame' not in st.session_state:
            st.session_state['edit_sim_frame'] = False

        if st.button('✏️ Modifier le cadre de capture'):
            st.session_state['edit_sim_frame'] = True

        if st.session_state.get('edit_sim_frame'):
            st.markdown('**Édition du cadre — dessinez ou ajustez, puis validez**')
            # try canvas editor first
            sim_canvas = None
            if _CANVAS_AVAILABLE:
                try:
                    sim_canvas = st_canvas(
                        fill_color="",
                        stroke_width=3,
                        stroke_color="yellow",
                        background_image=locals().get('overlay', None),
                        height=locals().get('h', None),
                        width=locals().get('w', None),
                        drawing_mode="rect",
                        key="sim_frame_canvas"
                    )
                except AttributeError:
                    sim_canvas = None

            if sim_canvas and sim_canvas.json_data:
                objs = sim_canvas.json_data.get('objects', [])
                if objs:
                    obj = objs[0]
                    left = obj.get('left', 0)
                    top = obj.get('top', 0)
                    width_obj = obj.get('width', 0)
                    height_obj = obj.get('height', 0)
                    # store as fractions
                    st.session_state['sim_frame'] = {
                        'l': max(0.0, min(1.0, float(left) / float(w))),
                        't': max(0.0, min(1.0, float(top) / float(h))),
                        'r': max(0.0, min(1.0, float(left + width_obj) / float(w))),
                        'b': max(0.0, min(1.0, float(top + height_obj) / float(h)))
                    }
                    st.success('Cadre mis à jour depuis le canvas.')
                    st.session_state['edit_sim_frame'] = False
            else:
                # fallback to manual pixel inputs if canvas unavailable or failed
                st.info('Canvas non disponible ou incompatible — entrez manuellement les extrémités du cadre (pixels)')
                col1, col2 = st.columns(2)
                with col1:
                    left_px = st.number_input('X gauche (px)', min_value=0, max_value=w-1, value=int(sim['l'] * w))
                    top_px = st.number_input('Y haut (px)', min_value=0, max_value=h-1, value=int(sim['t'] * h))
                with col2:
                    right_px = st.number_input('X droite (px)', min_value=0, max_value=w-1, value=int(sim['r'] * w))
                    bottom_px = st.number_input('Y bas (px)', min_value=0, max_value=h-1, value=int(sim['b'] * h))

                if st.button('Valider le cadre'):
                    # normalize and store as fractions
                    l = min(left_px, right_px) / float(w)
                    r = max(left_px, right_px) / float(w)
                    t = min(top_px, bottom_px) / float(h)
                    b = max(top_px, bottom_px) / float(h)
                    st.session_state['sim_frame'] = {'l': max(0.0, min(1.0, l)), 't': max(0.0, min(1.0, t)), 'r': max(0.0, min(1.0, r)), 'b': max(0.0, min(1.0, b))}
                    st.session_state['edit_sim_frame'] = False
                    st.success('Cadre mis à jour.')

    # Calibration UI removed as requested by user.

        # Use full image as selection for measuring extremities (camera edges)
        sel_rect = (0, 0, w, h)
        x1, y1, x2, y2 = sel_rect
        px_height = abs(y2 - y1)
        st.write(f"Hauteur en pixels sélectionnée: {px_height}")

        # Read sensors (real only). If sensors are unavailable or return None values,
        # estimate_dimensions will automatically fall back to a pixel-only heuristic.
        sensors = simulate_sensors()

        # Compute dimensions using the unified helper which prefers calibration,
        # then real sensors, and finally a pixel-only heuristic when sensors missing.
        dims = estimate_dimensions(tree_image, sensors)
        est_height_m = dims.get('height_m')
        est_diameter_m = dims.get('diameter_m')
        st.write(f"Hauteur estimée: {est_height_m} m")
        if est_diameter_m is not None:
            st.write(f"Diamètre estimé: {est_diameter_m} m")

        # display raw sensor values if present; otherwise inform user that
        # pixel-only estimation was used.
        if sensors:
            u = sensors.get('ultrasound_m')
            l = sensors.get('laser_m')
            if u is None or l is None:
                st.write("Capteurs indisponibles ou lecture partielle — estimation par pixels utilisée")
                st.write(f"Capteurs — Ultrason: {u} m  |  Laser: {l} m")
            else:
                st.write(f"Capteurs — Ultrason: {u} m  |  Laser: {l} m")
        else:
            st.write("Capteurs non disponibles — estimation par pixels utilisée")

        # store analysis basic info
        st.session_state.latest_analysis = st.session_state.get('latest_analysis', {})
        st.session_state.latest_analysis['sensors'] = sensors
        st.session_state.latest_analysis['dimensions'] = {'height_m': est_height_m, 'height_px': px_height, 'diameter_m': est_diameter_m}

        if st.button('🔬 Lancer l\'analyse complète', use_container_width=True):
            # run full pipeline: ROI crop, detections, save capture, store in session and go to review
            try:
                roi = tree_image.crop((x1, y1, x2, y2))
            except Exception:
                roi = tree_image

            sensors_run = simulate_sensors()
            dims_run = estimate_dimensions(tree_image, sensors_run)
            fruits_run = detect_fruits(roi)
            disease_run = detect_diseases(roi)

            analysis_row = {
                'sensors': sensors_run,
                'dimensions': dims_run,
                'fruits': fruits_run,
                'disease': disease_run,
                'roi': {'x1': int(x1), 'y1': int(y1), 'x2': int(x2), 'y2': int(y2)}
            }

            # save capture and sensors to CSV including ROI and calibration meta
            try:
                extra = {
                    'roi_x1': int(x1), 'roi_y1': int(y1), 'roi_x2': int(x2), 'roi_y2': int(y2),
                    'px_per_m': float(st.session_state.get('px_per_m')) if st.session_state.get('px_per_m') else ''
                }
                save_path, saved_row = save_capture(tree_image, sensors_run, tree_id=st.session_state.get('tree_id'), extra=extra)
                analysis_row['capture_path'] = save_path
                analysis_row['capture_row'] = saved_row
            except Exception:
                pass

            st.session_state.latest_analysis = analysis_row
            st.session_state.step = 'review'
            safe_rerun()

# ---------------- Review & Save ----------------
elif st.session_state.step == 'review':
    st.header('Résultats de l\'analyse')
    info = st.session_state.get('tree_info', {})
    st.markdown(f"**ID**: {st.session_state.tree_id}")
    st.markdown(f"**Nom**: {info.get('name','-')}")
    st.markdown(f"**Type**: {info.get('type','-')}")
    st.markdown(f"**GPS**: {info.get('gps','-')}")

    analysis = st.session_state.get('latest_analysis', {})
    st.subheader('Dimensions')
    dims = analysis.get('dimensions', {})
    st.write(dims)
    st.subheader('Fruits détectés')
    fruits_info = analysis.get('fruits', {})
    st.write({'presence': fruits_info.get('presence', False), 'min_count': fruits_info.get('min_count', 0)})
    st.subheader('État maladies')
    st.write(analysis.get('disease', {}))

    if st.button('💾 Sauvegarder dans Excel'):
        entry = {
            'id': st.session_state.tree_id,
            'name': info.get('name',''),
            'type': info.get('type',''),
            'gps': info.get('gps',''),
            'height_m': dims.get('height_m'),
            'diameter_m': dims.get('diameter_m'),
            'fruits_count': analysis.get('fruits', {}).get('min_count', 0),
            'disease': analysis.get('disease', {}).get('status'),
            'timestamp': datetime.datetime.now().isoformat()
        }
        df = save_entry(entry)
        st.success('✅ Enregistré')
        st.download_button('Télécharger Excel', data=get_db_bytes(df), file_name=DB_PATH, mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    if st.button('🔙 Nouvelle analyse'):
        st.session_state.step = 'home'
        safe_rerun()

# ---------------- Fallback ----------------
else:
    st.session_state.step = 'home'
    safe_rerun()
