import streamlit as st
import cv2
import numpy as np
import matplotlib.pyplot as plt
import easyocr
import re
from ultralytics import YOLO
import tempfile
import os

# Configuration de la page
st.set_page_config(page_title="ArborVision", page_icon="🌳", layout="wide")
st.title("🌳 ArborVision - Plateforme d'Analyse Arboricole")

# Sidebar pour la navigation
st.sidebar.title("Navigation")
app_mode = st.sidebar.selectbox("Choisissez le module", 
                               ["Accueil", "OCR - Extraction de texte", "Détection de Fruits", "Mesure de hauteur"])

# Initialisation des modèles (une seule fois)
@st.cache_resource
def load_models():
    reader = easyocr.Reader(['fr'], gpu=True)
    # Chargement d'un modèle spécialisé dans les fruits (à remplacer par votre modèle personnalisé si disponible)
    fruit_model = YOLO('yolov8n.pt')  # Modèle de base (à remplacer par un modèle fruits si possible)
    return reader, fruit_model

reader, fruit_model = load_models()

# Page d'accueil
if app_mode == "Accueil":
    st.header("Bienvenue sur ArborVision")
    st.markdown("""
    **Plateforme complète pour l'analyse des arbres et de leur environnement**
    
    Fonctionnalités :
    - 📝 **OCR avancé** : Extraction d'informations depuis des images
    - 🍎 **Détection de Fruits** : Identification précise des fruits sur les arbres
    - 📏 **Mesure de hauteur** : Estimation de la hauteur des arbres
    
    *Sélectionnez un module dans la sidebar à gauche*
    """)
    
    st.image("https://images.unsplash.com/photo-1462146449396-2d7d4ba877d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
            caption="Analyse d'arbres avec intelligence artificielle")

# Module OCR amélioré
elif app_mode == "OCR - Extraction de texte":
    st.header("📝 Extraction de texte depuis les images")
    st.warning("Optimisé pour les plaques signalétiques d'arbres et les panneaux d'information")
    
    uploaded_file = st.file_uploader("Téléchargez une image contenant du texte", type=["jpg", "png", "jpeg"])
    
    if uploaded_file is not None:
        # Lecture de l'image avec prétraitement
        file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
        image = cv2.imdecode(file_bytes, 1)
        
        # Prétraitement pour améliorer la détection OCR
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        _, thresholded = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        image = cv2.cvtColor(thresholded, cv2.COLOR_GRAY2RGB)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.image(image, caption="Image prétraitée", use_column_width=True)
        
        with col2:
            with st.spinner("Analyse OCR en cours..."):
                # Effectuer l'extraction de texte
                results = reader.readtext(image, 
                                        batch_size=4,
                                        text_threshold=0.3,
                                        low_text=0.3,
                                        link_threshold=0.3,
                                        decoder='beamsearch',
                                        blocklist='')
                
                # Dictionnaire pour stocker les informations
                info = {
                    "Nom": "Non détecté",
                    "Arbre": "Non détecté",
                    "Géolocalisation": "Non détecté"
                }
                
                # Détection spécifique pour Frutopy
                frutopy_detected = False
                detected_texts = []
                
                for i, (bbox, text, prob) in enumerate(results):
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
                    
                    # Détection des arbres
                    arbres_connus = {
                        "Oranger", "Olivier", "Chêne", "Palmier", "Eucalyptus", 
                        "Pommier", "Cerisier", "Abricotier", "Poirier", "Citronnier"
                    }
                    
                    for arbre in arbres_connus:
                        if arbre.lower() in text.lower():
                            info["Arbre"] = arbre
                            break
                    
                    # Détection des coordonnées GPS
                    gps_pattern = r'(\d{1,3}\.\d{4,}),\s*(\d{1,3}\.\d{4,})'
                    if re.search(gps_pattern, text):
                        info["Géolocalisation"] = text
                
                if info["Nom"] == "Non détecté" and detected_texts:
                    info["Nom"] = detected_texts[0]
                
                # Affichage des résultats
                st.success("Analyse terminée !")
                st.subheader("Informations extraites :")
                for key, value in info.items():
                    st.markdown(f"**{key}** : {value}")
                
                # Visualisation des zones de texte
                fig, ax = plt.subplots(figsize=(10, 6))
                ax.imshow(image)
                
                for bbox, text, prob in results:
                    if prob < 0.2:
                        continue
                    
                    (top_left, top_right, bottom_right, bottom_left) = bbox
                    top_left = tuple(map(int, top_left))
                    bottom_right = tuple(map(int, bottom_right))
                    cv2.rectangle(image, top_left, bottom_right, (0, 255, 0), 2)
                    cv2.putText(image, f"{text} ({prob:.2f})", top_left, cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                st.image(image, caption="Zones de texte détectées", use_column_width=True)

# Module Détection de Fruits optimisé
elif app_mode == "Détection de Fruits":
    st.header("🍎 Détection de Fruits sur les Arbres")
    st.info("Module optimisé pour la détection de fruits")
    
    # Configuration simplifiée
    conf_threshold = st.slider("Sensibilité de détection", 0.01, 0.99, 0.15)
    
    uploaded_file = st.file_uploader("Téléchargez une image", type=["jpg", "png", "jpeg"])
    
    if uploaded_file is not None:
        # Lecture et prétraitement de l'image
        file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, 1)
        
        # Amélioration de l'image
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img_enhanced = cv2.detailEnhance(img, sigma_s=10, sigma_r=0.15)
        
        # Affichage image originale
        st.image(img_enhanced, caption="Image originale améliorée", use_column_width=True)
        
        # Sauvegarde temporaire
        temp_path = "temp_image.jpg"
        cv2.imwrite(temp_path, cv2.cvtColor(img_enhanced, cv2.COLOR_RGB2BGR))
        
        try:
            # Détection avec paramètres optimisés
            results = fruit_model.predict(
                temp_path,
                conf=conf_threshold,
                iou=0.25,
                imgsz=640,
                augment=True,
                verbose=False
            )[0]  # Prendre le premier résultat
            
            # Classes de fruits et objets pertinents
            fruit_classes = {
                0: 'Personne',  # pour l'échelle
                47: 'Pomme',
                48: 'Orange',
                49: 'Banana',
                50: 'Fruit',
                51: 'Carotte',
                52: 'Légume',
                53: 'Broccoli',
                73: 'Livre',  # pour les panneaux
                84: 'Bouteille'  # pour l'échelle
            }
            
            detections = []
            boxes = []
            scores = []
            names = []
            
            # Extraction des détections
            if results.boxes is not None:
                for box in results.boxes:
                    class_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    
                    if class_id in fruit_classes:
                        name = fruit_classes[class_id]
                        xyxy = box.xyxy[0].tolist()
                        
                        detections.append({
                            'name': name,
                            'confidence': conf,
                            'box': xyxy
                        })
                        boxes.append(xyxy)
                        scores.append(conf)
                        names.append(name)
            
            # Affichage des résultats
            if detections:
                # Dessiner les boîtes sur l'image
                img_result = img_enhanced.copy()
                for det in detections:
                    box = det['box']
                    name = det['name']
                    conf = det['confidence']
                    
                    x1, y1, x2, y2 = map(int, box)
                    cv2.rectangle(img_result, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(img_result, f"{name} {conf:.2f}", (x1, y1-10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                st.image(img_result, caption="Détections", use_column_width=True)
                
                # Statistiques
                st.success(f"Nombre total de détections: {len(detections)}")
                
                # Comptage par type
                counts = {}
                for det in detections:
                    name = det['name']
                    counts[name] = counts.get(name, 0) + 1
                
                # Affichage des statistiques
                st.subheader("Détections par type:")
                for name, count in counts.items():
                    st.write(f"- {name}: {count} ({count/len(detections)*100:.1f}%)")
                
                # Graphique des confiances
                if len(detections) > 0:
                    fig, ax = plt.subplots(figsize=(10, 4))
                    ax.bar(range(len(detections)), [d['confidence'] for d in detections])
                    ax.set_xticks(range(len(detections)))
                    ax.set_xticklabels([d['name'] for d in detections], rotation=45)
                    ax.set_ylabel('Confiance')
                    ax.set_title('Niveau de confiance par détection')
                    st.pyplot(fig)
            else:
                st.warning("Aucune détection - Essayez de :")
                st.markdown("""
                - Diminuer le seuil de confiance
                - Utiliser une image plus claire
                - Prendre la photo de plus près
                """)
        
        except Exception as e:
            st.error(f"Erreur lors de l'analyse: {str(e)}")
        
        finally:
            # Nettoyage
            if os.path.exists(temp_path):
                os.remove(temp_path)

# Module mesure de hauteur
elif app_mode == "Mesure de hauteur":
    st.header("📏 Mesure de hauteur des arbres")
    st.warning("Pour des résultats précis, prenez la photo à une distance connue de l'arbre")
    
    uploaded_file = st.file_uploader("Téléchargez une image contenant l'arbre à mesurer", type=["jpg", "png", "jpeg"])
    
    if uploaded_file is not None:
        # Lecture de l'image
        file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
        image = cv2.imdecode(file_bytes, 1)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Initialisation des points dans session_state
        if 'points' not in st.session_state:
            st.session_state.points = []
        
        # Paramètres
        col1, col2 = st.columns(2)
        
        with col1:
            st.image(image, caption="Image originale", use_column_width=True)
            
            # Paramètres de mesure
            with st.expander("Paramètres avancés"):
                distance = st.number_input("Distance à l'arbre (mètres)", value=5.0, min_value=0.1, step=0.1)
                camera_height = st.number_input("Hauteur de la caméra (mètres)", value=1.7, min_value=0.5, step=0.1)
                focal_length = st.number_input("Longueur focale (mm)", value=50, min_value=10, step=1)
        
        with col2:
            st.info("Instructions :")
            st.markdown("""
            1. Sélectionnez d'abord le sommet puis la base de l'arbre
            2. Appuyez sur "Calculer la hauteur"
            """)
            
            # Bouton de réinitialisation
            if st.button("Réinitialiser"):
                st.session_state.points = []
                st.rerun()
            
            # Afficher l'image avec les points sélectionnés
            fig, ax = plt.subplots(figsize=(10, 6))
            ax.imshow(image)
            ax.set_title("Points sélectionnés")
            ax.axis('off')
            
            # Dessiner les points existants
            colors = ['green', 'blue']
            labels = ['Sommet', 'Base']
            
            for i, (x, y) in enumerate(st.session_state.points):
                color_idx = i if i < len(colors) else -1
                ax.plot(x, y, 'o', color=colors[color_idx], markersize=8, label=labels[color_idx] if i < len(labels) else None)
            
            if len(st.session_state.points) >= 2:
                ax.plot([st.session_state.points[0][0], st.session_state.points[1][0]], 
                        [st.session_state.points[0][1], st.session_state.points[1][1]], 
                        'r-', linewidth=2)
            
            if st.session_state.points:
                ax.legend()
            
            st.pyplot(fig)
            
            # Sélection des points via coordonnées
            st.subheader("Ajouter un point")
            col_x, col_y = st.columns(2)
            with col_x:
                x_coord = st.number_input("Coordonnée X", min_value=0, max_value=image.shape[1]-1, value=0)
            with col_y:
                y_coord = st.number_input("Coordonnée Y", min_value=0, max_value=image.shape[0]-1, value=0)
            
            if st.button("Ajouter ce point"):
                if len(st.session_state.points) < 2:
                    st.session_state.points.append((x_coord, y_coord))
                    st.rerun()
                else:
                    st.warning("Seuls 2 points (sommet et base) sont nécessaires")
            
            if st.session_state.points:
                st.subheader("Points sélectionnés")
                for i, (x, y) in enumerate(st.session_state.points):
                    st.write(f"{i+1}. ({x}, {y}) - {labels[i] if i < len(labels) else 'Point supplémentaire'}")
            
            if st.button("Calculer la hauteur"):
                if len(st.session_state.points) == 2:
                    top, bottom = st.session_state.points[0], st.session_state.points[1]
                    
                    # Calcul basé sur la géométrie projective
                    h_img = image.shape[0]
                    sensor_height_mm = 24
                    focal_px = (h_img * focal_length) / sensor_height_mm
                    
                    height_px = abs(top[1] - bottom[1])
                    height_m = (height_px * distance) / focal_px
                    height_m += camera_height
                    
                    st.success(f"Hauteur estimée : {height_m:.2f} mètres")
                    
                    fig_result, ax_result = plt.subplots(figsize=(10, 6))
                    ax_result.imshow(image)
                    ax_result.plot([top[0], bottom[0]], [top[1], bottom[1]], 'r-', linewidth=2)
                    ax_result.scatter(top[0], top[1], c='green', s=50, label='Sommet')
                    ax_result.scatter(bottom[0], bottom[1], c='blue', s=50, label='Base')
                    ax_result.legend()
                    ax_result.set_title(f"Hauteur estimée: {height_m:.2f} m")
                    ax_result.axis('off')
                    st.pyplot(fig_result)
                else:
                    st.error("Veuillez sélectionner exactement 2 points (sommet et base de l'arbre)")

# Pied de page
st.sidebar.markdown("---")
st.sidebar.markdown("""
**ArborVision** v2.0  
Développé avec Streamlit  
© 2023 - Tous droits réservés
""")