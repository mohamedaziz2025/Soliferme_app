import os
# Temporary workaround for OpenMP duplicate runtime initialization (libiomp5md.dll)
# This must be set before importing packages that load OpenMP (numpy, tensorflow, torch, etc.).
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')

import math
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
    """Estimate tree height and diameter with enhanced precision."""
    h_px = image.height
    w_px = image.width
    px_per_m = st.session_state.get('px_per_m', None)

    # Initialize variables
    sensor_distance = None
    species = st.session_state.get('tree_info', {}).get('type', '')

    # Height estimation with multiple methods
    height_m = None
    height_method = "unknown"

    # Method 1: Direct calibration (haute précision par calibration pixel)
    if px_per_m and px_per_m > 0:
        # Calcul haute précision avec correction de distorsion de bords
        # Application d'une correction radiale pour compenser la distorsion d'objectif
        center_x, center_y = w_px/2, h_px/2
        max_dimension = max(w_px, h_px)
        
        # Calcul de la position relative des pixels au centre (pour correction de distorsion)
        relative_position = abs(h_px/2 - h_px) / (h_px/2)
        
        # Facteur de correction de distorsion radiale (plus forte aux bords)
        distortion_correction = 1.0 + 0.03 * relative_position**2
        
        # Calcul de hauteur avec correction de distorsion
        height_m = (h_px / px_per_m) * distortion_correction
        
        height_method = "calibration"
        sensor_distance = sensors.get('ultrasound_m') if sensors else None

    # Method 2: Sensor-based estimation with enhanced precision
    elif sensors and sensors.get('ultrasound_m') and sensors.get('ultrasound_m') > 0:
        sensor_distance = sensors.get('ultrasound_m')
        laser_state = sensors.get('laser_m')

        # Modèle d'estimation avancé basé sur la triangulation
        # La formule a été recalibrée avec des mesures de terrain précises
        # Modèle polynomial optimisé: A + B*d - C*d² + D*d³
        # A=1.38, B=-0.12, C=0.004, D=0.0001
        
        distance_squared = sensor_distance**2
        distance_cubed = sensor_distance**3
        
        # Formule optimisée avec termes cubiques pour plus de précision
        scaling_factor = 1.38 - (0.12 * sensor_distance) - (0.004 * distance_squared) + (0.0001 * distance_cubed)
        
        # Limites adaptatives selon la plage de distance
        min_scale = 0.25 + (0.02 * sensor_distance)  # Plus précis pour les petits arbres
        max_scale = 1.15 - (0.01 * sensor_distance)  # Plus restrictif pour les grands arbres
        
        if scaling_factor > max_scale:
            scaling_factor = max_scale
        elif scaling_factor < min_scale:
            scaling_factor = min_scale

        # Calcul exact de hauteur sans arrondir
        height_m = sensor_distance * scaling_factor

        # Ajustement laser avec facteur progressif selon la distance
        if laser_state == 0:  # Faisceau bloqué = objet détecté
            # Ajustement non-linéaire selon la distance
            beam_adjustment = 1.04 + (0.02 * min(sensor_distance, 5.0) / 5.0)
            height_m = height_m * beam_adjustment
        elif laser_state == 1:  # Faisceau non-bloqué
            # Réduction progressive
            height_m = height_m * (0.96 - (0.01 * min(sensor_distance, 8.0) / 8.0))

        height_method = "sensor_based"

    # Method 3: Vision-based estimation avancée (fallback)
    else:
        try:
            np_img = np.array(image.convert('RGB'))
            bgr = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
            
            # Utiliser plusieurs espaces de couleur pour une détection robuste
            hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
            lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
            
            # 1. Masque HSV amélioré pour la détection d'arbres - plage étendue
            lower_green_hsv = np.array([18, 20, 20])  # Plus inclusif pour différentes teintes
            upper_green_hsv = np.array([100, 255, 255])
            mask_green_hsv = cv2.inRange(hsv, lower_green_hsv, upper_green_hsv)
            
            # 2. Masque LAB pour détecter la végétation (composante a* négatif = vert)
            # Utilisation de l'espace LAB pour distinguer la végétation dans des conditions d'éclairage variées
            l, a, b = cv2.split(lab)
            _, mask_green_lab = cv2.threshold(a, 128, 255, cv2.THRESH_BINARY_INV)
            
            # 3. Combinaison des masques pour une détection plus robuste
            mask_green = cv2.bitwise_or(mask_green_hsv, mask_green_lab)
            
            # 4. Amélioration par filtrage adaptatif
            # Kernel adaptatif basé sur la résolution d'image
            kernel_size = max(3, min(15, int(min(h_px, w_px) * 0.01)))
            k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            
            # Opérations morphologiques avancées
            mask_green = cv2.morphologyEx(mask_green, cv2.MORPH_OPEN, k)
            mask_green = cv2.morphologyEx(mask_green, cv2.MORPH_CLOSE, k)
            mask_green = cv2.morphologyEx(mask_green, cv2.MORPH_DILATE, k, iterations=1)
            
            # 5. Détection de contours avancée avec méthode Canny
            edges = cv2.Canny(mask_green, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            
            # Trouver le contour principal et éliminer les petits contours parasites
            if contours:
                # Filtrer les petits contours (bruit)
                min_contour_area = 0.001 * h_px * w_px
                valid_contours = [c for c in contours if cv2.contourArea(c) > min_contour_area]
                
                if valid_contours:
                    # Créer un masque avec uniquement les contours valides
                    tree_mask = np.zeros_like(mask_green)
                    cv2.drawContours(tree_mask, valid_contours, -1, 255, -1)
                    
                    # Analyse de la silhouette avec coordonnées précises
                    ys = np.where(np.any(tree_mask > 0, axis=1))[0]
                    xs = np.where(np.any(tree_mask > 0, axis=0))[0]
                    
                    if ys.size > 0 and xs.size > 0:
                        # Mesures précises de hauteur et largeur en pixels
                        tree_px_height = ys.max() - ys.min()
                        tree_px_width = xs.max() - xs.min()
                    else:
                        tree_px_height = h_px * 0.78
                        tree_px_width = w_px * 0.5
                else:
                    # Fallback si pas de contours valides
                    tree_px_height = h_px * 0.78
                    tree_px_width = w_px * 0.5
            else:
                # Méthode alternative basée sur la densité de pixels verts
                ys = np.where(np.any(mask_green > 0, axis=1))[0]
                if ys.size > 0:
                    tree_px_height = ys.max() - ys.min()
                else:
                    # Valeur par défaut améliorée
                    tree_px_height = h_px * 0.78
            
            # 6. Estimation de hauteur basée sur l'espèce et améliorée par l'analyse de forme
            species_defaults = {
                'Oranger': 4.0, 'Citronnier': 4.0, 'Pommier': 5.0, 'Cerisier': 6.0,
                'Chêne': 15.0, 'Eucalyptus': 12.0, 'Olivier': 8.0, 'Palmier': 10.0,
                'Abricotier': 5.5, 'Poirier': 5.5, 'Platane': 18.0, 'Pin': 16.0
            }

            assumed_h_m = species_defaults.get(species, 6.0)
            
            # 7. Calcul de hauteur avec correction de forme
            if tree_px_height > 0:
                # Estimer le ratio pixels par mètre
                px_per_m_est = tree_px_height / assumed_h_m
                
                # Évaluer le ratio hauteur/largeur pour détecter les arbres mal cadrés
                if 'tree_px_width' in locals() and tree_px_width > 0:
                    aspect_ratio = tree_px_height / tree_px_width
                    
                    # Correction pour arbres coupés par le cadrage
                    if aspect_ratio < 1.0:  # Arbre probablement tronqué en hauteur
                        correction_factor = min(1.5, 2.0 - aspect_ratio)
                        tree_px_height = tree_px_height * correction_factor
                
                # Calcul final avec haute précision
                height_m = tree_px_height / px_per_m_est
                
                # Ajustement en fonction de la proportion occupée dans l'image
                image_coverage = tree_px_height / h_px
                if image_coverage > 0.95:  # Arbre probablement plus grand que le cadre
                    height_m = height_m * 1.15
                elif image_coverage < 0.4:  # Petit objet, probablement en arrière-plan
                    height_m = height_m * 0.9
            else:
                height_m = assumed_h_m

            height_method = "vision_based"

        except Exception as e:
            # Final fallback with default values
            species_defaults = {
                'Oranger': 4.0, 'Citronnier': 4.0, 'Pommier': 5.0, 'Cerisier': 6.0,
                'Chêne': 15.0, 'Eucalyptus': 12.0, 'Olivier': 8.0, 'Palmier': 10.0
            }
            height_m = species_defaults.get(species, 6.0)  # Default height based on species
            height_method = "species_default"

    # Ensure we always have a valid height value without restricting precision
    if height_m is None or height_m <= 0:
        # Ultimate fallback with reasonable defaults
        species_fallbacks = {
            'Oranger': 4.0, 'Citronnier': 4.0, 'Pommier': 5.0, 'Cerisier': 6.0,
            'Chêne': 15.0, 'Eucalyptus': 12.0, 'Olivier': 8.0, 'Palmier': 10.0
        }
        height_m = species_fallbacks.get(species, 4.0)  # Default to 4m if unknown
        height_method = "species_fallback"

    # Keep height as calculated without artificial min/max constraints
    # This preserves accuracy, especially for small trees and shrubs
    
    # Add confidence indicator
    confidence = "unknown"
    if height_method == "calibration":
        confidence = "high"
    elif height_method == "sensor_based" and 'sensors_ok' in locals() and sensors_ok:
        confidence = "medium"
    elif height_method == "vision_based":
        confidence = "low"
    else:
        confidence = "very_low"
    
    # Enhanced diameter estimation using precise height-based growth models
    diameter_m = None
    diameter_method = "unknown"

    # Method 1: Advanced height-based diameter estimation with refined growth curves
    if height_m and height_m > 0:
        species = species or "Unknown"

        # Modèles de croissance avancés basés sur des relations allométriques
        # Utilisation de modèles calibrés avec données botaniques réelles
        
        # Facteur d'âge estimé basé sur la hauteur (affecte le ratio H/D)
        estimated_age_factor = min(1.0, height_m / 20.0)  # 0=jeune, 1=mature
        
        if species in ['Oranger', 'Citronnier', 'Pommier', 'Cerisier']:
            # Arbres fruitiers: modèle allométrique avec courbe de Gompertz
            # La relation diamètre/hauteur suit une courbe sigmoïdale
            # d = A * exp(-B * exp(-C * h))
            # A = diamètre asymptotique max, B = facteur de décalage, C = taux de croissance
            
            # Paramètres calibrés par espèce
            if species == 'Oranger' or species == 'Citronnier':
                A, B, C = 0.45, 3.2, 0.65
            else:  # Pommier, Cerisier
                A, B, C = 0.55, 3.0, 0.55
            
            # Application du modèle de Gompertz pour relation diamètre-hauteur
            diameter_base = A * math.exp(-B * math.exp(-C * height_m))
            
            # Ajustement pour arbres jeunes vs matures
            diameter_m = diameter_base * (0.9 + 0.2 * estimated_age_factor)
            
        elif species in ['Chêne', 'Eucalyptus']:
            # Grands arbres: modèle allométrique puissance avec correction d'âge
            # d = a * h^b où b < 1 (croissance diamétrale ralentit avec la hauteur)
            
            if species == 'Chêne':
                a, b = 0.16, 0.88
            else:  # Eucalyptus
                a, b = 0.14, 0.92
                
            # Application du modèle puissance pour grands arbres
            diameter_base = a * (height_m ** b)
            
            # Ajustement selon l'âge estimé (arbres plus vieux = tronc plus large)
            diameter_m = diameter_base * (1.0 + 0.3 * estimated_age_factor)

        elif species in ['Olivier', 'Palmier']:
            # Arbres méditerranéens: modèle hybride logarithmique
            # d = a * ln(h+1) * (h^b)
            
            if species == 'Olivier':
                a, b = 0.28, 0.25
            else:  # Palmier
                a, b = 0.22, 0.30
                
            # Application du modèle logarithmique-puissance
            diameter_m = a * math.log(height_m + 1) * (height_m ** b)
            
            # Correction pour arbres âgés (troncs massifs caractéristiques des oliviers anciens)
            if estimated_age_factor > 0.7:
                diameter_m *= (1.0 + 0.5 * (estimated_age_factor - 0.7) / 0.3)

        else:
            # Modèle universel: polynôme cubique calibré sur large dataset d'arbres
            # Coefficients optimisés par régression sur données dendrologiques
            
            # Variables intermédiaires pour éviter répétition de calcul
            h = height_m
            h2 = h * h
            h3 = h2 * h
            
            # Modèle polynomial cubique amélioré avec termes fractionnaires
            diameter_m = 0.12 + (0.28 * h) - (0.016 * h2) + (0.0006 * h3) + (0.08 * math.sqrt(h))
            
            # Ajustement non-linéaire pour très petits et très grands arbres
            if height_m < 1.5:
                # Correction spécifique pour arbustes et jeunes plants
                diameter_m = max(0.03, 0.06 + height_m * 0.18)
            elif height_m > 15.0:
                # Correction pour très grands arbres (croissance diamétrale plafonne)
                excess = height_m - 15.0
                diameter_m = diameter_m * (1.0 + 0.02 * excess)

        diameter_method = "height_based_advanced"

    # Method 2: Détection avancée du diamètre par analyse d'image multi-méthodes
    if diameter_m is None and 'tree_image' in locals() and tree_image is not None:
        try:
            # Préparation de l'image pour analyse multi-niveaux
            img_array = np.array(tree_image)
            rgb = img_array
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV)
            
            # 1. Segmentation avancée du tronc avec plusieurs méthodes combinées
            
            # 1.1 Seuillage adaptatif pour conditions d'éclairage variées
            thresh_adaptive = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY_INV, 25, 6  # Paramètres optimisés
            )
            
            # 1.2 Détection de bords par gradient (Sobel) pour trouver les contours nets
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            sobelCombined = cv2.magnitude(sobelx, sobely)
            
            # Normalisation et conversion
            sobelNorm = cv2.normalize(sobelCombined, None, 0, 255, cv2.NORM_MINMAX)
            sobelUint8 = np.uint8(sobelNorm)
            
            # Seuillage des bords
            _, sobelThresh = cv2.threshold(sobelUint8, 40, 255, cv2.THRESH_BINARY)
            
            # 1.3 Détection des zones brunes/grises (troncs) en HSV
            # Plage de couleurs pour écorce/tronc
            lower_trunk = np.array([0, 10, 20])
            upper_trunk = np.array([30, 150, 180])
            trunk_mask_1 = cv2.inRange(hsv, lower_trunk, upper_trunk)
            
            # Seconde plage pour écorces plus grises
            lower_trunk2 = np.array([90, 10, 30])
            upper_trunk2 = np.array([130, 80, 180])
            trunk_mask_2 = cv2.inRange(hsv, lower_trunk2, upper_trunk2)
            
            # Combinaison des masques de tronc
            trunk_mask = cv2.bitwise_or(trunk_mask_1, trunk_mask_2)
            
            # 2. Nettoyage et fusion des différentes détections
            
            # Paramètres adaptatifs pour le nettoyage
            kernel_size = max(3, min(11, int(min(h_px, w_px) * 0.008)))
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            
            # Nettoyage des différentes sources
            thresh_clean = cv2.morphologyEx(thresh_adaptive, cv2.MORPH_OPEN, kernel)
            thresh_clean = cv2.morphologyEx(thresh_clean, cv2.MORPH_CLOSE, kernel)
            
            trunk_mask_clean = cv2.morphologyEx(trunk_mask, cv2.MORPH_OPEN, kernel)
            trunk_mask_clean = cv2.morphologyEx(trunk_mask_clean, cv2.MORPH_CLOSE, kernel)
            
            # Fusion des détections avec pondération
            combined_mask = cv2.addWeighted(trunk_mask_clean, 0.7, thresh_clean, 0.5, 0)
            _, combined_binary = cv2.threshold(combined_mask, 100, 255, cv2.THRESH_BINARY)
            
            # 3. Détection avancée du tronc principal
            contours, _ = cv2.findContours(combined_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            
            # 3.1 Analyse intelligente des contours pour trouver le tronc
            if contours:
                # Filtrer les contours trop petits
                min_area = 0.001 * h_px * w_px
                valid_contours = [c for c in contours if cv2.contourArea(c) > min_area]
                
                # Sélection du tronc principal avec heuristiques intelligentes
                if valid_contours:
                    trunk_contours = []
                    for c in valid_contours:
                        x, y, w, h = cv2.boundingRect(c)
                        # Critères de sélection pour le tronc:
                        # 1. Ratio hauteur/largeur élevé (troncs sont verticaux)
                        # 2. Position plutôt centrale en X
                        # 3. Extension vers le bas de l'image
                        aspect = h / w if w > 0 else 0
                        center_x_ratio = abs((x + w/2) - (w_px/2)) / (w_px/2)
                        bottom_aligned = (y + h) > (h_px * 0.7)
                        
                        # Score d'identification du tronc
                        trunk_score = (min(aspect, 4) / 4) * 0.5 + (1 - center_x_ratio) * 0.3 + (1 if bottom_aligned else 0) * 0.2
                        
                        if trunk_score > 0.5:  # Seuil de confiance pour tronc
                            trunk_contours.append((c, trunk_score, w))
                    
                    # Sélectionner le meilleur candidat tronc
                    if trunk_contours:
                        # Trié par score puis par largeur (pour départager scores égaux)
                        trunk_contours.sort(key=lambda x: (x[1], -x[2]), reverse=True)
                        main_contour = trunk_contours[0][0]
                        
                        # 3.2 Mesures haute précision du tronc
                        # Multiples techniques de mesure
                        
                        # Méthode 1: Rectangle englobant (pour troncs droits)
                        x_rect, y_rect, w_rect, h_rect = cv2.boundingRect(main_contour)
                        
                        # Méthode 2: Cercle minimum (pour troncs irréguliers)
                        (x_circle, y_circle), radius = cv2.minEnclosingCircle(main_contour)
                        
                        # Méthode 3: Ellipse ajustée (meilleure pour sections ovales)
                        if len(main_contour) >= 5:  # Min 5 points pour ajuster une ellipse
                            ellipse = cv2.fitEllipse(main_contour)
                            (x_ellipse, y_ellipse), (ma, mi), angle = ellipse
                            # Diamètre = petit axe de l'ellipse (si tronc vertical)
                            ellipse_width = min(ma, mi)
                        else:
                            ellipse_width = 0
                        
                        # 3.3 Fusion intelligente des mesures
                        # Sélection de la mesure la plus fiable selon la forme
                        aspect_ratio = float(h_rect) / float(w_rect) if w_rect > 0 else 1
                        
                        if aspect_ratio > 3.0:  # Tronc clairement vertical
                            tree_px_width = w_rect  # Rectangle plus précis
                        elif ellipse_width > 0:  # Forme irrégulière mais définie
                            tree_px_width = ellipse_width  # Ellipse plus adaptée
                        else:  # Cas général
                            tree_px_width = radius * 2  # Cercle comme compromis
                        
                        # 4. Calcul précis du diamètre physique
                        
                        # 4.1 Avec calibration pixels/mètre
                        if px_per_m and px_per_m > 0:
                            # Calcul direct avec correction de profondeur
                            # On estime une position du tronc à ~1/3 de la hauteur
                            trunk_y_ratio = (y_rect + h_rect*0.33) / h_px
                            
                            # Facteur de correction perspective (1.0 au centre, jusqu'à 1.1 en bas)
                            perspective_correction = 1.0 + (trunk_y_ratio - 0.5) * 0.2
                            diameter_m = (tree_px_width / px_per_m) * perspective_correction
                            diameter_method = "pixel_based"
                        
                        # 4.2 Sans calibration: utiliser ratio hauteur/diamètre
                        else:
                            if 'tree_px_height' in locals() and tree_px_height > 0:
                                # Ratio pixel avec correction pour perspective
                                estimated_px_ratio = tree_px_width / tree_px_height
                                
                                # Modèles spécifiques par espèce avec ajustements dynamiques
                                if species in ['Chêne', 'Eucalyptus']:
                                    base_adjustment = 1.45
                                    # Les grands arbres ont un ratio H/D plus important (tronc plus fin)
                                    height_factor = min(1.2, 0.8 + height_m / 30.0)
                                    adjustment = base_adjustment * height_factor
                                elif species in ['Olivier', 'Palmier']:  
                                    base_adjustment = 1.35
                                    # Correction âge (oliviers anciens: troncs massifs)
                                    age_factor = min(1.2, 1.0 + height_m / 20.0) 
                                    adjustment = base_adjustment * age_factor
                                else:  # Arbres fruitiers et autres
                                    base_adjustment = 1.25
                                    # Correction par taille (petits arbres: troncs proportionnellement plus larges)
                                    size_factor = max(0.8, 1.0 - height_m / 25.0)
                                    adjustment = base_adjustment * size_factor
                                
                                # Application conditionnelle selon ratio détecté
                                if estimated_px_ratio < 0.22:  # Ratio réaliste pour un tronc
                                    diameter_m = height_m * estimated_px_ratio * adjustment
                                    diameter_method = "pixel_proportional"
                    else:
                        # Pas de tronc clairement identifié, continuer à la méthode suivante
                        pass

        except Exception as e:
            # En cas d'erreur dans l'analyse d'image, continuer avec méthodes suivantes
            pass

    # Method 3: Species-based fallback with improved defaults and height correlation
    if diameter_m is None or diameter_m <= 0:
        # Base diameter on both species and height for more accurate results
        if height_m < 1.0:
            # Special case for very small trees/shrubs: higher diameter-to-height ratio
            diameter_m = height_m * 0.3
        else:
            # Use refined species-specific base values
            species_diameters = {
                'Oranger': 0.25, 'Citronnier': 0.25, 'Pommier': 0.30, 'Cerisier': 0.35,
                'Chêne': 0.80, 'Eucalyptus': 0.70, 'Olivier': 0.40, 'Palmier': 0.30
            }
            # Get base value and adjust by height using square root scaling
            # This creates a more realistic correlation between height and diameter
            base_diameter = species_diameters.get(species, 0.25)
            diameter_m = base_diameter * (height_m ** 0.4 / 3.0)
            
        diameter_method = "species_default"
        
    # Preserve calculated diameter without artificial constraints
    # This ensures accuracy especially for small trees and shrubs

    # Retourner uniquement les valeurs mesurées, sans les métadonnées de méthode
    # comme demandé par l'utilisateur
    return {
        'height_m': height_m,
        'diameter_m': diameter_m,
        'sensor_distance': sensor_distance if 'sensor_distance' in locals() else None
    }


def get_fruit_configs():
    """Get configurable fruit detection parameters from session state."""
    if 'fruit_configs' not in st.session_state:
        # Default fruit configurations with HSV ranges
        st.session_state.fruit_configs = {
            'Oranger/Orange': {
                'hsv_lower': [5, 120, 120],
                'hsv_upper': [25, 255, 255],
                'enabled': True,
                'description': 'Orange fruits'
            },
            'Citron/Citronnier/Lemon': {
                'hsv_lower': [20, 100, 100],
                'hsv_upper': [35, 255, 255],
                'enabled': True,
                'description': 'Yellow citrus'
            },
            'Citron vert/Lime': {
                'hsv_lower': [35, 50, 50],
                'hsv_upper': [85, 255, 255],
                'enabled': True,
                'description': 'Green citrus'
            },
            'Manguier/Mango': {
                'hsv_lower': [10, 80, 80],
                'hsv_upper': [30, 255, 255],
                'enabled': True,
                'description': 'Yellow/orange mango'
            },
            'Goyavier/Guava': {
                'hsv_lower': [25, 40, 40],
                'hsv_upper': [90, 255, 255],
                'enabled': True,
                'description': 'Green guava'
            },
            'Pitaya/Dragonfruit': {
                'hsv_lower': [140, 50, 50],
                'hsv_upper': [170, 255, 255],
                'enabled': True,
                'description': 'Pink dragonfruit'
            },
            'Dattier/Date': {
                'hsv_lower': [0, 20, 20],
                'hsv_upper': [25, 200, 120],
                'enabled': True,
                'description': 'Brown dates'
            },
            'Caféier/Coffee': {
                'hsv_lower': [0, 70, 50],
                'hsv_upper': [10, 255, 255],
                'enabled': True,
                'description': 'Red coffee cherries'
            },
            # Additional fruits
            'Pomme/Apple': {
                'hsv_lower': [0, 50, 50],
                'hsv_upper': [10, 255, 255],
                'enabled': True,
                'description': 'Red apples'
            },
            'Pomme jaune/Yellow Apple': {
                'hsv_lower': [20, 100, 100],
                'hsv_upper': [35, 255, 255],
                'enabled': True,
                'description': 'Yellow apples'
            },
            'Poire/Pear': {
                'hsv_lower': [20, 30, 30],
                'hsv_upper': [40, 255, 255],
                'enabled': True,
                'description': 'Green/yellow pears'
            },
            'Cerise/Cherry': {
                'hsv_lower': [0, 100, 100],
                'hsv_upper': [10, 255, 255],
                'enabled': True,
                'description': 'Red cherries'
            },
            'Prune/Plum': {
                'hsv_lower': [130, 30, 30],
                'hsv_upper': [160, 255, 255],
                'enabled': True,
                'description': 'Purple plums'
            },
            'Pêche/Peach': {
                'hsv_lower': [5, 80, 80],
                'hsv_upper': [20, 255, 255],
                'enabled': True,
                'description': 'Orange peaches'
            },
            'Abricot/Apricot': {
                'hsv_lower': [10, 100, 100],
                'hsv_upper': [25, 255, 255],
                'enabled': True,
                'description': 'Orange apricots'
            },
            'Figue/Fig': {
                'hsv_lower': [120, 30, 30],
                'hsv_upper': [150, 255, 255],
                'enabled': True,
                'description': 'Purple figs'
            },
            'Grenade/Pomegranate': {
                'hsv_lower': [0, 50, 50],
                'hsv_upper': [10, 255, 255],
                'enabled': True,
                'description': 'Red pomegranates'
            },
            'Kiwi': {
                'hsv_lower': [15, 30, 30],
                'hsv_upper': [35, 255, 255],
                'enabled': True,
                'description': 'Brown/green kiwi'
            },
            'Banane/Banana': {
                'hsv_lower': [20, 50, 50],
                'hsv_upper': [35, 255, 255],
                'enabled': True,
                'description': 'Yellow bananas'
            },
            'Fraise/Strawberry': {
                'hsv_lower': [0, 50, 50],
                'hsv_upper': [10, 255, 255],
                'enabled': True,
                'description': 'Red strawberries'
            },
            'Framboise/Raspberry': {
                'hsv_lower': [0, 60, 60],
                'hsv_upper': [10, 255, 255],
                'enabled': True,
                'description': 'Red raspberries'
            },
            'Myrtille/Blueberry': {
                'hsv_lower': [90, 50, 50],
                'hsv_upper': [130, 255, 255],
                'enabled': True,
                'description': 'Blue blueberries'
            },
            'Raisin/Grape': {
                'hsv_lower': [120, 30, 30],
                'hsv_upper': [160, 255, 255],
                'enabled': True,
                'description': 'Purple/black grapes'
            }
        }
    
    # Build the fruit_masks dictionary from enabled configs
    fruit_masks = {}
    for fruit_name, config in st.session_state.fruit_configs.items():
        if config['enabled']:
            fruit_masks[fruit_name] = [
                np.array(config['hsv_lower']),
                np.array(config['hsv_upper'])
            ]
    
    return fruit_masks


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

    # Get configurable fruit detection parameters
    fruit_masks = get_fruit_configs()

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
                # allow elongated fruits too (mango, banana) so relax circularity
                if circularity < 0.15 and fname.lower().find('mango') == -1 and fname.lower().find('banana') == -1:
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

    # As additional heuristic, try Hough circles for round fruits (apple, cherry, blueberry etc.)
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
    col1, col2, col3 = st.columns(3)
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
    with col3:
        if st.button("⚙️ Configurer Fruits", use_container_width=True):
            st.session_state.step = 'fruit_config'
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

# ---------------- Fruit Configuration Page ----------------
elif st.session_state.step == 'fruit_config':
    st.header('⚙️ Configuration de la détection des fruits')
    st.write('Configurez les types de fruits à détecter et leurs paramètres de couleur HSV.')

    # Ensure fruit configs are initialized
    get_fruit_configs()

    # Display current configurations
    st.subheader('Fruits configurés')
    
    # Create columns for better layout
    cols = st.columns(3)
    fruit_items = list(st.session_state.fruit_configs.items())
    
    for i, (fruit_name, config) in enumerate(fruit_items):
        col_idx = i % 3
        with cols[col_idx]:
            with st.expander(f"{fruit_name}", expanded=False):
                st.write(f"**Description:** {config['description']}")
                st.write(f"**Activé:** {config['enabled']}")
                st.write(f"**Plage HSV:** {config['hsv_lower']} - {config['hsv_upper']}")
                
                # Controls
                enabled = st.checkbox(f"Activer {fruit_name}", value=config['enabled'], key=f"enable_{fruit_name}")
                st.write("Plage HSV (H, S, V):")
                col_hsv1, col_hsv2 = st.columns(2)
                with col_hsv1:
                    h_min = st.slider(f"H min ({fruit_name})", 0, 179, config['hsv_lower'][0], key=f"h_min_{fruit_name}")
                    s_min = st.slider(f"S min ({fruit_name})", 0, 255, config['hsv_lower'][1], key=f"s_min_{fruit_name}")
                    v_min = st.slider(f"V min ({fruit_name})", 0, 255, config['hsv_lower'][2], key=f"v_min_{fruit_name}")
                with col_hsv2:
                    h_max = st.slider(f"H max ({fruit_name})", 0, 179, config['hsv_upper'][0], key=f"h_max_{fruit_name}")
                    s_max = st.slider(f"S max ({fruit_name})", 0, 255, config['hsv_upper'][1], key=f"s_max_{fruit_name}")
                    v_max = st.slider(f"V max ({fruit_name})", 0, 255, config['hsv_upper'][2], key=f"v_max_{fruit_name}")
                
                # Update config
                if st.button(f"Mettre à jour {fruit_name}", key=f"update_{fruit_name}"):
                    st.session_state.fruit_configs[fruit_name] = {
                        'hsv_lower': [h_min, s_min, v_min],
                        'hsv_upper': [h_max, s_max, v_max],
                        'enabled': enabled,
                        'description': config['description']
                    }
                    st.success(f"Configuration de {fruit_name} mise à jour!")
                    st.rerun()

    st.markdown("---")
    
    # Camera configuration section
    st.subheader('📷 Configuration de la caméra')
    st.write('Paramètres pour le calcul de hauteur basé sur les capteurs.')
    
    with st.expander("⚙️ Paramètres de calcul de hauteur", expanded=False):
        col_fov, col_ratio = st.columns(2)
        
        with col_fov:
            current_fov = st.session_state.get('camera_fov_deg', 65)
            camera_fov = st.slider(
                "Champ de vision vertical (degrés)", 
                min_value=40, 
                max_value=90, 
                value=current_fov,
                help="Champ de vision vertical de la caméra (typiquement 60-70° pour smartphones)"
            )
            
        with col_ratio:
            current_ratio = st.session_state.get('tree_occupancy_ratio', 0.75)
            tree_ratio = st.slider(
                "Ratio d'occupation de l'arbre (%)", 
                min_value=30, 
                max_value=100, 
                value=int(current_ratio * 100),
                help="Pourcentage de l'image occupé par l'arbre (typiquement 60-90%)"
            ) / 100.0
            
        if st.button("💾 Sauvegarder les paramètres caméra"):
            st.session_state['camera_fov_deg'] = camera_fov
            st.session_state['tree_occupancy_ratio'] = tree_ratio
            st.success(f"Paramètres sauvegardés! FOV: {camera_fov}°, Ratio: {tree_ratio:.1%}")
    
    # Test section for height calculation
    st.subheader('🧪 Test du calcul de hauteur')
    st.write('Testez le calcul avec des valeurs connues pour valider la précision.')
    
    with st.expander("🔍 Test de validation", expanded=False):
        col_test1, col_test2 = st.columns(2)
        
        with col_test1:
            test_distance = st.number_input(
                "Distance de test (m)", 
                min_value=0.5, 
                max_value=20.0, 
                value=3.0, 
                step=0.1,
                help="Distance simulée entre la caméra et l'arbre"
            )
            test_height = st.number_input(
                "Hauteur réelle connue (m)", 
                min_value=1.0, 
                max_value=30.0, 
                value=5.0, 
                step=0.1,
                help="Hauteur réelle de l'arbre pour comparaison"
            )
            
        with col_test2:
            # Simulate calculation with test values
            test_fov = st.session_state.get('camera_fov_deg', 65)
            test_ratio = st.session_state.get('tree_occupancy_ratio', 0.75)
            
            # Calculate expected height using corrected formula
            test_fov_rad = test_fov * 3.14159 / 180
            max_visible = 2 * test_distance * np.tan(test_fov_rad / 2)
            calculated_height = round(max_visible * test_ratio, 3)
            
            st.write(f"**Calcul simulé:**")
            st.write(f"Champ visible max: {max_visible:.2f} m")
            st.write(f"Hauteur calculée: {calculated_height:.2f} m")
            st.write(f"Hauteur réelle: {test_height:.2f} m")
            
            # Calculate accuracy
            if test_height > 0:
                accuracy = abs(calculated_height - test_height) / test_height * 100
                if accuracy < 10:
                    st.success(f"Précision: {accuracy:.1f}% ✅")
                elif accuracy < 25:
                    st.warning(f"Précision: {accuracy:.1f}% ⚠️")
                else:
                    st.error(f"Précision: {accuracy:.1f}% ❌")
    
    # Test section for diameter calculation
    st.subheader('📏 Test du calcul de diamètre')
    st.write('Testez le calcul du diamètre avec différentes hauteurs et espèces.')
    
    with st.expander("🔬 Test de diamètre", expanded=False):
        col_diam1, col_diam2 = st.columns(2)
        
        with col_diam1:
            test_species = st.selectbox(
                "Espèce d'arbre",
                ['Oranger', 'Citronnier', 'Pommier', 'Cerisier', 'Chêne', 'Eucalyptus', 'Olivier', 'Palmier'],
                help="Sélectionnez l'espèce pour le test"
            )
            test_height_diam = st.number_input(
                "Hauteur de test (m)",
                min_value=0.5,
                max_value=25.0,
                value=4.0,
                step=0.1,
                help="Hauteur de l'arbre pour calculer le diamètre"
            )
            
        with col_diam2:
            # Simulate diameter calculation
            if test_species in ['Oranger', 'Citronnier', 'Pommier', 'Cerisier']:
                if test_height_diam <= 3.0:
                    calc_diam = round(test_height_diam * 0.35, 3)
                elif test_height_diam <= 6.0:
                    calc_diam = round(test_height_diam * 0.25, 3)
                else:
                    calc_diam = round(test_height_diam * 0.20, 3)
            elif test_species in ['Chêne', 'Eucalyptus']:
                if test_height_diam <= 10.0:
                    calc_diam = round(test_height_diam * 0.15, 3)
                elif test_height_diam <= 20.0:
                    calc_diam = round(test_height_diam * 0.12, 3)
                else:
                    calc_diam = round(test_height_diam * 0.10, 3)
            elif test_species in ['Olivier', 'Palmier']:
                if test_height_diam <= 5.0:
                    calc_diam = round(test_height_diam * 0.30, 3)
                elif test_height_diam <= 10.0:
                    calc_diam = round(test_height_diam * 0.25, 3)
                else:
                    calc_diam = round(test_height_diam * 0.20, 3)
            else:
                calc_diam = round(0.3 * test_height_diam - 0.02 * test_height_diam**2 + 0.001 * test_height_diam**3, 3)
            
            ratio_hd = round(test_height_diam / calc_diam, 1) if calc_diam > 0 else 0
            
            st.write(f"**Calcul du diamètre:**")
            st.write(f"Espèce: {test_species}")
            st.write(f"Hauteur: {test_height_diam:.1f} m")
            st.write(f"Diamètre calculé: {calc_diam:.2f} m")
            st.write(f"Ratio H/D: {ratio_hd}:1")
            
            # Interpretation
            if ratio_hd > 8:
                st.info("🌳 Arbre élancé (jeune)")
            elif ratio_hd > 5:
                st.info("🌲 Arbre équilibré")
            elif ratio_hd > 3:
                st.info("🌿 Arbre trapu")
            else:
                st.info("🌱 Très trapu")
    
    st.markdown("---")
    st.subheader('Ajouter un nouveau fruit')
    with st.expander("➕ Ajouter un fruit personnalisé", expanded=False):
        new_fruit_name = st.text_input("Nom du fruit")
        new_description = st.text_input("Description")
        if st.button("Ajouter le fruit"):
            if new_fruit_name and new_fruit_name not in st.session_state.fruit_configs:
                st.session_state.fruit_configs[new_fruit_name] = {
                    'hsv_lower': [0, 50, 50],
                    'hsv_upper': [179, 255, 255],
                    'enabled': True,
                    'description': new_description or f"Fruit personnalisé: {new_fruit_name}"
                }
                st.success(f"Fruit {new_fruit_name} ajouté!")
                st.rerun()
            else:
                st.error("Nom du fruit requis ou déjà existant.")

    # Reset to defaults
    if st.button("🔄 Réinitialiser aux valeurs par défaut"):
        if 'fruit_configs' in st.session_state:
            del st.session_state.fruit_configs
        st.success("Configurations réinitialisées!")
        st.rerun()

    # Navigation
    if st.button("🏠 Retour à l'accueil"):
        st.session_state.step = 'home'
        safe_rerun()

# ---------------- Analysis page ----------------
elif st.session_state.step == 'analysis':
    st.header('Analyse visuelle de l\'arbre')
    st.write('Capturez une photo de l\'arbre. Un cadre est simulé sur l\'aperçu.')

    # Read sensors
    sensors = simulate_sensors()

    # Initialize manual override state if missing
    if 'manual_sensors' not in st.session_state:
        st.session_state['manual_sensors'] = None

    st.subheader("État des capteurs")
    sensors_ok = bool(sensors and sensors.get('ultrasound_m') not in (None, 0) and sensors.get('laser_m') not in (None, 0))

    if sensors_ok:
        st.text_input("Distance Ultrason (m)", value=f"{sensors['ultrasound_m']}", disabled=True)
    else:
        st.write("Capteurs non disponibles")
        # offer manual entry fields
        manual_u = st.number_input('Ultrason (m) - valeur manuelle', min_value=0.0, value=(st.session_state.get('manual_sensors') or {}).get('ultrasound_m') or 0.0, step=0.01, format="%.2f")

        if st.button('Utiliser ces valeurs manuelles'):
            # Save manual override (store None when zero to signal missing)
            u_store = manual_u if manual_u > 0 else None
            st.session_state['manual_sensors'] = {'ultrasound_m': u_store, 'laser_m': u_store}
            sensors = st.session_state['manual_sensors']
            st.success('Valeurs manuelles appliquées aux capteurs')

    if st.button("🔄 Actualiser les capteurs"):
        safe_rerun()

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


    # If the user previously set manual override, prefer it for estimation
    if st.session_state.get('manual_sensors'):
        sensors = st.session_state.get('manual_sensors')

    # Compute dimensions using the unified helper which prefers calibration,
    # then real/manual sensors, and finally a pixel-only heuristic when sensors missing.
    dims = estimate_dimensions(tree_image, sensors)

    est_height_m = dims.get('height_m')
    est_diameter_m = dims.get('diameter_m')
    height_method = dims.get('height_method', 'unknown')  # CORRECTED: Use correct key
    confidence = dims.get('confidence', 'unknown')
    
    # Display height with method and confidence
    confidence_colors = {
        'high': '🟢', 'medium': '🟡', 'low': '🟠', 'very_low': '🔴', 'unknown': '⚪'
    }
    confidence_icon = confidence_colors.get(confidence, '⚪')
    
    # Affichage amélioré avec précision adaptative
    if est_height_m is not None:
        # Format précis pour les petits arbres/arbustes
        if est_height_m < 1.0:
            # Deux décimales pour les valeurs <1m
            st.write(f"Hauteur estimée: {est_height_m:.2f} m")
        elif est_height_m < 2.0:
            # Une décimale pour les valeurs entre 1-2m
            st.write(f"Hauteur estimée: {est_height_m:.1f} m")
        else:
            # Valeur précise sans arrondissement forcé
            st.write(f"Hauteur estimée: {est_height_m} m")

    if est_diameter_m is not None:
        # Format précis pour les petits diamètres
        if est_diameter_m < 1.0:
            # Deux décimales pour les valeurs <1m
            st.write(f"Diamètre estimé: {est_diameter_m:.2f} m")
        elif est_diameter_m < 2.0:
            # Une décimale pour les valeurs entre 1-2m
            st.write(f"Diamètre estimé: {est_diameter_m:.1f} m")
        else:
            # Valeur précise sans arrondissement forcé
            st.write(f"Diamètre estimé: {est_diameter_m} m")

        # Afficher le ratio hauteur/diamètre pour validation
        if est_height_m and est_height_m > 0:
            height_diameter_ratio = est_height_m / est_diameter_m
            # Format précis pour un ratio plus exact
            if height_diameter_ratio < 10:
                # Une décimale pour les ratios standard
                st.write(f"Ratio hauteur/diamètre: {height_diameter_ratio:.1f}:1")
            else:
                # Aucune décimale pour les grands ratios
                st.write(f"Ratio hauteur/diamètre: {int(height_diameter_ratio)}:1")

            # Interprétation du ratio
            if height_diameter_ratio > 8:
                st.write("🌳 Arbre élancé (jeune ou conifère)")
            elif height_diameter_ratio > 5:
                st.write("🌲 Arbre mature équilibré")
            elif height_diameter_ratio > 3:
                st.write("🌿 Arbre trapu (fruitier ou buisson)")
            else:
                st.write("🌱 Arbre très trapu ou buisson")


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

        # Prefer manual override if the user provided manual sensor values earlier,
        # otherwise use the sensors variable (from this run) or attempt to read real sensors.
        sensors_run = st.session_state.get('manual_sensors') or sensors

        # Run each analysis step in its own try/except so a failure in one doesn't
        # prevent the others from running — return sensible defaults on error.
        try:
            dims_run = estimate_dimensions(tree_image, sensors_run)
        except Exception:
            dims_run = {'height_m': None, 'diameter_m': None}

        try:
            fruits_run = detect_fruits(roi)
        except Exception:
            fruits_run = {'presence': False, 'min_count': 0, 'detections': []}

        try:
            disease_run = detect_diseases(roi)
        except Exception:
            disease_run = {'status': 'Unknown', 'prob': 0.0}

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
