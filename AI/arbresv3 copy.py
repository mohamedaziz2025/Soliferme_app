#!/usr/bin/env python3
"""
Script d'estimation de hauteur d'arbre à partir d'une seule photo
Version améliorée avec plusieurs approches de segmentation
"""

import cv2
import numpy as np
import torch
import torchvision
from torchvision import transforms
from PIL import Image
import exifread
import warnings
import os
import tkinter as tk
from tkinter import filedialog, messagebox
import glob
warnings.filterwarnings('ignore')

def select_image_file():
    """Interface pour sélectionner un fichier image"""
    root = tk.Tk()
    root.withdraw()  # Cacher la fenêtre principale
    
    # Dossiers suggérés
    suggested_dirs = [
        "C:/Users/pc/Downloads",
        "C:/Users/pc/Desktop", 
        "C:/Users/pc/Pictures",
        "C:/Users/pc/Downloads/test_arbre",
        os.path.expanduser("~/Downloads"),
        os.path.expanduser("~/Desktop"),
        os.path.expanduser("~/Pictures")
    ]
    
    initial_dir = None
    for dir_path in suggested_dirs:
        if os.path.exists(dir_path):
            initial_dir = dir_path
            break
    
    if initial_dir is None:
        initial_dir = os.getcwd()
    
    print(f"Ouverture du sélecteur de fichier (dossier initial: {initial_dir})")
    
    file_path = filedialog.askopenfilename(
        title="Sélectionner une image d'arbre",
        initialdir=initial_dir,
        filetypes=[
            ("Images", "*.jpg *.jpeg *.png *.bmp *.tiff *.tif"),
            ("JPEG", "*.jpg *.jpeg"),
            ("PNG", "*.png"),
            ("Tous les fichiers", "*.*")
        ]
    )
    
    root.destroy()
    
    if not file_path:
        print("Aucun fichier sélectionné. Arrêt du programme.")
        return None
        
    if not os.path.exists(file_path):
        print(f"Erreur: Le fichier {file_path} n'existe pas.")
        return None
        
    print(f"Image sélectionnée: {file_path}")
    return file_path

def get_image_path():
    """Obtenir le chemin de l'image à analyser"""
    # Option 1: Sélection manuelle via interface graphique
    print("Sélection de l'image à analyser...")
    print("1. Interface graphique de sélection")
    print("2. Saisie manuelle du chemin")
    print("3. Recherche automatique dans Downloads/test_arbre/")
    
    choice = input("Votre choix (1/2/3) [1]: ").strip() or "1"
    
    if choice == "1":
        return select_image_file()
    
    elif choice == "2":
        while True:
            img_path = input("Entrez le chemin complet de l'image: ").strip()
            if os.path.exists(img_path):
                return img_path
            else:
                print(f"Erreur: Le fichier {img_path} n'existe pas.")
                retry = input("Réessayer? (o/n) [o]: ").strip().lower()
                if retry in ['n', 'non', 'no']:
                    return None
    
    elif choice == "3":
        # Recherche automatique
        search_dirs = [
            "C:/Users/pc/Downloads/test_arbre/",
            "C:/Users/pc/Downloads/",
            "./captures/",
            "./"
        ]
        
        for search_dir in search_dirs:
            if os.path.exists(search_dir):
                images = glob.glob(os.path.join(search_dir, "*.jpg")) + \
                        glob.glob(os.path.join(search_dir, "*.jpeg")) + \
                        glob.glob(os.path.join(search_dir, "*.png"))
                
                if images:
                    print(f"Images trouvées dans {search_dir}:")
                    for i, img in enumerate(images[:10]):  # Limite à 10
                        print(f"  {i+1}. {os.path.basename(img)}")
                    
                    try:
                        idx = int(input("Sélectionnez le numéro (1-{}): ".format(len(images[:10])))) - 1
                        if 0 <= idx < len(images[:10]):
                            return images[idx]
                    except ValueError:
                        pass
        
        print("Aucune image trouvée automatiquement.")
        return None
    
    return None

def load_image(img_path):
    """Charger et préparer l'image"""
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError(f"Impossible de charger l'image: {img_path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    height, width = img.shape[:2]
    print(f"Image chargée: {width}x{height}")
    return img, img_rgb, height, width

def segment_tree_multi_approach(img_rgb, device):
    """Segmentation simplifiée et plus efficace"""
    print("🌳 Démarrage détection d'arbre...")
    
    # Approche 1: Segmentation couleur optimisée (plus fiable pour les arbres)
    print("1️⃣ Détection par couleur...")
    tree_mask = create_vegetation_mask_by_color(img_rgb)
    if tree_mask is not None and np.sum(tree_mask) > 2000:
        print("✅ Arbre détecté par couleur !")
        return tree_mask
    
    # Approche 2: Détection par forme et contours
    print("2️⃣ Détection par forme...")
    tree_mask = create_fallback_mask(img_rgb)
    if tree_mask is not None and np.sum(tree_mask) > 2000:
        print("✅ Arbre détecté par forme !")
        return tree_mask
    
    # Approche 3: Mask R-CNN (seulement si les autres échouent)
    print("3️⃣ Tentative Mask R-CNN...")
    try:
        tree_mask = try_maskrcnn_segmentation(img_rgb, device)
        if tree_mask is not None and np.sum(tree_mask) > 1000:
            print("✅ Arbre détecté par Mask R-CNN !")
            return tree_mask
    except Exception as e:
        print(f"Mask R-CNN échoué: {e}")
    
    # Approche 4: Segmentation interactive en dernier recours
    print("4️⃣ Segmentation interactive...")
    try:
        tree_mask = interactive_grabcut_segmentation(img_rgb)
        if tree_mask is not None and np.sum(tree_mask) > 1000:
            print("✅ Arbre détecté interactivement !")
            return tree_mask
    except Exception as e:
        print(f"Segmentation interactive échouée: {e}")
    
    # Si tout échoue, créer un masque central par défaut
    print("⚠️ Utilisation d'un masque par défaut (centre de l'image)")
    height, width = img_rgb.shape[:2]
    mask_default = np.zeros((height, width), dtype=bool)
    
    # Créer un rectangle au centre de l'image
    center_x, center_y = width // 2, height // 2
    rect_width = width // 3
    rect_height = int(height * 0.7)  # 70% de la hauteur
    
    x1 = max(0, center_x - rect_width // 2)
    x2 = min(width, center_x + rect_width // 2)
    y1 = max(0, center_y - rect_height // 2)
    y2 = min(height, center_y + rect_height // 2)
    
    mask_default[y1:y2, x1:x2] = True
    
    print(f"Masque par défaut créé: {rect_width}x{rect_height} pixels")
    return mask_default

def interactive_grabcut_segmentation(img_rgb):
    """Segmentation GrabCut semi-automatique"""
    try:
        # Convertir en BGR pour OpenCV
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        height, width = img_bgr.shape[:2]
        
        # Créer un rectangle initial au centre (supposant que l'arbre est au centre)
        margin_x = width // 4
        margin_y = height // 6
        rect = (margin_x, margin_y, width - 2*margin_x, height - 2*margin_y)
        
        # Initialiser les masques
        mask = np.zeros((height, width), np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        # Appliquer GrabCut
        cv2.grabCut(img_bgr, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        
        # Extraire le premier plan
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        
        return mask2.astype(bool)
        
    except Exception as e:
        print(f"Erreur GrabCut: {e}")
        return None

def try_maskrcnn_segmentation(img_rgb, device):
    """Essayer la segmentation avec Mask R-CNN"""
    try:
        maskrcnn = torchvision.models.detection.maskrcnn_resnet50_fpn(pretrained=True).to(device)
        maskrcnn.eval()
        
        transform = transforms.Compose([transforms.ToTensor()])
        input_tensor = transform(img_rgb).to(device)
        
        with torch.no_grad():
            outputs = maskrcnn([input_tensor])
        
        masks = outputs[0]['masks']
        labels = outputs[0]['labels']
        scores = outputs[0]['scores']
        
        print("Détections Mask R-CNN:")
        for i, (score, label) in enumerate(zip(scores, labels)):
            if score > 0.2:
                print(f"  Classe {label.item()}: {score.item():.3f}")
        
        # Chercher des classes liées à la végétation ou prendre la plus grande
        VEGETATION_CLASSES = [64]  # potted plant
        best_mask = None
        best_score = 0
        
        # D'abord chercher végétation spécifique
        for mask, label, score in zip(masks, labels, scores):
            if label.item() in VEGETATION_CLASSES and score.item() > 0.3:
                if score.item() > best_score:
                    best_mask = mask.squeeze().cpu().numpy() > 0.5
                    best_score = score.item()
                    print(f"Végétation détectée: classe {label.item()}, score {score.item():.3f}")
        
        # Si pas de végétation, prendre la plus grande détection valide
        if best_mask is None:
            largest_area = 0
            for mask, label, score in zip(masks, labels, scores):
                if score.item() > 0.3:
                    mask_binary = mask.squeeze().cpu().numpy() > 0.5
                    area = np.sum(mask_binary)
                    if area > largest_area:
                        largest_area = area
                        best_mask = mask_binary
                        print(f"Plus grande détection: classe {label.item()}, aire {area}")
        
        return best_mask
        
    except Exception as e:
        print(f"Erreur Mask R-CNN: {e}")
        return None

def try_semantic_segmentation(img_rgb, device):
    """Essayer la segmentation sémantique avec DeepLabV3"""
    try:
        model = torchvision.models.segmentation.deeplabv3_resnet101(pretrained=True).to(device)
        model.eval()
        
        preprocess = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((520, 520)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        input_tensor = preprocess(img_rgb).unsqueeze(0).to(device)
        
        with torch.no_grad():
            output = model(input_tensor)['out'][0]
        
        output_predictions = output.argmax(0).cpu().numpy()
        
        # Redimensionner
        height, width = img_rgb.shape[:2]
        
        # Essayer plusieurs classes de végétation PASCAL VOC
        vegetation_classes = [15]  # plant
        combined_mask = np.zeros((height, width), dtype=bool)
        
        for class_id in vegetation_classes:
            class_mask = cv2.resize((output_predictions == class_id).astype(np.uint8), (width, height))
            combined_mask |= class_mask.astype(bool)
        
        return combined_mask if np.sum(combined_mask) > 0 else None
        
    except Exception as e:
        print(f"Erreur segmentation sémantique: {e}")
        return None

def create_vegetation_mask_by_color(img_rgb):
    """Créer un masque de végétation basé sur la couleur - VERSION SIMPLIFIÉE ET EFFICACE"""
    try:
        # Convertir en HSV pour une meilleure détection de couleur
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        
        # Définir les plages de vert plus larges et efficaces
        # Vert clair à foncé (couvre la plupart des feuillages)
        lower_green = np.array([25, 30, 30])   # H, S, V minimums
        upper_green = np.array([95, 255, 255]) # H, S, V maximums
        
        # Créer le masque principal
        mask_green = cv2.inRange(hsv, lower_green, upper_green)
        
        # Ajouter une détection pour les tons bruns/marrons (tronc)
        lower_brown = np.array([8, 50, 20])
        upper_brown = np.array([25, 255, 200])
        mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)
        
        # Combiner vert et brun
        mask_combined = cv2.bitwise_or(mask_green, mask_brown)
        
        # Nettoyage morphologique simple mais efficace
        kernel = np.ones((5, 5), np.uint8)
        
        # Fermer les trous
        mask_combined = cv2.morphologyEx(mask_combined, cv2.MORPH_CLOSE, kernel)
        
        # Enlever le bruit
        mask_combined = cv2.morphologyEx(mask_combined, cv2.MORPH_OPEN, kernel)
        
        # Garder seulement la plus grande composante (l'arbre principal)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(mask_combined)
        
        if num_labels > 1:
            # Trouver la plus grande composante (exclure le background=0)
            largest_component = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
            mask_combined = (labels == largest_component).astype(np.uint8) * 255
        
        # Vérifier que le masque a une forme verticale (caractéristique d'un arbre)
        if np.sum(mask_combined) > 1000:  # Assez de pixels
            y_coords, x_coords = np.where(mask_combined > 0)
            if len(y_coords) > 0:
                height_span = y_coords.max() - y_coords.min()
                width_span = x_coords.max() - x_coords.min()
                
                if height_span > width_span * 0.8:  # Plus haut que large
                    print(f"✓ Arbre détecté par couleur - Taille: {height_span}x{width_span} pixels")
                    return mask_combined.astype(bool)
        
        return None
        
    except Exception as e:
        print(f"Erreur segmentation couleur: {e}")
        return None

def create_fallback_mask(img_rgb):
    """Masque de secours basé sur les contours et la forme"""
    try:
        # Convertir en niveaux de gris
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        
        # Détecter les contours
        edges = cv2.Canny(gray, 50, 150)
        
        # Dilater les contours pour créer des régions
        kernel = np.ones((3, 3), np.uint8)
        edges_dilated = cv2.dilate(edges, kernel, iterations=2)
        
        # Remplir les régions fermées
        contours, _ = cv2.findContours(edges_dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        mask = np.zeros(gray.shape, dtype=np.uint8)
        
        # Chercher des contours qui ressemblent à des arbres (grands et verticaux)
        height, width = img_rgb.shape[:2]
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > height * width * 0.02:  # Au moins 2% de l'image
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = h / w if w > 0 else 0
                
                # Vérifier si c'est vertical et assez grand
                if aspect_ratio > 1.0 and h > height * 0.3:
                    cv2.fillPoly(mask, [contour], 255)
                    print(f"✓ Forme d'arbre détectée - Ratio H/L: {aspect_ratio:.2f}")
        
        return mask.astype(bool) if np.sum(mask) > 1000 else None
        
    except Exception as e:
        print(f"Erreur masque de secours: {e}")
        return None

def try_yolo_detection(img_rgb):
    """Tentative de détection avec YOLO v8 (si disponible)"""
    try:
        # Vérifier si ultralytics est disponible
        import ultralytics
        from ultralytics import YOLO
        
        # Charger un modèle YOLO pré-entraîné
        model = YOLO('yolov8n.pt')  # ou yolov8m.pt si disponible dans le dossier
        
        # Détection
        results = model(img_rgb, verbose=False)
        
        # Extraire les masques si c'est une version de segmentation
        if hasattr(results[0], 'masks') and results[0].masks is not None:
            masks = results[0].masks.data
            boxes = results[0].boxes
            
            # Chercher les classes liées aux plantes/arbres
            # COCO: 0=person peut parfois être confondu, mais on évite
            for i, box in enumerate(boxes):
                conf = box.conf.item()
                cls = int(box.cls.item())
                
                if conf > 0.3:  # Seuil plus permissif
                    mask = masks[i].cpu().numpy()
                    mask_resized = cv2.resize(mask, (img_rgb.shape[1], img_rgb.shape[0]))
                    mask_binary = mask_resized > 0.5
                    
                    if np.sum(mask_binary) > 1000:  # Masque assez grand
                        print(f"YOLO détection: classe {cls}, confiance {conf:.3f}")
                        return mask_binary
        
        return None
        
    except ImportError:
        print("YOLO non disponible (ultralytics non installé)")
        return None
    except Exception as e:
        print(f"Erreur YOLO: {e}")
        return None

def refine_tree_mask(mask, img_rgb):
    """Affiner le masque d'arbre avec des techniques de post-traitement"""
    if mask is None:
        return None
    
    try:
        # Convertir en uint8
        mask_uint8 = (mask.astype(np.uint8) * 255)
        
        # Analyse de forme pour identifier la structure d'arbre
        contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return mask
        
        # Prendre le plus grand contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Vérifier le ratio hauteur/largeur (un arbre devrait être plus haut que large)
        x, y, w, h = cv2.boundingRect(largest_contour)
        aspect_ratio = h / w if w > 0 else 0
        
        print(f"Ratio hauteur/largeur: {aspect_ratio:.2f}")
        
        # Si le ratio est trop petit (<1.2), essayer de segmenter verticalement
        if aspect_ratio < 1.2:
            print("Objet trop large, tentative de segmentation verticale...")
            
            # Créer un masque plus conservateur focalisé sur la partie centrale verticale
            mask_refined = np.zeros_like(mask_uint8)
            center_x = x + w // 2
            
            # Garder seulement la partie centrale (60% de la largeur)
            left_bound = max(0, center_x - int(0.3 * w))
            right_bound = min(mask.shape[1], center_x + int(0.3 * w))
            
            mask_refined[y:y+h, left_bound:right_bound] = mask_uint8[y:y+h, left_bound:right_bound]
            mask = mask_refined > 0
        
        # Lissage final
        kernel = np.ones((5, 5), np.uint8)
        mask_smooth = cv2.morphologyEx((mask.astype(np.uint8) * 255), cv2.MORPH_CLOSE, kernel)
        mask_smooth = cv2.morphologyEx(mask_smooth, cv2.MORPH_OPEN, kernel)
        
        return mask_smooth > 0
        
    except Exception as e:
        print(f"Erreur affinement masque: {e}")
        return mask

# ----------- Chargement et segmentation -----------
print("="*60)
print("   ESTIMATION DE HAUTEUR D'ARBRE - VERSION 3")
print("="*60)

# Sélection de l'image
img_path = get_image_path()
if img_path is None:
    print("Aucune image sélectionnée. Arrêt du programme.")
    exit()

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device de calcul: {device}")

img, img_rgb, height, width = load_image(img_path)
tree_mask = segment_tree_multi_approach(img_rgb, device)

# ----------- Génération carte de profondeur -----------
def generate_depth_map(img_rgb, device):
    """Générer la carte de profondeur avec MiDaS"""
    print("Génération carte de profondeur...")
    try:
        midas = torch.hub.load("intel-isl/MiDaS", "DPT_Large").to(device)
        midas.eval()
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms").dpt_transform
        
        input_midas = midas_transforms(img_rgb).to(device)
        
        with torch.no_grad():
            depth = midas(input_midas.unsqueeze(0))
        
        depth_map = depth.squeeze().cpu().numpy()
        height, width = img_rgb.shape[:2]
        depth_map = cv2.resize(depth_map, (width, height))
        depth_map = (depth_map - depth_map.min()) / (depth_map.max() - depth_map.min())
        
        return depth_map
        
    except Exception as e:
        print(f"Erreur MiDaS: {e}, utilisation carte approximative")
        height, width = img_rgb.shape[:2]
        y_coords = np.arange(height).reshape(-1, 1)
        return np.tile(y_coords, (1, width)) / height

def detect_tree_extremes(tree_mask):
    """Détecter base et sommet de l'arbre avec précision améliorée"""
    ys, xs = np.where(tree_mask)
    if len(ys) == 0:
        raise ValueError("Masque vide")
    
    # Méthode améliorée pour la base
    # Prendre les 5% de pixels les plus bas et faire la médiane
    bottom_threshold = np.percentile(ys, 95)
    bottom_pixels = ys >= bottom_threshold
    base_candidates_y = ys[bottom_pixels]
    base_candidates_x = xs[bottom_pixels]
    
    base_y = int(np.median(base_candidates_y))
    base_x = int(np.median(base_candidates_x))
    
    # Méthode améliorée pour le sommet
    # Prendre les 5% de pixels les plus hauts et faire la médiane
    top_threshold = np.percentile(ys, 5)
    top_pixels = ys <= top_threshold
    top_candidates_y = ys[top_pixels]
    top_candidates_x = xs[top_pixels]
    
    top_y = int(np.median(top_candidates_y))
    top_x = int(np.median(top_candidates_x))
    
    # Vérification de cohérence
    if base_y <= top_y:
        print("⚠️ Avertissement: Base et sommet incohérents, correction automatique")
        # Forcer base en bas et sommet en haut
        base_y = ys.max()
        top_y = ys.min()
        base_x = int(np.median(xs[ys == base_y]))
        top_x = int(np.median(xs[ys == top_y]))
    
    # Affiner la position horizontale en cherchant le centre de masse local
    def refine_x_position(y_pos, mask, window=20):
        y_start = max(0, y_pos - window//2)
        y_end = min(mask.shape[0], y_pos + window//2)
        
        local_region = mask[y_start:y_end, :]
        if np.any(local_region):
            ys_local, xs_local = np.where(local_region)
            if len(xs_local) > 0:
                return int(np.median(xs_local))
        return None
    
    # Affiner les positions
    refined_base_x = refine_x_position(base_y, tree_mask)
    refined_top_x = refine_x_position(top_y, tree_mask)
    
    if refined_base_x is not None:
        base_x = refined_base_x
    if refined_top_x is not None:
        top_x = refined_top_x
    
    print(f"Base affinée: ({base_x}, {base_y}), Sommet affiné: ({top_x}, {top_y})")
    print(f"Hauteur en pixels: {base_y - top_y}")
    
    return (base_x, base_y), (top_x, top_y)

def get_focal_length_px(img_path, width):
    """Estimation focale en pixels"""
    try:
        with open(img_path, 'rb') as f:
            tags = exifread.process_file(f)
        focal_mm_tag = tags.get('EXIF FocalLength')
        if focal_mm_tag:
            focal_mm = float(str(focal_mm_tag).split('/')[0])
            if '/' in str(focal_mm_tag):
                focal_mm = focal_mm / float(str(focal_mm_tag).split('/')[1])
            sensor_width_mm = 6.3
            focal_px = focal_mm / sensor_width_mm * width
            print(f"Focale EXIF: {focal_mm}mm -> {focal_px:.1f}px")
            return focal_px
    except Exception as e:
        print(f"Erreur EXIF: {e}")
    
    focal_px = 0.9 * width
    print(f"Focale approximée: {focal_px:.1f}px")
    return focal_px

# ----------- Calcul de hauteur RÈGLE DE TROIS PURE -----------
base_pos, top_pos = detect_tree_extremes(tree_mask)

print(f"\n🔢 CALCUL SIMPLE - RÈGLE DE TROIS:")
print(f"   Base: {base_pos}, Sommet: {top_pos}")

# Hauteur en pixels
tree_pixel_height = base_pos[1] - top_pos[1]
print(f"   Hauteur mesurée: {tree_pixel_height} pixels")

# DONNÉES DE RÉFÉRENCE (de votre mesure exacte corrigée)
REF_PIXELS = 2185     # Hauteur en pixels de votre arbre de référence (nouvelle mesure)
REF_HEIGHT_M = 1.35   # Hauteur réelle en mètres

print(f"   Référence: {REF_PIXELS} pixels = {REF_HEIGHT_M}m")

# RÈGLE DE TROIS DIRECTE : Si 2971px = 1.35m, alors X px = ?
# Formule: hauteur_réelle = (pixels_mesurés / pixels_référence) × hauteur_référence
H_m = (tree_pixel_height / REF_PIXELS) * REF_HEIGHT_M

print(f"   Calcul: ({tree_pixel_height} ÷ {REF_PIXELS}) × {REF_HEIGHT_M} = {H_m:.3f}m")

# Arrondir à 2 décimales
H_m = round(H_m, 2)

# Estimation de l'incertitude basée sur la différence de taille
ratio = tree_pixel_height / REF_PIXELS
if 0.8 <= ratio <= 1.2:  # Taille similaire à la référence
    uncertainty = 0.10  # ±10%
elif 0.5 <= ratio <= 2.0:  # Taille raisonnablement différente
    uncertainty = 0.20  # ±20%
else:  # Très différent de la référence
    uncertainty = 0.30  # ±30%

# DBH proportionnel (approximation : DBH ≈ 10-15% de la hauteur pour les jeunes arbres)
DBH_m = round(H_m * 0.12, 2)  # 12% de la hauteur

print(f"   Ratio par rapport à la référence: {ratio:.2f}")
print(f"   Hauteur calculée: {H_m}m")
print(f"   DBH estimé: {DBH_m}m")
print(f"   Incertitude: ±{uncertainty*100:.0f}%")

# ----------- Affichage et sauvegarde -----------
img_out = img.copy()

# Masque semi-transparent
mask_colored = np.zeros_like(img)
mask_colored[tree_mask] = [0, 255, 0]
img_out = cv2.addWeighted(img_out, 0.7, mask_colored, 0.3, 0)

# Points et ligne
cv2.circle(img_out, base_pos, 10, (0, 0, 255), -1)  # Rouge base
cv2.circle(img_out, top_pos, 10, (255, 0, 0), -1)   # Bleu sommet
cv2.line(img_out, base_pos, top_pos, (255, 255, 0), 3)

# Texte avec les bonnes valeurs
cv2.putText(img_out, f"Hauteur: {H_m:.2f}m ±{uncertainty*100:.0f}%", 
            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
cv2.putText(img_out, f"DBH: {DBH_m:.2f}m", 
            (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
cv2.putText(img_out, f"Pixels: {tree_pixel_height}px", 
            (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

# Sauvegarde avec nom basé sur l'image originale
input_name = os.path.splitext(os.path.basename(img_path))[0]
output_name = f"analyse_{input_name}_hauteur_{H_m:.1f}m.jpg"
output_path = os.path.join(os.path.dirname(img_path), output_name)

# Si le dossier n'est pas accessible, sauvegarder dans le dossier courant
try:
    cv2.imwrite(output_path, img_out)
    print(f"Image sauvegardée: {output_path}")
except:
    output_path = output_name
    cv2.imwrite(output_path, img_out)
    print(f"Image sauvegardée: {output_path}")

print("\n" + "="*50)
print("RÉSULTATS ESTIMATION ARBRE - MÉTHODE SIMPLE")
print("="*50)
print(f"Image analysée: {os.path.basename(img_path)}")
print(f"Hauteur mesurée: {tree_pixel_height} pixels")
print(f"Référence utilisée: {REF_PIXELS}px = {REF_HEIGHT_M}m")
print(f"Ratio: {tree_pixel_height}/{REF_PIXELS} = {ratio:.3f}")
print(f"Hauteur estimée: {H_m} m ±{uncertainty*100:.0f}%")
print(f"Diamètre DBH: {DBH_m} m")
print(f"Résultat sauvegardé: {os.path.basename(output_path)}")
print("="*50)