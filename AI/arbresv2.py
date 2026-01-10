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
    """Segmentation avec plusieurs approches combinées"""
    print("Tentative de segmentation avec Mask R-CNN...")
    
    # Approche 1: Mask R-CNN
    tree_mask = try_maskrcnn_segmentation(img_rgb, device)
    
    if tree_mask is not None and np.sum(tree_mask) > 1000:
        print("Segmentation Mask R-CNN réussie")
        return tree_mask
    
    print("Mask R-CNN insuffisant, essai segmentation sémantique...")
    
    # Approche 2: Segmentation sémantique DeepLabV3
    tree_mask = try_semantic_segmentation(img_rgb, device)
    
    if tree_mask is not None and np.sum(tree_mask) > 1000:
        print("Segmentation sémantique réussie")
        return tree_mask
    
    print("Segmentation sémantique insuffisante, utilisation du seuillage couleur...")
    
    # Approche 3: Seuillage couleur comme fallback
    tree_mask = create_vegetation_mask_by_color(img_rgb)
    
    if tree_mask is not None and np.sum(tree_mask) > 500:
        print("Segmentation par couleur réussie")
        return tree_mask
    
    raise ValueError("Impossible de segmenter l'arbre avec toutes les méthodes")

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
    """Créer un masque de végétation basé sur la couleur verte"""
    try:
        hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)
        
        # Masques pour différentes nuances de vert
        lower_green1 = np.array([35, 40, 40])
        upper_green1 = np.array([85, 255, 255])
        mask_green1 = cv2.inRange(hsv, lower_green1, upper_green1)
        
        # Vert plus foncé (forêt)
        lower_green2 = np.array([30, 30, 30])
        upper_green2 = np.array([90, 255, 200])
        mask_green2 = cv2.inRange(hsv, lower_green2, upper_green2)
        
        # Combiner les masques
        mask_combined = cv2.bitwise_or(mask_green1, mask_green2)
        
        # Nettoyage morphologique
        kernel = np.ones((7, 7), np.uint8)
        mask_combined = cv2.morphologyEx(mask_combined, cv2.MORPH_CLOSE, kernel)
        mask_combined = cv2.morphologyEx(mask_combined, cv2.MORPH_OPEN, kernel)
        
        # Garder seulement la plus grande composante connexe
        num_labels, labels = cv2.connectedComponents(mask_combined)
        if num_labels > 1:
            largest_component = 1 + np.argmax([np.sum(labels == i) for i in range(1, num_labels)])
            mask_combined = (labels == largest_component).astype(np.uint8) * 255
        
        return mask_combined.astype(bool)
        
    except Exception as e:
        print(f"Erreur segmentation couleur: {e}")
        return None

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
    """Détecter base et sommet de l'arbre"""
    ys, xs = np.where(tree_mask)
    if len(ys) == 0:
        raise ValueError("Masque vide")
    
    base_y = ys.max()
    top_y = ys.min()
    base_x = int(np.median(xs[ys == base_y]))
    top_x = int(np.median(xs[ys == top_y]))
    
    print(f"Base: ({base_x}, {base_y}), Sommet: ({top_x}, {top_y})")
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

# ----------- Calculs principaux -----------
depth_map = generate_depth_map(img_rgb, device)
base_pos, top_pos = detect_tree_extremes(tree_mask)
focal_px = get_focal_length_px(img_path, width)

# Estimation hauteur
camera_height_m = 1.6
tree_pixel_height = base_pos[1] - top_pos[1]
base_depth = depth_map[base_pos[1], base_pos[0]]

# Modèle sténopé avec correction profondeur
H_m = tree_pixel_height * camera_height_m / focal_px
depth_correction = 1.0 / (base_depth + 0.1)
H_m *= depth_correction

# Estimation DBH
dbh_height_m = 1.3
dbh_y = int(base_pos[1] - (dbh_height_m / camera_height_m) * tree_pixel_height)
if 0 <= dbh_y < height:
    dbh_row = tree_mask[dbh_y, :]
    if np.any(dbh_row):
        xs_dbh = np.where(dbh_row)[0]
        dbh_pixel_width = xs_dbh.max() - xs_dbh.min() if len(xs_dbh) > 0 else 0
        DBH_m = dbh_pixel_width * camera_height_m / focal_px
    else:
        DBH_m = 0.0
else:
    DBH_m = 0.0

uncertainty = 0.30  # ±30%

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

# Texte
cv2.putText(img_out, f"Hauteur: {H_m:.2f}m ±{uncertainty*100:.0f}%", 
            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
cv2.putText(img_out, f"DBH: {DBH_m:.2f}m", 
            (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

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

# Texte
cv2.putText(img_out, f"Hauteur: {H_m:.2f}m ±{uncertainty*100:.0f}%", 
            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
cv2.putText(img_out, f"DBH: {DBH_m:.2f}m", 
            (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

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
print("RÉSULTATS ESTIMATION ARBRE")
print("="*50)
print(f"Image analysée: {os.path.basename(img_path)}")
print(f"Hauteur estimée: {H_m:.2f} m ±{uncertainty*100:.0f}%")
print(f"Diamètre DBH: {DBH_m:.2f} m")
print(f"Hauteur en pixels: {tree_pixel_height}")
print(f"Focale estimée: {focal_px:.1f} px")
print(f"Résultat sauvegardé: {os.path.basename(output_path)}")
print("="*50)