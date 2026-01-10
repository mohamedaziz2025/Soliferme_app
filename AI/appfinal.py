"""
ArborVision - Application Streamlit pour l'analyse arboricole complète
Développé par votre équipe - Version 3.0

Fonctionnalités principales :
1. Identification de l'arbre (OCR / QR code)
2. Prise de mesures capteurs
3. Analyse IA (détection de fruits)
4. Validation par l'agriculteur
5. Enregistrement final

Flux d'utilisation :
- Identification automatique de l'arbre via QR code/OCR
- Mesures physiques par capteurs simulés
- Détection et comptage des fruits par IA
- Validation et ajustements par l'utilisateur
- Export des données en JSON/CSV
"""

# ==================== CONFIGURATION OPENMP ====================
# Résolution du problème OpenMP avec multiple libraires
import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
os.environ['OMP_NUM_THREADS'] = '1'

# Chargement des variables d'environnement depuis .env
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Variables d'environnement chargées depuis .env")
except ImportError:
    print("⚠️ python-dotenv non installé, utilisation des variables par défaut")
except Exception as e:
    print(f"⚠️ Erreur lors du chargement .env : {e}")

# Import sécurisé des bibliothèques
import warnings
warnings.filterwarnings('ignore', category=UserWarning)

import streamlit as st
import cv2
import numpy as np
import matplotlib.pyplot as plt
import easyocr
import re
from ultralytics import YOLO
import tempfile
import os
import json
import pandas as pd
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image, ImageDraw
import pyzbar
from pyzbar import pyzbar
from streamlit_drawable_canvas import st_canvas
import math

# Configuration mobile de la page
st.set_page_config(
    page_title="🌳 ArborVision Mobile",
    page_icon="🌳",
    layout="centered",  # Optimisé pour mobile
    initial_sidebar_state="collapsed",  # Sidebar fermée par défaut sur mobile
    menu_items={
        'Get Help': 'https://github.com/arborvision/help',
        'Report a bug': "https://github.com/arborvision/issues",
        'About': "# ArborVision Mobile v3.0\nApplication mobile d'analyse arboricole intelligente"
    }
)

# CSS pour l'interface mobile
st.markdown("""
<style>
    /* Interface mobile responsive */
    .main .block-container {
        padding-top: 1rem;
        padding-bottom: 1rem;
        padding-left: 1rem;
        padding-right: 1rem;
        max-width: 100%;
    }
    
    /* Boutons optimisés pour mobile */
    .stButton > button {
        width: 100%;
        height: 3rem;
        font-size: 1.2rem;
        border-radius: 10px;
        margin: 0.5rem 0;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        color: white;
        border: none;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    
    /* Cartes pour les options */
    .mobile-card {
        background: white;
        padding: 1.5rem;
        border-radius: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        margin: 1rem 0;
        border-left: 5px solid #4CAF50;
    }
    
    /* Titre mobile */
    .mobile-title {
        text-align: center;
        font-size: 2rem;
        color: #2E7D32;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Sous-titre mobile */
    .mobile-subtitle {
        text-align: center;
        font-size: 1rem;
        color: #666;
        margin-bottom: 2rem;
    }
    
    /* Navigation mobile */
    .mobile-nav {
        background: #E8F5E8;
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
    
    /* Métriques mobile */
    .mobile-metric {
        background: linear-gradient(135deg, #4CAF50, #66BB6A);
        color: white;
        padding: 1rem;
        border-radius: 10px;
        text-align: center;
        margin: 0.5rem 0;
    }
    
    /* Upload mobile */
    .mobile-upload {
        border: 2px dashed #4CAF50;
        border-radius: 15px;
        padding: 2rem;
        text-align: center;
        background: #F1F8E9;
        margin: 1rem 0;
    }
    
    /* Alertes mobile */
    .mobile-alert {
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
        font-size: 1rem;
    }
    
    /* Sidebar mobile */
    .css-1d391kg {
        background: linear-gradient(180deg, #E8F5E8, #C8E6C9);
    }
    
    /* Progress bar mobile */
    .mobile-progress {
        background: #E0E0E0;
        border-radius: 10px;
        height: 10px;
        margin: 1rem 0;
    }
    
    /* Responsive images */
    .mobile-image {
        border-radius: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-width: 100%;
        height: auto;
    }
    
    /* Input fields mobile */
    .stTextInput > div > div > input {
        font-size: 1.1rem;
        padding: 0.8rem;
        border-radius: 10px;
        border: 2px solid #E0E0E0;
    }
    
    /* Select boxes mobile */
    .stSelectbox > div > div > select {
        font-size: 1.1rem;
        padding: 0.8rem;
        border-radius: 10px;
    }
    
    /* Nombres input mobile */
    .stNumberInput > div > div > input {
        font-size: 1.1rem;
        padding: 0.8rem;
        border-radius: 10px;
    }
    
    /* Text areas mobile */
    .stTextArea > div > div > textarea {
        font-size: 1rem;
        border-radius: 10px;
        border: 2px solid #E0E0E0;
    }
    
    /* Colonnes mobile */
    @media (max-width: 768px) {
        .row-widget.stHorizontal {
            flex-direction: column;
        }
        .element-container {
            margin-bottom: 1rem;
        }
    }
    
    /* Header sticky mobile */
    .mobile-header {
        position: sticky;
        top: 0;
        background: white;
        z-index: 1000;
        padding: 1rem;
        border-bottom: 1px solid #E0E0E0;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    /* Footer mobile */
    .mobile-footer {
        background: #F5F5F5;
        padding: 2rem 1rem;
        text-align: center;
        border-radius: 15px 15px 0 0;
        margin-top: 2rem;
    }
</style>
""", unsafe_allow_html=True)

# ==================== FONCTIONS UTILITAIRES ====================

def initialize_session_state():
    """Initialise les variables de session pour maintenir l'état entre les pages"""
    if 'app_mode' not in st.session_state:
        st.session_state.app_mode = "🏠 Sélection Type Arbre"
    if 'tree_type_selection' not in st.session_state:
        st.session_state.tree_type_selection = None
    if 'tree_id' not in st.session_state:
        st.session_state.tree_id = None
    if 'tree_info' not in st.session_state:
        st.session_state.tree_info = {}
    if 'sensor_data' not in st.session_state:
        st.session_state.sensor_data = {}
    if 'detection_results' not in st.session_state:
        st.session_state.detection_results = {}
    if 'validation_data' not in st.session_state:
        st.session_state.validation_data = {}
    if 'uploaded_tree_image' not in st.session_state:
        st.session_state.uploaded_tree_image = None
    if 'final_results' not in st.session_state:
        st.session_state.final_results = {}
    if 'existing_trees_data' not in st.session_state:
        st.session_state.existing_trees_data = {}
    if 'mobile_mode' not in st.session_state:
        st.session_state.mobile_mode = True

def detect_mobile_device():
    """Détecte si l'utilisateur utilise un appareil mobile"""
    try:
        # Tentative de détection via streamlit-mobile-detection si disponible
        from streamlit_mobile_detection import st_mobile_detection
        return st_mobile_detection()
    except ImportError:
        # Fallback : considérer comme mobile par défaut pour l'interface tactile
        return True

def mobile_header(title="🌳 ArborVision Mobile", subtitle="Analyse arboricole intelligente"):
    """Affiche l'en-tête mobile"""
    st.markdown(f"""
    <div class="mobile-header">
        <h1 class="mobile-title">{title}</h1>
        <p class="mobile-subtitle">{subtitle}</p>
    </div>
    """, unsafe_allow_html=True)

def mobile_navigation():
    """Navigation mobile simplifiée"""
    with st.container():
        st.markdown('<div class="mobile-nav">', unsafe_allow_html=True)
        
        # Progress bar mobile
        steps = ["🏠 Type", "🔍 ID", "📏 Mesures", "🍎 Fruits", "✅ Valid.", "💾 Export"]
        current_step = 0
        
        if st.session_state.tree_type_selection is not None:
            current_step = 1
        if st.session_state.tree_id is not None:
            current_step = 2
        if st.session_state.sensor_data:
            current_step = 3
        if st.session_state.detection_results:
            current_step = 4
        if st.session_state.validation_data:
            current_step = 5
        if st.session_state.final_results:
            current_step = 6
        
        # Barre de progression mobile
        progress_percent = (current_step / 6) * 100
        st.markdown(f"""
        <div class="mobile-progress">
            <div style="width: {progress_percent}%; height: 100%; background: #4CAF50; border-radius: 10px; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 0.5rem;">
            {' '.join([f'<span style="color: {"#4CAF50" if i <= current_step else "#ccc"}">{step}</span>' for i, step in enumerate(steps)])}
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown('</div>', unsafe_allow_html=True)

def mobile_card(title, content, icon="📱"):
    """Crée une carte mobile"""
    st.markdown(f"""
    <div class="mobile-card">
        <h3 style="margin-top: 0; color: #2E7D32;">{icon} {title}</h3>
        {content}
    </div>
    """, unsafe_allow_html=True)

def mobile_metric(label, value, delta=None):
    """Affiche une métrique mobile"""
    delta_html = f"<br><small style='opacity: 0.8;'>{delta}</small>" if delta else ""
    st.markdown(f"""
    <div class="mobile-metric">
        <div style="font-size: 0.9rem; opacity: 0.9;">{label}</div>
        <div style="font-size: 1.5rem; font-weight: bold;">{value}{delta_html}</div>
    </div>
    """, unsafe_allow_html=True)

def mobile_alert(message, type="info"):
    """Affiche une alerte mobile"""
    colors = {
        "success": "#D4EDDA",
        "warning": "#FFF3CD", 
        "error": "#F8D7DA",
        "info": "#E8F5E8"
    }
    icons = {
        "success": "✅",
        "warning": "⚠️",
        "error": "❌", 
        "info": "ℹ️"
    }
    
    color = colors.get(type, colors["info"])
    icon = icons.get(type, icons["info"])
    
    st.markdown(f"""
    <div class="mobile-alert" style="background-color: {color};">
        {icon} {message}
    </div>
    """, unsafe_allow_html=True)

def save_to_file(data, format_type="json"):
    """Sauvegarde les données en JSON ou CSV"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format_type == "json":
        filename = f"arborvision_data_{timestamp}.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    elif format_type == "csv":
        filename = f"arborvision_data_{timestamp}.csv"
        df = pd.json_normalize(data)
        df.to_csv(filename, index=False, encoding='utf-8')
    
    return filename

def load_existing_trees_from_excel():
    """Charge les données d'arbres existants depuis un fichier Excel"""
    try:
        excel_file = "arbres_database.xlsx"
        if os.path.exists(excel_file):
            df = pd.read_excel(excel_file)
            trees_dict = {}
            for index, row in df.iterrows():
                tree_id = str(row.get('tree_id', ''))
                if tree_id:
                    trees_dict[tree_id] = {
                        'tree_id': tree_id,
                        'tree_type': row.get('tree_type', ''),
                        'last_analysis': row.get('last_analysis', ''),
                        'total_fruits_last': row.get('total_fruits_last', 0),
                        'total_weight_last': row.get('total_weight_last', 0),
                        'height_m': row.get('height_m', 0),
                        'width_m': row.get('width_m', 0),
                        'coordinates': row.get('coordinates', ''),
                        'comments': row.get('comments', '')
                    }
            return trees_dict
        else:
            return {}
    except Exception as e:
        st.error(f"Erreur lors du chargement des données Excel : {e}")
        return {}

def save_to_excel(data, tree_id):
    """Sauvegarde ou met à jour les données dans le fichier Excel"""
    try:
        excel_file = "arbres_database.xlsx"
        
        # Charger les données existantes ou créer un nouveau DataFrame
        if os.path.exists(excel_file):
            df = pd.read_excel(excel_file)
        else:
            df = pd.DataFrame()
        
        # Préparer les nouvelles données
        new_row = {
            'tree_id': tree_id,
            'tree_type': data.get('tree_identification', {}).get('tree_type', ''),
            'last_analysis': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_fruits_last': data.get('validation_corrections', {}).get('fruit_data', {}).get('manual_count', 0),
            'total_weight_last': data.get('validation_corrections', {}).get('fruit_data', {}).get('total_weight_estimated_g', 0),
            'height_m': data.get('validation_corrections', {}).get('tree_measurements', {}).get('height_m', 0),
            'width_m': data.get('validation_corrections', {}).get('tree_measurements', {}).get('width_m', 0),
            'coordinates': data.get('tree_identification', {}).get('coordinates', ''),
            'temperature_last': data.get('validation_corrections', {}).get('environmental_conditions', {}).get('temperature_c', 0),
            'humidity_last': data.get('validation_corrections', {}).get('environmental_conditions', {}).get('humidity_percent', 0),
            'detection_quality_last': data.get('validation_corrections', {}).get('quality_assessment', {}).get('detection_quality', ''),
            'confidence_level_last': data.get('validation_corrections', {}).get('quality_assessment', {}).get('confidence_level', ''),
            'comments': data.get('validation_corrections', {}).get('quality_assessment', {}).get('comments', ''),
            'distance_cm_last': data.get('validation_corrections', {}).get('tree_measurements', {}).get('corrected_distance_cm', 0)
        }
        
        # Vérifier si l'arbre existe déjà
        if 'tree_id' in df.columns and tree_id in df['tree_id'].values:
            # Mise à jour
            df.loc[df['tree_id'] == tree_id, list(new_row.keys())] = list(new_row.values())
        else:
            # Ajout d'un nouvel arbre
            new_df = pd.DataFrame([new_row])
            df = pd.concat([df, new_df], ignore_index=True)
        
        # Sauvegarder dans Excel
        df.to_excel(excel_file, index=False)
        return excel_file
        
    except Exception as e:
        st.error(f"Erreur lors de la sauvegarde Excel : {e}")
        return None

def get_download_link(file_path, link_text):
    """Génère un lien de téléchargement pour un fichier"""
    with open(file_path, "rb") as file:
        contents = file.read()
    b64 = base64.b64encode(contents).decode()
    href = f'<a href="data:file/octet-stream;base64,{b64}" download="{os.path.basename(file_path)}">{link_text}</a>'
    return href

# Chargement des modèles (une seule fois)
@st.cache_resource
def load_models():
    """Charge les modèles IA une seule fois pour optimiser les performances"""
    try:
        reader = easyocr.Reader(['fr', 'en'], gpu=False)  # Support français et anglais
        fruit_model = YOLO('yolov8n.pt')  # Modèle YOLO pour la détection
        return reader, fruit_model
    except Exception as e:
        st.error(f"Erreur lors du chargement des modèles : {e}")
        return None, None

# Chargement des modèles
reader, fruit_model = load_models()

# Initialisation de l'état de session
initialize_session_state()

# Détection du mode mobile
is_mobile = detect_mobile_device()

# Chargement des données d'arbres existants
if 'existing_trees_data' not in st.session_state or not st.session_state.existing_trees_data:
    st.session_state.existing_trees_data = load_existing_trees_from_excel()

# ==================== INTERFACE MOBILE PRINCIPALE ====================

# En-tête mobile
mobile_header()

# Navigation mobile
mobile_navigation()

# Navigation différente selon le type d'arbre sélectionné
if st.session_state.tree_type_selection is None:
    navigation_options = ["🏠 Sélection Type Arbre"]
else:
    navigation_options = [
        "🏠 Sélection Type Arbre",
        "🔍 1. Identification Arbre", 
        "📏 2. Mesures Capteurs",
        "🍎 3. Détection Fruits",
        "✅ 4. Validation",
        "💾 5. Enregistrement Final"
    ]

# Menu de navigation mobile tactile
with st.container():
    st.markdown("### 📱 Navigation")
    
    # Boutons de navigation en grille
    cols = st.columns(2)
    for i, option in enumerate(navigation_options):
        with cols[i % 2]:
            if st.button(option, key=f"nav_{i}", use_container_width=True):
                app_mode = option

# Affichage du statut dans la navigation mobile
st.markdown("---")

# Indicateur de statut mobile
with st.container():
    st.markdown("### 📊 Progression")
    
    # Statut différent selon le type d'arbre
    if st.session_state.tree_type_selection == "existing":
        status_items = [
            ("Type Arbre", st.session_state.tree_type_selection is not None),
            ("Arbre Sélectionné", st.session_state.tree_id is not None),
            ("Mesures Capteurs", bool(st.session_state.sensor_data)),
            ("Détection Fruits", bool(st.session_state.detection_results)),
            ("Validation", bool(st.session_state.validation_data)),
            ("Mise à jour Excel", bool(st.session_state.final_results))
        ]
    elif st.session_state.tree_type_selection == "new":
        status_items = [
            ("Type Arbre", st.session_state.tree_type_selection is not None),
            ("ID Arbre", st.session_state.tree_id is not None),
            ("Mesures Capteurs", bool(st.session_state.sensor_data)),
            ("Détection Fruits", bool(st.session_state.detection_results)),
            ("Validation", bool(st.session_state.validation_data)),
            ("Ajout Excel", bool(st.session_state.final_results))
        ]
    else:
        status_items = [
            ("Sélection", False),
            ("En attente", False),
            ("En attente", False),
            ("En attente", False),
            ("En attente", False),
            ("En attente", False)
        ]

    # Affichage des statuts en grille mobile
    cols = st.columns(2)
    for i, (item, completed) in enumerate(status_items):
        with cols[i % 2]:
            icon = "✅" if completed else "⏳"
            if completed:
                mobile_metric(item, icon, "Terminé")
            else:
                st.markdown(f"""
                <div style="background: #F5F5F5; padding: 1rem; border-radius: 10px; text-align: center; margin: 0.5rem 0;">
                    <div style="font-size: 1.5rem;">{icon}</div>
                    <div style="font-size: 0.9rem; color: #666;">{item}</div>
                </div>
                """, unsafe_allow_html=True)

# Définir app_mode par défaut si non défini
if 'app_mode' not in locals():
    app_mode = st.session_state.app_mode

# ==================== PAGE DE SÉLECTION TYPE D'ARBRE MOBILE ====================

if app_mode == "🏠 Sélection Type Arbre":
    st.markdown("### � Choisissez le type d'analyse")
    
    mobile_alert("Sélectionnez le mode d'analyse adapté à votre situation", "info")
    
    # Option 1: Nouvel Arbre
    mobile_card(
        "🆕 Nouvel Arbre", 
        """
        <strong>Analyse complète d'un arbre non répertorié</strong><br><br>
        ✅ Identification complète par OCR/QR<br>
        ✅ Création d'un nouveau profil<br>
        ✅ Mesures de dimensions<br>
        ✅ Détection et comptage des fruits<br>
        ✅ Ajout automatique à la base Excel<br><br>
        <em>Idéal pour le premier enregistrement d'un arbre</em>
        """,
        "🆕"
    )
    
    if st.button("🆕 Analyser un Nouvel Arbre", type="primary", use_container_width=True):
        st.session_state.tree_type_selection = "new"
        st.session_state.tree_id = None
        st.session_state.tree_info = {}
        mobile_alert("Mode 'Nouvel Arbre' sélectionné !", "success")
        st.rerun()
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Option 2: Arbre Existant
    mobile_card(
        "📋 Arbre Existant",
        """
        <strong>Mise à jour d'un arbre déjà répertorié</strong><br><br>
        ✅ Sélection par ID existant<br>
        ✅ Chargement des données précédentes<br>
        ✅ Nouvelles mesures et détections<br>
        ✅ Comparaison avec l'historique<br>
        ✅ Mise à jour automatique Excel<br><br>
        <em>Idéal pour le suivi périodique d'arbres connus</em>
        """,
        "📋"
    )
    
    if st.button("📋 Analyser un Arbre Existant", use_container_width=True):
        st.session_state.tree_type_selection = "existing"
        st.session_state.tree_id = None
        st.session_state.tree_info = {}
        mobile_alert("Mode 'Arbre Existant' sélectionné !", "success")
        st.rerun()
    
    # Affichage de la base de données existante si disponible
    if st.session_state.existing_trees_data:
        st.markdown("---")
        st.markdown("### 📊 Base de Données")
        
        mobile_metric("Arbres enregistrés", len(st.session_state.existing_trees_data), "dans la base")
        
        # Tableau récapitulatif mobile
        if st.button("📋 Voir les arbres enregistrés", use_container_width=True):
            trees_summary = []
            for tree_id, data in st.session_state.existing_trees_data.items():
                trees_summary.append({
                    'ID': tree_id,
                    'Type': data.get('tree_type', 'Non spécifié'),
                    'Dernière Analyse': data.get('last_analysis', 'Jamais'),
                    'Fruits': data.get('total_fruits_last', 0),
                    'Poids': f"{data.get('total_weight_last', 0):.0f}g"
                })
            
            if trees_summary:
                df_summary = pd.DataFrame(trees_summary)
                st.dataframe(df_summary, use_container_width=True, height=300)
    else:
        mobile_alert("Aucune base de données Excel trouvée. Un nouveau fichier sera créé lors de la première sauvegarde.", "info")
    
    # Instructions d'utilisation mobile
    st.markdown("---")
    with st.expander("📚 Instructions d'utilisation", expanded=False):
        st.markdown("""
        **🔍 Pour les arbres existants :**
        - Lire l'ID écrit à la main sur l'étiquette
        - Scanner un QR code si disponible
        - Rechercher dans la liste des arbres
        
        **🆕 Pour un nouvel arbre :**
        - Scan de l'image pour extraire/créer un ID
        - Mesures complètes des dimensions
        - Détection automatique par IA
        - Validation manuelle des résultats
        
        **💾 Le fichier Excel contient :**
        - ID unique de chaque arbre
        - Historique des mesures
        - Derniers résultats de détection
        - Commentaires et observations
        """)

# ==================== PAGE D'ACCUEIL (ancienne) ====================

elif app_mode == "🏠 Accueil":
    st.header("Bienvenue sur ArborVision 3.0")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("""
        ### 🎯 Flux d'utilisation
        
        **ArborVision** vous guide à travers un processus complet d'analyse arboricole :
        
        1. **🔍 Identification de l'arbre**
           - Scan automatique de QR codes ou codes-barres
           - Extraction OCR d'informations textuelles
           - Identification automatique de l'ID arbre
        
        2. **📏 Prise de mesures physiques**
           - Lecture de capteurs ultrason et laser (simulés)
           - Calcul automatique de la distance finale
           - Validation des mesures
        
        3. **🍎 Analyse IA avancée**
           - Détection automatique des fruits par YOLO
           - Comptage précis et estimation de taille
           - Calcul du poids estimé
        
        4. **✅ Validation par l'agriculteur**
           - Interface de correction intuitive
           - Ajustement des cadres de détection
           - Modification manuelle des valeurs
        
        5. **💾 Enregistrement et export**
           - Sauvegarde automatique en base locale
           - Export CSV/JSON configurable
           - Rapports détaillés
        
        ### 🚀 Commencer l'analyse
        Utilisez la navigation dans la sidebar pour débuter votre session d'analyse.
        """)
    
    with col2:
        st.markdown("""
        ### 📋 Fonctionnalités clés
        
        **🔬 Technologies intégrées :**
        - EasyOCR pour l'extraction de texte
        - PyZbar pour les QR codes
        - YOLO v8 pour la détection
        - OpenCV pour le traitement d'image
        - Streamlit Canvas pour l'interaction
        
        **📊 Résultats exportables :**
        - Formats JSON et CSV
        - Métadonnées complètes
        - Horodatage automatique
        - Géolocalisation (si disponible)
        
        **💡 Optimisé pour :**
        - Arbres fruitiers
        - Conditions de terrain
        - Interface tactile
        - Déploiement Linux
        """)
    
    # Affichage d'une image de démonstration
    st.markdown("---")
    st.subheader("🖼️ Aperçu du processus")
    
    demo_col1, demo_col2, demo_col3 = st.columns(3)
    
    with demo_col1:
        st.info("**Étape 1 : Identification**\n\nScan QR code ou extraction OCR")
    
    with demo_col2:
        st.info("**Étape 2 : Détection**\n\nAnalyse IA des fruits sur l'arbre")
    
    with demo_col3:
        st.info("**Étape 3 : Validation**\n\nVérification et ajustements manuels")

# ==================== MODULE 1 : IDENTIFICATION ARBRE MOBILE ====================

elif app_mode == "🔍 1. Identification Arbre":
    mobile_header("🔍 Identification de l'arbre")
    
    # Vérification du type de sélection
    if st.session_state.tree_type_selection is None:
        mobile_alert("Veuillez d'abord sélectionner le type d'analyse dans la page d'accueil.", "error")
        if st.button("🏠 Retour à la sélection", use_container_width=True):
            st.rerun()
        st.stop()
    
    # Affichage différent selon le type sélectionné
    if st.session_state.tree_type_selection == "existing":
        mobile_alert("Mode: Arbre Existant 📋", "info")
        
        # Navigation mobile entre onglets
        tab_selection = st.radio(
            "Choisir l'action:",
            ["� Sélection Arbre", "📷 Scan ID"],
            index=0,
            horizontal=True
        )
        
        if tab_selection == "📋 Sélection Arbre":
            mobile_card("📋 Sélection d'un arbre existant", """
            Choisissez l'arbre à analyser depuis la base de données
            """)
            
            if st.session_state.existing_trees_data:
                # Liste déroulante des arbres existants
                tree_options = {f"{tree_id} - {data.get('tree_type', 'Type inconnu')}": tree_id 
                              for tree_id, data in st.session_state.existing_trees_data.items()}
                
                selected_tree_display = st.selectbox(
                    "Choisissez un arbre:",
                    ["Sélectionnez un arbre..."] + list(tree_options.keys())
                )
                
                if selected_tree_display != "Sélectionnez un arbre...":
                    selected_tree_id = tree_options[selected_tree_display]
                    tree_data = st.session_state.existing_trees_data[selected_tree_id]
                    
                    # Affichage mobile des informations
                    mobile_metric("ID Arbre", selected_tree_id, "sélectionné")
                    mobile_metric("Type", tree_data.get('tree_type', 'Non spécifié'), "")
                    mobile_metric("Dernière analyse", tree_data.get('last_analysis', 'Jamais'), "")
                    
                    # Métriques de mesures
                    col1, col2 = st.columns(2)
                    with col1:
                        mobile_metric("Hauteur", f"{tree_data.get('height_m', 0)} m", "")
                        mobile_metric("Fruits", tree_data.get('total_fruits_last', 0), "dernière fois")
                    with col2:
                        mobile_metric("Largeur", f"{tree_data.get('width_m', 0)} m", "")
                        mobile_metric("Poids", f"{tree_data.get('total_weight_last', 0):.0f} g", "total")
                    
                    # Commentaires précédents
                    if tree_data.get('comments'):
                        mobile_card("💬 Commentaires précédents", tree_data['comments'], "💬")
                    
                    # Confirmation de sélection
                    if st.button("✅ Confirmer cette sélection", type="primary", use_container_width=True):
                        st.session_state.tree_id = selected_tree_id
                        st.session_state.tree_info = {
                            'tree_id': selected_tree_id,
                            'tree_type': tree_data.get('tree_type'),
                            'coordinates': tree_data.get('coordinates'),
                            'previous_data': tree_data,
                            'timestamp': datetime.now().isoformat()
                        }
                        mobile_alert(f"Arbre **{selected_tree_id}** sélectionné !", "success")
                        mobile_alert("Vous pouvez maintenant passer aux mesures capteurs.", "info")
                
                # Saisie manuelle d'ID
                st.markdown("---")
                mobile_card("✏️ Saisie manuelle de l'ID", """
                Si vous connaissez l'ID exact de l'arbre
                """)
                
                manual_id = st.text_input("Tapez l'ID de l'arbre:", placeholder="Ex: ARB001, A123, etc.")
                
                if manual_id:
                    if manual_id in st.session_state.existing_trees_data:
                        mobile_alert(f"Arbre trouvé: **{manual_id}**", "success")
                        if st.button("✅ Sélectionner cet arbre", use_container_width=True):
                            st.session_state.tree_id = manual_id
                            st.session_state.tree_info = {
                                'tree_id': manual_id,
                                'tree_type': st.session_state.existing_trees_data[manual_id].get('tree_type'),
                                'coordinates': st.session_state.existing_trees_data[manual_id].get('coordinates'),
                                'previous_data': st.session_state.existing_trees_data[manual_id],
                                'timestamp': datetime.now().isoformat()
                            }
                            st.rerun()
                    else:
                        mobile_alert(f"Arbre **{manual_id}** non trouvé dans la base de données.", "warning")
                        if st.button("🆕 Créer comme nouvel arbre", use_container_width=True):
                            st.session_state.tree_type_selection = "new"
                            st.session_state.tree_id = manual_id
                            st.rerun()
            
            else:
                mobile_alert("Aucun arbre enregistré dans la base de données.", "warning")
                if st.button("🆕 Créer le premier arbre", use_container_width=True):
                    st.session_state.tree_type_selection = "new"
                    st.rerun()
        
        elif tab_selection == "📷 Scan ID":
            mobile_card("📷 Scan d'ID par image (optionnel)", """
            Cette fonction peut être utilisée pour confirmer l'ID lu sur l'étiquette de l'arbre.
            """)
            
            # Code de scan d'image mobile
            uploaded_file = st.file_uploader(
                "Photo de l'étiquette avec l'ID",
                type=["jpg", "png", "jpeg"],
                help="Photo de l'étiquette ou marquage sur l'arbre"
            )
            
            if uploaded_file is not None:
                file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
                image = cv2.imdecode(file_bytes, 1)
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
                st.image(image_rgb, caption="Image capturée", use_column_width=True)
                
                # OCR pour extraire l'ID mobile
                if reader is not None:
                    if st.button("🔍 Analyser l'image", type="primary", use_container_width=True):
                        with st.spinner("Lecture de l'ID..."):
                            try:
                                results = reader.readtext(image_rgb)
                                detected_ids = []
                                
                                for bbox, text, confidence in results:
                                    if confidence > 0.3:
                                        # Recherche de patterns d'ID
                                        clean_text = text.strip().upper()
                                        if any(char.isalnum() for char in clean_text) and len(clean_text) >= 3:
                                            detected_ids.append({
                                                'text': clean_text,
                                                'confidence': confidence
                                            })
                                
                                if detected_ids:
                                    mobile_alert("IDs détectés :", "success")
                                    for id_info in detected_ids:
                                        st.write(f"• **{id_info['text']}** (confiance: {id_info['confidence']:.2f})")
                                        
                                        # Vérifier si l'ID existe
                                        if id_info['text'] in st.session_state.existing_trees_data:
                                            if st.button(f"✅ Sélectionner {id_info['text']}", use_container_width=True):
                                                st.session_state.tree_id = id_info['text']
                                                st.session_state.tree_info = {
                                                    'tree_id': id_info['text'],
                                                    'previous_data': st.session_state.existing_trees_data[id_info['text']],
                                                    'timestamp': datetime.now().isoformat()
                                                }
                                                st.rerun()
                                        else:
                                            mobile_alert(f"ID **{id_info['text']}** non trouvé en base", "warning")
                                else:
                                    mobile_alert("Aucun ID lisible détecté", "warning")
                            except Exception as e:
                                mobile_alert(f"Erreur OCR: {e}", "error")
    
    else:  # nouvel arbre
        mobile_alert("Mode: Nouvel Arbre 🆕", "info")
        
        # Navigation mobile entre onglets pour nouvel arbre
        tab_new_selection = st.radio(
            "Étapes d'identification:",
            ["📷 Capture Image", "📋 Informations"],
            index=0,
            horizontal=True
        )
        
        if tab_new_selection == "📷 Capture Image":
            mobile_card("📷 Image de la bannière/étiquette", """
            Capturez ou importez une image de l'étiquette de l'arbre
            """)
            
            # Options de capture mobile
            capture_method = st.radio(
                "Méthode de capture:",
                ["📁 Upload fichier", "📷 Caméra"],
                horizontal=True
            )
            
            uploaded_file = None
            
            if capture_method == "📁 Upload fichier":
                uploaded_file = st.file_uploader(
                    "Téléchargez une image de bannière/étiquette d'arbre",
                    type=["jpg", "png", "jpeg"],
                    help="Image contenant QR code, code-barre ou texte d'identification"
                )
            
            elif capture_method == "📷 Caméra":
                mobile_alert("Fonctionnalité caméra en développement. Utilisez l'upload pour le moment.", "info")
            
            if uploaded_file is not None:
                # Lecture et prétraitement de l'image
                file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
                image = cv2.imdecode(file_bytes, 1)
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                
                st.image(image_rgb, caption="Image originale", use_column_width=True)
                
                if st.button("🔍 Analyser l'image", type="primary", use_container_width=True):
                    with st.spinner("Analyse en cours..."):
                        # Prétraitement pour améliorer l'OCR
                        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
                        _, thresholded = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                        processed_image = cv2.cvtColor(thresholded, cv2.COLOR_GRAY2RGB)
                        
                        st.image(processed_image, caption="Image prétraitée", width=300)
                    
                    # Analyse QR Code
                    st.markdown("### 🔳 Détection QR Code")
                    qr_codes = pyzbar.decode(image)
                    
                    qr_data = []
                    if qr_codes:
                        for qr in qr_codes:
                            qr_text = qr.data.decode('utf-8')
                            qr_data.append(qr_text)
                            mobile_alert(f"QR Code détecté: **{qr_text}**", "success")
                    else:
                        mobile_alert("Aucun QR Code détecté", "warning")
                    
                    # Analyse OCR
                    st.markdown("### 📝 Extraction de texte (OCR)")
                    
                    if reader is not None:
                        with st.spinner("Analyse OCR en cours..."):
                            try:
                                results = reader.readtext(
                                    processed_image,
                                    batch_size=4,
                                    text_threshold=0.3,
                                    low_text=0.3,
                                    link_threshold=0.3,
                                    decoder='beamsearch'
                                )
                                
                                # Extraction et structuration des informations
                                extracted_info = {
                                    "tree_id": None,
                                    "tree_name": None,
                                    "tree_type": None,
                                    "coordinates": None,
                                    "additional_info": [],
                                    "qr_data": qr_data,
                                    "timestamp": datetime.now().isoformat()
                                }
                                
                                detected_texts = []
                                for bbox, text, confidence in results:
                                    if confidence > 0.3:
                                        detected_texts.append({
                                            'text': text.strip(),
                                            'confidence': confidence,
                                            'bbox': bbox
                                        })
                                
                                # Intelligence d'extraction
                                for item in detected_texts:
                                    text = item['text'].lower()
                                    
                                    # Détection ID arbre (patterns communs)
                                    id_patterns = [
                                        r'id[:\s]*([a-zA-Z0-9]+)',
                                        r'arbre[:\s]*([a-zA-Z0-9]+)',
                                        r'tree[:\s]*([a-zA-Z0-9]+)',
                                        r'(\d{3,})',  # Numéros de 3 chiffres ou plus
                                    ]
                                    
                                    for pattern in id_patterns:
                                        match = re.search(pattern, text)
                                        if match and not extracted_info["tree_id"]:
                                            extracted_info["tree_id"] = match.group(1) if match.lastindex else match.group(0)
                                
                                # Détection type d'arbre
                                tree_types = [
                                    'pommier', 'poirier', 'cerisier', 'abricotier', 'pêcher',
                                    'oranger', 'citronnier', 'mandarinier', 'olivier',
                                    'chêne', 'érable', 'bouleau', 'pin', 'sapin'
                                ]
                                
                                for tree_type in tree_types:
                                    if tree_type in text:
                                        extracted_info["tree_type"] = tree_type.capitalize()
                                        break
                                
                                # Détection coordonnées GPS
                                gps_pattern = r'(\d{1,3}\.\d{4,})[,\s]+(\d{1,3}\.\d{4,})'
                                gps_match = re.search(gps_pattern, item['text'])
                                if gps_match:
                                    extracted_info["coordinates"] = f"{gps_match.group(1)}, {gps_match.group(2)}"
                                
                                # Stockage informations additionnelles
                                if len(item['text']) > 2 and item['confidence'] > 0.5:
                                    extracted_info["additional_info"].append({
                                        'text': item['text'],
                                        'confidence': item['confidence']
                                    })
                                
                                # Utilisation des données QR si disponibles
                                if qr_data and not extracted_info["tree_id"]:
                                    extracted_info["tree_id"] = qr_data[0]
                                
                                # Génération d'un ID automatique si aucun n'est trouvé
                                if not extracted_info["tree_id"]:
                                    timestamp = datetime.now().strftime("%Y%m%d%H%M")
                                    extracted_info["tree_id"] = f"AUTO_{timestamp}"
                                
                                # Sauvegarde dans la session
                                st.session_state.tree_info = extracted_info
                                st.session_state.tree_id = extracted_info["tree_id"]
                                
                                # Affichage immédiat des résultats OCR
                                st.success("✅ Analyse terminée avec succès !")
                                
                                # Affichage des textes détectés pour modification
                                st.markdown("---")
                                st.subheader("📝 Textes détectés par OCR")
                                
                                if detected_texts:
                                    # Tableau interactif des textes détectés
                                    for i, item in enumerate(detected_texts):
                                        with st.container():
                                            col_text, col_conf, col_action = st.columns([3, 1, 1])
                                            
                                            with col_text:
                                                # Champ modifiable pour chaque texte
                                                modified_text = st.text_input(
                                                    f"Texte {i+1}",
                                                    value=item['text'],
                                                    key=f"text_modify_{i}",
                                                    help=f"Confiance: {item['confidence']:.2f}"
                                                )
                                                # Mise à jour en temps réel
                                                if modified_text != item['text']:
                                                    item['text'] = modified_text
                                            
                                            with col_conf:
                                                st.metric("Confiance", f"{item['confidence']:.2f}")
                                            
                                            with col_action:
                                                if st.button("🗑️", key=f"delete_{i}", help="Supprimer ce texte"):
                                                    detected_texts.pop(i)
                                                    st.rerun()
                                    
                                    # Bouton pour ajouter un texte manuel
                                    st.markdown("---")
                                    col_add1, col_add2 = st.columns([3, 1])
                                    
                                    with col_add1:
                                        new_text = st.text_input("➕ Ajouter un texte manuellement", placeholder="Tapez ici...")
                                    
                                    with col_add2:
                                        if st.button("Ajouter") and new_text:
                                            detected_texts.append({
                                                'text': new_text,
                                                'confidence': 1.0,
                                                'bbox': []
                                            })
                                            st.rerun()
                                    
                                    # Bouton de validation des modifications
                                    st.markdown("---")
                                    if st.button("✅ Valider les textes modifiés", type="primary"):
                                        # Re-traitement des informations avec les textes modifiés
                                        updated_info = {
                                            "tree_id": None,
                                            "tree_name": None,
                                            "tree_type": None,
                                            "coordinates": None,
                                            "additional_info": detected_texts,
                                            "qr_data": qr_data,
                                            "timestamp": datetime.now().isoformat()
                                        }
                                        
                                        # Re-analyse avec les textes modifiés
                                        for item in detected_texts:
                                            text = item['text'].lower()
                                            
                                            # Détection ID arbre
                                            id_patterns = [
                                                r'id[:\s]*([a-zA-Z0-9]+)',
                                                r'arbre[:\s]*([a-zA-Z0-9]+)',
                                                r'tree[:\s]*([a-zA-Z0-9]+)',
                                                r'(\d{3,})',
                                            ]
                                            
                                            for pattern in id_patterns:
                                                match = re.search(pattern, text)
                                                if match and not updated_info["tree_id"]:
                                                    updated_info["tree_id"] = match.group(1) if match.lastindex else match.group(0)
                                            
                                            # Détection type d'arbre
                                            tree_types = [
                                                'pommier', 'poirier', 'cerisier', 'abricotier', 'pêcher',
                                                'oranger', 'citronnier', 'mandarinier', 'olivier',
                                                'chêne', 'érable', 'bouleau', 'pin', 'sapin'
                                            ]
                                        
                                        for tree_type in tree_types:
                                            if tree_type in text:
                                                updated_info["tree_type"] = tree_type.capitalize()
                                                break
                                        
                                        # Détection coordonnées GPS
                                        gps_pattern = r'(\d{1,3}\.\d{4,})[,\s]+(\d{1,3}\.\d{4,})'
                                        gps_match = re.search(gps_pattern, item['text'])
                                        if gps_match:
                                            updated_info["coordinates"] = f"{gps_match.group(1)}, {gps_match.group(2)}"
                                        
                                        # Utilisation des données QR si disponibles
                                        if qr_data and not updated_info["tree_id"]:
                                            updated_info["tree_id"] = qr_data[0]
                                        
                                        # Génération d'un ID automatique si aucun n'est trouvé
                                        if not updated_info["tree_id"]:
                                            timestamp = datetime.now().strftime("%Y%m%d%H%M")
                                            updated_info["tree_id"] = f"AUTO_{timestamp}"
                                        
                                        # Mise à jour des informations
                                        st.session_state.tree_info = updated_info
                                        st.session_state.tree_id = updated_info["tree_id"]
                                        
                                        st.success("✅ Informations mises à jour avec succès !")
                                        st.balloons()
                                else:
                                    st.warning("⚠️ Aucun texte détecté par l'OCR")
                                    
                                    # Option de saisie manuelle complète
                                    st.markdown("### ✏️ Saisie manuelle")
                                    manual_id = st.text_input("ID de l'arbre", placeholder="Ex: ARB001")
                                    manual_type = st.selectbox("Type d'arbre", 
                                        ['', 'Pommier', 'Poirier', 'Cerisier', 'Abricotier', 'Pêcher'])
                                    manual_coords = st.text_input("Coordonnées GPS", placeholder="Ex: 45.123,2.456")
                                    
                                    if st.button("✅ Valider saisie manuelle") and manual_id:
                                        manual_info = {
                                            "tree_id": manual_id,
                                            "tree_type": manual_type if manual_type else None,
                                            "coordinates": manual_coords if manual_coords else None,
                                            "additional_info": [],
                                            "qr_data": qr_data,
                                            "timestamp": datetime.now().isoformat(),
                                            "manual_entry": True
                                        }
                                        
                                        st.session_state.tree_info = manual_info
                                        st.session_state.tree_id = manual_id
                                        
                                        st.success("✅ Informations saisies manuellement !")
                            
                            except Exception as e:
                                st.error(f"Erreur lors de l'analyse OCR : {str(e)}")
                                
                                # Interface de fallback en cas d'erreur OCR
                                st.markdown("### 🔧 Saisie de secours")
                                fallback_id = st.text_input("ID de l'arbre (saisie manuelle)", placeholder="ARB001")
                                if st.button("Continuer avec saisie manuelle") and fallback_id:
                                    fallback_info = {
                                        "tree_id": fallback_id,
                                        "tree_type": None,
                                        "coordinates": None,
                                        "additional_info": [],
                                        "qr_data": qr_data,
                                        "timestamp": datetime.now().isoformat(),
                                        "ocr_error": True
                                    }
                                    st.session_state.tree_info = fallback_info
                                    st.session_state.tree_id = fallback_id
                                    st.success("✅ ID saisi manuellement, vous pouvez continuer !")
                    else:
                        st.error("❌ Modèle OCR non disponible")
                        
                        # Interface de saisie sans OCR
                        st.markdown("### ✏️ Saisie sans OCR")
                        no_ocr_id = st.text_input("ID de l'arbre", placeholder="ARB001")
                        no_ocr_type = st.selectbox("Type d'arbre", 
                            ['', 'Pommier', 'Poirier', 'Cerisier', 'Abricotier', 'Pêcher'])
                        
                        if st.button("Continuer sans OCR") and no_ocr_id:
                            no_ocr_info = {
                                "tree_id": no_ocr_id,
                                "tree_type": no_ocr_type if no_ocr_type else None,
                                "coordinates": None,
                                "additional_info": [],
                                "qr_data": qr_data,
                                "timestamp": datetime.now().isoformat(),
                                "no_ocr": True
                            }
                            st.session_state.tree_info = no_ocr_info
                            st.session_state.tree_id = no_ocr_id
                            st.success("✅ Informations enregistrées, vous pouvez continuer !")
        
        elif tab_new_selection == "📋 Informations":
            mobile_card("📋 Informations extraites", """
            Résumé des informations détectées et validation
            """)
            
            if st.session_state.tree_info:
                info = st.session_state.tree_info
                
                # Affichage mobile des informations
                mobile_metric("ID Arbre", info.get('tree_id', 'Non détecté'), "identifiant")
                mobile_metric("Type", info.get('tree_type', 'Non spécifié'), "espèce")
                mobile_metric("Coordonnées", info.get('coordinates', 'Non spécifiées'), "GPS")
                
                # Données techniques
                st.markdown("### 📊 Données techniques")
                col1, col2 = st.columns(2)
                with col1:
                    mobile_metric("QR Codes", len(info.get('qr_data', [])), "détectés")
                with col2:
                    mobile_metric("Textes OCR", len(info.get('additional_info', [])), "extraits")
                
                # Correction manuelle mobile
                st.markdown("---")
                mobile_card("✏️ Correction manuelle", """
                Modifiez les informations si nécessaire
                """)
                
                if st.button("📝 Modifier les informations", use_container_width=True):
                    st.session_state.show_edit_form = True
                
                if st.session_state.get('show_edit_form', False):
                    new_id = st.text_input("ID Arbre", value=info.get('tree_id', ''))
                    new_type = st.selectbox(
                        "Type d'arbre",
                        ['Non spécifié', 'Pommier', 'Poirier', 'Cerisier', 'Abricotier', 'Pêcher',
                         'Oranger', 'Citronnier', 'Mandarinier', 'Olivier', 'Autre'],
                        index=0
                    )
                    new_coords = st.text_input("Coordonnées GPS", value=info.get('coordinates', ''))
                    
                    col_save, col_cancel = st.columns(2)
                    with col_save:
                        if st.button("💾 Sauvegarder", type="primary", use_container_width=True):
                            st.session_state.tree_info.update({
                                'tree_id': new_id,
                                'tree_type': new_type if new_type != 'Non spécifié' else None,
                                'coordinates': new_coords
                            })
                            st.session_state.tree_id = new_id
                            mobile_alert("Informations mises à jour !", "success")
                            st.session_state.show_edit_form = False
                            st.rerun()
                    
                    with col_cancel:
                        if st.button("❌ Annuler", use_container_width=True):
                            st.session_state.show_edit_form = False
                            st.rerun()
                
                # Affichage des détails additionnels
                if info.get('additional_info'):
                    st.markdown("---")
                    mobile_card("📝 Tous les textes détectés", """
                    Liste complète des textes extraits par OCR
                    """)
                    
                    for i, item in enumerate(info['additional_info']):
                        st.write(f"**{i+1}.** {item['text']} (confiance: {item['confidence']:.2f})")
            
            else:
                mobile_alert("Veuillez d'abord capturer une image dans l'onglet précédent.", "info")
    
    # Navigation mobile commune
    if st.session_state.tree_id:
        st.markdown("---")
        mobile_card("✅ Identification terminée", f"""
        **Arbre ID:** {st.session_state.tree_id}<br>
        **Statut:** Prêt pour l'étape suivante
        """, "✅")
        
        col_nav1, col_nav2 = st.columns(2)
        
        with col_nav1:
            if st.button("⬅️ Retour Sélection", use_container_width=True):
                st.session_state.tree_type_selection = None
                st.session_state.tree_id = None
                st.session_state.tree_info = {}
                st.rerun()
        
        with col_nav2:
            if st.button("➡️ Continuer aux Capteurs", type="primary", use_container_width=True):
                mobile_alert("Passage au Module 2...", "info")

# ==================== MODULE 2 : MESURES CAPTEURS ====================

elif app_mode == "📏 2. Mesures Capteurs":
    st.header("📏 Module 2 : Prise de Mesures Capteurs")
    st.markdown("*Simulation de capteurs ultrason et laser pour la mesure de distance*")
    
    if not st.session_state.tree_id:
        st.warning("⚠️ Veuillez d'abord identifier un arbre dans le Module 1.")
        if st.button("🔍 Aller au Module 1"):
            # Redirection simulée
            st.info("Redirection vers Module 1...")
    else:
        # Affichage différent selon le type d'arbre
        if st.session_state.tree_type_selection == "existing":
            st.success(f"🌳 Arbre existant identifié : **{st.session_state.tree_id}**")
            
            # Affichage des données précédentes si disponibles
            if st.session_state.tree_info.get('previous_data'):
                prev_data = st.session_state.tree_info['previous_data']
                st.info(f"📊 Données précédentes : Hauteur {prev_data.get('height_m', 'N/A')}m, "
                       f"Largeur {prev_data.get('width_m', 'N/A')}m, "
                       f"Distance {prev_data.get('distance_cm_last', 'N/A')}cm")
        else:
            st.success(f"🌳 Nouvel arbre identifié : **{st.session_state.tree_id}**")
        
        st.markdown("---")
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            st.subheader("🔧 Configuration des capteurs")
            
            # Simulation des capteurs avec détection automatique
            st.markdown("#### 📡 Capteur Ultrason")
            
            # Mode automatique ou manuel
            mode_ultrason = st.radio("Mode ultrason:", ["🤖 Automatique", "✋ Manuel"], horizontal=True)
            
            if mode_ultrason == "🤖 Automatique":
                if st.button("🔍 Détecter automatiquement (Ultrason)"):
                    # Simulation de détection automatique avec variation réaliste
                    import random
                    base_distance = random.uniform(120, 200)
                    noise = random.uniform(-3, 3)
                    ultrason_value = base_distance + noise
                    st.session_state.ultrason_auto = ultrason_value
                    st.success(f"🎯 Détection automatique : {ultrason_value:.1f} cm")
                
                ultrason_value = st.session_state.get('ultrason_auto', 150.0)
                st.info(f"📊 Valeur détectée : {ultrason_value:.1f} cm")
            else:
                ultrason_value = st.number_input(
                    "Distance ultrason (cm)",
                    min_value=10.0,
                    max_value=1000.0,
                    value=150.0,
                    step=1.0,
                    help="Saisie manuelle de la mesure ultrason"
                )
            
            st.markdown("#### 🔦 Capteur Laser")
            
            mode_laser = st.radio("Mode laser:", ["🤖 Automatique", "✋ Manuel"], horizontal=True)
            
            if mode_laser == "🤖 Automatique":
                if st.button("🔍 Détecter automatiquement (Laser)"):
                    # Simulation de détection laser plus précise
                    base_distance = ultrason_value if 'ultrason_value' in locals() else random.uniform(120, 200)
                    noise = random.uniform(-1, 1)  # Laser plus précis
                    laser_value = base_distance + noise
                    st.session_state.laser_auto = laser_value
                    st.success(f"🎯 Détection automatique : {laser_value:.1f} cm")
                
                laser_value = st.session_state.get('laser_auto', 148.0)
                st.info(f"� Valeur détectée : {laser_value:.1f} cm")
            else:
                laser_value = st.number_input(
                    "Distance laser (cm)",
                    min_value=10.0,
                    max_value=1000.0,
                    value=148.0,
                    step=1.0,
                    help="Saisie manuelle de la mesure laser"
                )
            
            # ========== MODÈLE DE DÉTECTION D'ARBRE ==========
            st.markdown("---")
            st.subheader("🌳 Modèle de Détection d'Arbre")
            
            # Calculs automatiques améliorés
            distance_moyenne = (ultrason_value + laser_value) / 2
            ecart_type = abs(ultrason_value - laser_value)
            
            # Validation des mesures
            precision_ok = ecart_type <= 5.0  # Écart acceptable de 5cm
            
            # Modèle de détection basé sur les capteurs
            col_model1, col_model2 = st.columns(2)
            
            with col_model1:
                st.markdown("##### 📊 Analyse des Distances")
                
                # Classification de la distance
                if distance_moyenne < 50:
                    distance_category = "🔴 Très proche"
                    tree_size_estimate = "Petit arbre ou obstacle"
                elif distance_moyenne < 100:
                    distance_category = "🟡 Proche"
                    tree_size_estimate = "Arbre moyen"
                elif distance_moyenne < 200:
                    distance_category = "🟢 Distance normale"
                    tree_size_estimate = "Arbre standard"
                else:
                    distance_category = "🔵 Distance éloignée"
                    tree_size_estimate = "Grand arbre ou terrain ouvert"
                
                st.write(f"**Catégorie :** {distance_category}")
                st.write(f"**Estimation :** {tree_size_estimate}")
                
                # Calcul de la fiabilité basée sur la cohérence des capteurs
                if ecart_type <= 2:
                    reliability = "🟢 Excellente"
                    reliability_score = 95
                elif ecart_type <= 5:
                    reliability = "🟡 Bonne"
                    reliability_score = 80
                elif ecart_type <= 10:
                    reliability = "🟠 Moyenne"
                    reliability_score = 65
                else:
                    reliability = "🔴 Faible"
                    reliability_score = 40
                
                st.write(f"**Fiabilité :** {reliability} ({reliability_score}%)")
            
            with col_model2:
                st.markdown("##### 🧠 Modèle IA Prédictif")
                
                # Simulation d'un modèle d'IA pour prédire les caractéristiques de l'arbre
                # Basé sur les données de distance
                
                # Estimation de la hauteur (formule empirique)
                if distance_moyenne < 100:
                    estimated_height = 2.5 + (distance_moyenne / 100) * 1.5
                else:
                    estimated_height = 3.0 + (distance_moyenne - 100) / 50
                
                # Estimation du diamètre du tronc
                estimated_diameter = max(20, distance_moyenne * 0.15)
                
                # Estimation de l'âge approximatif
                estimated_age = max(5, int(estimated_diameter * 2))
                
                # Probabilité de présence de fruits (basée sur la taille)
                if estimated_height > 2.5:
                    fruit_probability = min(90, int(estimated_height * 25))
                else:
                    fruit_probability = 20
                
                st.write(f"**Hauteur estimée :** {estimated_height:.1f} m")
                st.write(f"**Diamètre estimé :** {estimated_diameter:.0f} cm")
                st.write(f"**Âge approximatif :** {estimated_age} ans")
                st.write(f"**Probabilité fruits :** {fruit_probability}%")
                
                # Barre de progression pour la probabilité de fruits
                st.progress(fruit_probability / 100)
            
            # Alertes et recommandations du modèle
            st.markdown("---")
            st.subheader("⚠️ Alertes et Recommandations")
            
            alerts = []
            recommendations = []
            
            if ecart_type > 10:
                alerts.append("⚠️ Écart important entre capteurs - Vérifiez le positionnement")
                recommendations.append("🔧 Repositionnez les capteurs perpendiculairement au tronc")
            
            if distance_moyenne < 30:
                alerts.append("⚠️ Distance très faible détectée")
                recommendations.append("📏 Éloignez-vous ou vérifiez s'il y a un obstacle")
            
            if distance_moyenne > 300:
                alerts.append("⚠️ Distance très élevée - Possible absence d'obstacle")
                recommendations.append("🎯 Rapprochez-vous de l'arbre cible")
            
            if reliability_score < 70:
                alerts.append("⚠️ Fiabilité de mesure faible")
                recommendations.append("🔄 Répétez les mesures plusieurs fois")
            
            # Affichage des alertes
            if alerts:
                for alert in alerts:
                    st.warning(alert)
            else:
                st.success("✅ Toutes les mesures sont dans les paramètres normaux")
            
            # Affichage des recommandations
            if recommendations:
                with st.expander("💡 Recommandations", expanded=True):
                    for rec in recommendations:
                        st.info(rec)
            
            st.markdown("---")
            st.subheader("📊 Résultats de mesure")
            
            col_res1, col_res2, col_res3 = st.columns(3)
            
            with col_res1:
                st.metric("Distance Moyenne", f"{distance_moyenne:.1f} cm")
            
            with col_res2:
                st.metric("Écart entre capteurs", f"{ecart_type:.1f} cm")
            
            with col_res3:
                if precision_ok:
                    st.success("✅ Précision OK")
                else:
                    st.error("❌ Écart trop important")
            
            # ========== MODÈLE AVANCÉ DE MESURES MULTIPLES ==========
            st.markdown("---")
            st.subheader("🎯 Acquisition de Données Multiples")
            
            # Options d'acquisition
            col_acq1, col_acq2 = st.columns(2)
            
            with col_acq1:
                nb_mesures = st.slider("Nombre de mesures", 3, 20, 5)
                interval_mesures = st.selectbox("Intervalle", ["Rapide (1s)", "Normal (2s)", "Lent (5s)"])
            
            with col_acq2:
                mode_acquisition = st.radio("Mode d'acquisition:", 
                    ["🔄 Automatique", "📊 Avec analyse", "🧠 IA avancée"])
            
            if st.button("🚀 Lancer l'acquisition de données", type="primary"):
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                mesures_ultrason = []
                mesures_laser = []
                
                # Simulation d'acquisition en temps réel
                for i in range(nb_mesures):
                    status_text.text(f"Mesure {i+1}/{nb_mesures} en cours...")
                    progress_bar.progress((i + 1) / nb_mesures)
                    
                    # Simulation de variation réaliste avec tendance
                    variation_ultrason = np.random.normal(0, 2) + np.sin(i * 0.5) * 0.5
                    variation_laser = np.random.normal(0, 1) + np.sin(i * 0.5) * 0.3
                    
                    mesures_ultrason.append(ultrason_value + variation_ultrason)
                    mesures_laser.append(laser_value + variation_laser)
                    
                    # Simulation du délai
                    import time
                    time.sleep(0.2)  # Simulation rapide pour démo
                
                # Calculs statistiques avancés
                ultrason_moy = np.mean(mesures_ultrason)
                laser_moy = np.mean(mesures_laser)
                ultrason_std = np.std(mesures_ultrason)
                laser_std = np.std(mesures_laser)
                distance_finale = (ultrason_moy + laser_moy) / 2
                
                # Calcul de confiance basé sur la stabilité
                stability_score = max(0, 100 - (ultrason_std + laser_std) * 10)
                
                # Détection d'anomalies
                anomalies_ultrason = [i for i, val in enumerate(mesures_ultrason) 
                                    if abs(val - ultrason_moy) > 2 * ultrason_std]
                anomalies_laser = [i for i, val in enumerate(mesures_laser) 
                                 if abs(val - laser_moy) > 2 * laser_std]
                
                # Modèle de détection d'arbre basé sur les données multiples
                tree_detection_confidence = 0
                tree_characteristics = {}
                
                if mode_acquisition == "🧠 IA avancée":
                    # Simulation d'analyse IA avancée
                    
                    # Analyse de la stabilité pour détecter la présence d'un objet solide
                    if ultrason_std < 3 and laser_std < 2:
                        tree_detection_confidence = min(95, stability_score)
                        object_type = "🌳 Arbre détecté"
                    elif ultrason_std < 5:
                        tree_detection_confidence = min(75, stability_score)
                        object_type = "🪨 Obstacle détecté"
                    else:
                        tree_detection_confidence = 30
                        object_type = "❓ Objet indéterminé"
                    
                    # Estimation des caractéristiques de l'arbre
                    tree_characteristics = {
                        'type_objet': object_type,
                        'confiance_detection': tree_detection_confidence,
                        'distance_estimee': distance_finale,
                        'stabilite_mesure': stability_score,
                        'surface_estimee': "Lisse" if ultrason_std < 2 else "Rugueuse",
                        'taille_estimee': "Grande" if distance_finale > 150 else "Moyenne" if distance_finale > 80 else "Petite"
                    }
                
                # Sauvegarde des données enrichies
                st.session_state.sensor_data = {
                    'ultrason_individual': ultrason_value,
                    'laser_individual': laser_value,
                    'ultrason_multiple': mesures_ultrason,
                    'laser_multiple': mesures_laser,
                    'ultrason_moyenne': ultrason_moy,
                    'laser_moyenne': laser_moy,
                    'ultrason_std': ultrason_std,
                    'laser_std': laser_std,
                    'distance_finale': distance_finale,
                    'precision_ok': precision_ok,
                    'stability_score': stability_score,
                    'anomalies_ultrason': anomalies_ultrason,
                    'anomalies_laser': anomalies_laser,
                    'tree_detection_confidence': tree_detection_confidence,
                    'tree_characteristics': tree_characteristics,
                    'nb_mesures': nb_mesures,
                    'mode_acquisition': mode_acquisition,
                    'timestamp': datetime.now().isoformat()
                }
                
                status_text.text("✅ Acquisition terminée !")
                progress_bar.progress(1.0)
                
                # Affichage des résultats avancés
                st.success(f"✅ Distance finale calculée : **{distance_finale:.1f} cm** (Confiance: {stability_score:.0f}%)")
                
                # Résultats du modèle IA
                if mode_acquisition == "🧠 IA avancée":
                    st.markdown("### 🧠 Analyse IA - Détection d'Arbre")
                    
                    col_ia1, col_ia2, col_ia3 = st.columns(3)
                    
                    with col_ia1:
                        st.metric("🎯 Confiance Détection", f"{tree_detection_confidence:.0f}%")
                    
                    with col_ia2:
                        st.metric("📊 Stabilité Mesures", f"{stability_score:.0f}%")
                    
                    with col_ia3:
                        st.metric("🌳 Type d'Objet", tree_characteristics.get('type_objet', 'N/A'))
                    
                    # Détails de l'analyse
                    st.markdown("#### 📋 Caractéristiques Détectées")
                    for key, value in tree_characteristics.items():
                        if key != 'type_objet':
                            st.write(f"**{key.replace('_', ' ').title()} :** {value}")
                
                # Graphiques améliorés
                fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))
                
                # Graphique 1: Évolution des mesures
                ax1.plot(range(1, nb_mesures+1), mesures_ultrason, 'b-o', label='Ultrason', markersize=4)
                ax1.plot(range(1, nb_mesures+1), mesures_laser, 'r-o', label='Laser', markersize=4)
                ax1.axhline(y=distance_finale, color='g', linestyle='--', label='Moyenne finale')
                ax1.fill_between(range(1, nb_mesures+1), 
                               [ultrason_moy - ultrason_std] * nb_mesures,
                               [ultrason_moy + ultrason_std] * nb_mesures,
                               alpha=0.2, color='blue', label='Zone confiance ultrason')
                ax1.set_xlabel('Mesure #')
                ax1.set_ylabel('Distance (cm)')
                ax1.set_title('Évolution des Mesures')
                ax1.legend()
                ax1.grid(True, alpha=0.3)
                
                # Graphique 2: Comparaison des moyennes
                ax2.bar(['Ultrason', 'Laser', 'Finale'], 
                       [ultrason_moy, laser_moy, distance_finale],
                       color=['blue', 'red', 'green'],
                       alpha=0.7)
                ax2.set_ylabel('Distance (cm)')
                ax2.set_title('Comparaison des Moyennes')
                ax2.grid(True, alpha=0.3)
                
                # Graphique 3: Distribution des mesures
                ax3.hist(mesures_ultrason, bins=8, alpha=0.6, label='Ultrason', color='blue')
                ax3.hist(mesures_laser, bins=8, alpha=0.6, label='Laser', color='red')
                ax3.set_xlabel('Distance (cm)')
                ax3.set_ylabel('Fréquence')
                ax3.set_title('Distribution des Mesures')
                ax3.legend()
                
                # Graphique 4: Écarts par rapport à la moyenne
                ecarts_ultrason = [abs(m - ultrason_moy) for m in mesures_ultrason]
                ecarts_laser = [abs(m - laser_moy) for m in mesures_laser]
                ax4.plot(range(1, nb_mesures+1), ecarts_ultrason, 'b-o', label='Écarts Ultrason')
                ax4.plot(range(1, nb_mesures+1), ecarts_laser, 'r-o', label='Écarts Laser')
                ax4.set_xlabel('Mesure #')
                ax4.set_ylabel('Écart absolu (cm)')
                ax4.set_title('Analyse de la Précision')
                ax4.legend()
                ax4.grid(True, alpha=0.3)
                
                plt.tight_layout()
                st.pyplot(fig)
                
                # Détection d'anomalies
                if anomalies_ultrason or anomalies_laser:
                    st.warning("⚠️ Anomalies détectées dans les mesures")
                    if anomalies_ultrason:
                        st.write(f"🔵 Anomalies ultrason aux mesures : {[i+1 for i in anomalies_ultrason]}")
                    if anomalies_laser:
                        st.write(f"🔴 Anomalies laser aux mesures : {[i+1 for i in anomalies_laser]}")
                else:
                    st.success("✅ Aucune anomalie détectée - Mesures cohérentes")
                ax1.set_ylabel('Distance (cm)')
                ax1.set_title('Évolution des mesures')
                ax1.legend()
                ax1.grid(True)
                
                ax2.bar(['Ultrason', 'Laser', 'Finale'], 
                       [ultrason_moy, laser_moy, distance_finale],
                       color=['blue', 'red', 'green'])
                ax2.set_ylabel('Distance (cm)')
                ax2.set_title('Comparaison des moyennes')
                
                st.pyplot(fig)
        
        with col2:
            st.subheader("📋 Informations de session")
            st.write(f"**Arbre ID :** {st.session_state.tree_id}")
            st.write(f"**Type :** {st.session_state.tree_type_selection}")
            
            if st.session_state.sensor_data:
                data = st.session_state.sensor_data
                st.write(f"**Distance finale :** {data['distance_finale']:.1f} cm")
                st.write(f"**Précision :** {'✅ OK' if data['precision_ok'] else '❌ KO'}")
            
            st.markdown("---")
            st.subheader("🎛️ Paramètres avancés")
            
            # Calibration des capteurs
            with st.expander("Calibration capteurs"):
                ultrason_offset = st.number_input("Offset ultrason (cm)", value=0.0)
                laser_offset = st.number_input("Offset laser (cm)", value=0.0)
                
                if st.button("Appliquer calibration"):
                    st.info("Calibration appliquée !")
            
            # Conditions environnementales
            with st.expander("Conditions mesure"):
                temperature = st.slider("Température (°C)", -10, 40, 20)
                humidity = st.slider("Humidité (%)", 0, 100, 50)
                
                st.write(f"Correction temp: {temperature * 0.1:.1f}%")
        
        # Navigation
        st.markdown("---")
        col_nav1, col_nav2 = st.columns(2)
        
        with col_nav1:
            if st.button("⬅️ Retour Identification"):
                st.info("Retour au Module 1...")
        
        with col_nav2:
            if st.session_state.sensor_data and st.button("➡️ Détection Fruits", type="primary"):
                st.info("Passage au Module 3...")

# ==================== MODULE 3 : DÉTECTION FRUITS ====================

elif app_mode == "🍎 3. Détection Fruits":
    st.header("🍎 Module 3 : Détection et Analyse des Fruits")
    st.markdown("*Utilisation de l'IA YOLO pour la détection automatique des fruits*")
    
    # Vérifications préalables
    if not st.session_state.tree_id:
        st.error("⚠️ Arbre non identifié. Veuillez commencer par le Module 1.")
        st.stop()
    
    if not st.session_state.sensor_data:
        st.warning("⚠️ Mesures capteurs manquantes. Recommandé de passer par le Module 2.")
    
    st.success(f"🌳 Arbre : **{st.session_state.tree_id}** | 📏 Distance : **{st.session_state.sensor_data.get('distance_finale', 'N/A')} cm**")
    
    tab1, tab2, tab3 = st.tabs(["📷 Image Arbre", "🔍 Détection IA", "📊 Résultats"])
    
    with tab1:
        st.subheader("📷 Image de l'arbre complet")
        
        # Upload de l'image de l'arbre
        tree_image = st.file_uploader(
            "Téléchargez une photo complète de l'arbre",
            type=["jpg", "png", "jpeg"],
            help="Image haute résolution de l'arbre pour la détection des fruits"
        )
        
        if tree_image is not None:
            # Lecture et préparation de l'image
            file_bytes = np.asarray(bytearray(tree_image.read()), dtype=np.uint8)
            image = cv2.imdecode(file_bytes, 1)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Sauvegarde de l'image dans la session
            st.session_state.uploaded_tree_image = image_rgb
            
            # Affichage de l'image
            col1, col2 = st.columns([3, 1])
            
            with col1:
                st.image(image_rgb, caption="Image de l'arbre", use_column_width=True)
            
            with col2:
                st.markdown("### 📊 Info Image")
                height, width = image_rgb.shape[:2]
                st.write(f"**Dimensions :** {width} x {height}")
                st.write(f"**Ratio :** {width/height:.2f}")
                st.write(f"**Taille :** {len(file_bytes)/1024:.1f} KB")
                
                # Amélioration d'image optionnelle
                enhance_image = st.checkbox("Améliorer contraste")
                if enhance_image:
                    # Amélioration du contraste
                    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
                    l, a, b = cv2.split(lab)
                    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
                    l = clahe.apply(l)
                    enhanced = cv2.merge([l, a, b])
                    image_rgb = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
                    st.session_state.uploaded_tree_image = image_rgb
    
    with tab2:
        st.subheader("🔍 Détection automatique par IA")
        
        if st.session_state.uploaded_tree_image is not None:
            image_rgb = st.session_state.uploaded_tree_image
            
            # Paramètres de détection
            col1, col2, col3 = st.columns(3)
            
            with col1:
                confidence_threshold = st.slider("Seuil de confiance", 0.1, 0.9, 0.25, 0.05)
            
            with col2:
                iou_threshold = st.slider("Seuil IoU", 0.1, 0.9, 0.45, 0.05)
            
            with col3:
                image_size = st.selectbox("Taille d'analyse", [416, 640, 832], index=1)
            
            if st.button("🚀 Lancer la détection", type="primary"):
                if fruit_model is not None:
                    with st.spinner("🧠 Analyse IA en cours..."):
                        try:
                            # Sauvegarde temporaire de l'image
                            temp_path = "temp_tree_image.jpg"
                            cv2.imwrite(temp_path, cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR))
                            
                            # Détection YOLO
                            results = fruit_model.predict(
                                temp_path,
                                conf=confidence_threshold,
                                iou=iou_threshold,
                                imgsz=image_size,
                                augment=True,
                                verbose=False
                            )[0]
                            
                            # Classes potentiellement des fruits
                            fruit_classes = {
                                47: 'Pomme', 48: 'Orange', 49: 'Banane', 50: 'Fruit',
                                51: 'Carotte', 52: 'Brocoli', 53: 'Orange', 62: 'Chaise'
                            }
                            
                            detections = []
                            if results.boxes is not None:
                                for box in results.boxes:
                                    class_id = int(box.cls[0])
                                    conf = float(box.conf[0])
                                    xyxy = box.xyxy[0].tolist()
                                    
                                    # Classification personnalisée pour les fruits
                                    if class_id in fruit_classes or conf > 0.3:
                                        # Calcul de la taille en pixels
                                        width_px = xyxy[2] - xyxy[0]
                                        height_px = xyxy[3] - xyxy[1]
                                        area_px = width_px * height_px
                                        
                                        # Estimation de la taille réelle basée sur la distance
                                        if st.session_state.sensor_data:
                                            distance_cm = st.session_state.sensor_data['distance_finale']
                                            # Formule approximative : taille_réelle = (taille_pixel * distance) / focale_équivalente
                                            focale_equiv = 800  # pixels (approximation pour smartphone)
                                            size_real_cm = (width_px * distance_cm) / focale_equiv
                                        else:
                                            size_real_cm = width_px * 0.1  # Estimation grossière
                                        
                                        # Estimation du poids (formule empirique pour fruits sphériques)
                                        # Poids ≈ 4/3 * π * (rayon)³ * densité
                                        rayon_cm = size_real_cm / 2
                                        volume_cm3 = (4/3) * math.pi * (rayon_cm ** 3)
                                        densite_fruit = 0.8  # g/cm³ (approximation pour fruits)
                                        poids_g = volume_cm3 * densite_fruit
                                        
                                        detections.append({
                                            'class_id': class_id,
                                            'class_name': fruit_classes.get(class_id, 'Objet détecté'),
                                            'confidence': conf,
                                            'bbox': xyxy,
                                            'width_px': width_px,
                                            'height_px': height_px,
                                            'area_px': area_px,
                                            'size_real_cm': size_real_cm,
                                            'poids_g': poids_g
                                        })
                            
                            # Sauvegarde des résultats
                            st.session_state.detection_results = {
                                'detections': detections,
                                'total_fruits': len(detections),
                                'confidence_threshold': confidence_threshold,
                                'iou_threshold': iou_threshold,
                                'image_size': image_size,
                                'image_dimensions': image_rgb.shape[:2],
                                'timestamp': datetime.now().isoformat()
                            }
                            
                            if detections:
                                st.success(f"✅ Détection terminée ! {len(detections)} fruits détectés.")
                                
                                # Dessin des boîtes sur l'image
                                image_with_boxes = image_rgb.copy()
                                for det in detections:
                                    x1, y1, x2, y2 = map(int, det['bbox'])
                                    cv2.rectangle(image_with_boxes, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                    
                                    label = f"{det['class_name']} ({det['confidence']:.2f})"
                                    cv2.putText(image_with_boxes, label, (x1, y1-10),
                                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                                
                                st.image(image_with_boxes, caption="Fruits détectés", use_column_width=True)
                            else:
                                st.warning("⚠️ Aucun fruit détecté. Essayez d'ajuster les paramètres.")
                            
                            # Nettoyage
                            if os.path.exists(temp_path):
                                os.remove(temp_path)
                        
                        except Exception as e:
                            st.error(f"❌ Erreur lors de la détection : {str(e)}")
                else:
                    st.error("❌ Modèle YOLO non disponible")
        else:
            st.info("📷 Veuillez d'abord uploader une image dans l'onglet précédent.")
    
    with tab3:
        st.subheader("📊 Résultats détaillés")
        
        if st.session_state.detection_results:
            results = st.session_state.detection_results
            detections = results['detections']
            
            if detections:
                # Statistiques générales
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("🍎 Total Fruits", len(detections))
                
                with col2:
                    avg_conf = np.mean([d['confidence'] for d in detections])
                    st.metric("📊 Confiance Moy.", f"{avg_conf:.2f}")
                
                with col3:
                    total_weight = sum([d['poids_g'] for d in detections])
                    st.metric("⚖️ Poids Total", f"{total_weight:.0f}g")
                
                with col4:
                    avg_size = np.mean([d['size_real_cm'] for d in detections])
                    st.metric("📏 Taille Moy.", f"{avg_size:.1f}cm")
                
                # Tableau détaillé
                st.markdown("---")
                st.subheader("📋 Détail par fruit")
                
                df_detections = pd.DataFrame([
                    {
                        'ID': i+1,
                        'Type': det['class_name'],
                        'Confiance': f"{det['confidence']:.2f}",
                        'Taille (cm)': f"{det['size_real_cm']:.1f}",
                        'Poids (g)': f"{det['poids_g']:.0f}",
                        'Surface (px²)': f"{det['area_px']:.0f}"
                    }
                    for i, det in enumerate(detections)
                ])
                
                st.dataframe(df_detections, use_container_width=True)
                
                # Graphiques d'analyse
                st.markdown("---")
                st.subheader("📈 Analyses graphiques")
                
                fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 8))
                
                # Distribution des tailles
                sizes = [d['size_real_cm'] for d in detections]
                ax1.hist(sizes, bins=10, color='green', alpha=0.7)
                ax1.set_title('Distribution des tailles')
                ax1.set_xlabel('Taille (cm)')
                ax1.set_ylabel('Nombre de fruits')
                
                # Distribution des poids
                weights = [d['poids_g'] for d in detections]
                ax2.hist(weights, bins=10, color='orange', alpha=0.7)
                ax2.set_title('Distribution des poids')
                ax2.set_xlabel('Poids (g)')
                ax2.set_ylabel('Nombre de fruits')
                
                # Confiance vs Taille
                confidences = [d['confidence'] for d in detections]
                ax3.scatter(confidences, sizes, color='blue', alpha=0.6)
                ax3.set_title('Confiance vs Taille')
                ax3.set_xlabel('Confiance')
                ax3.set_ylabel('Taille (cm)')
                
                # Types de fruits
                class_counts = {}
                for det in detections:
                    name = det['class_name']
                    class_counts[name] = class_counts.get(name, 0) + 1
                
                ax4.pie(class_counts.values(), labels=class_counts.keys(), autopct='%1.1f%%')
                ax4.set_title('Répartition par type')
                
                plt.tight_layout()
                st.pyplot(fig)
                
            else:
                st.info("🔍 Aucune détection disponible.")
        else:
            st.info("🚀 Lancez d'abord une détection dans l'onglet précédent.")
        
# ==================== MODULE 4 : VALIDATION ====================

elif app_mode == "✅ 4. Validation":
    st.header("✅ Module 4 : Validation et Ajustements")
    st.markdown("*Vérification et correction des résultats par l'agriculteur*")
    
    # Vérifications préalables
    if not st.session_state.tree_id:
        st.error("⚠️ Aucun arbre identifié.")
        st.stop()
    
    if not st.session_state.detection_results:
        st.warning("⚠️ Aucune détection disponible. Veuillez d'abord passer par le Module 3.")
        st.stop()
    
    st.success(f"🌳 Validation pour l'arbre **{st.session_state.tree_id}**")
    
    tab1, tab2, tab3 = st.tabs(["🖼️ Ajustement Visuel", "📊 Correction Données", "💾 Préparation Export"])
    
    with tab1:
        st.subheader("🖼️ Interface de correction des détections")
        
        if st.session_state.uploaded_tree_image is not None and st.session_state.detection_results:
            image_rgb = st.session_state.uploaded_tree_image
            detections = st.session_state.detection_results['detections']
            
            # Interface de dessin avec streamlit-drawable-canvas
            st.markdown("**Instructions :** Vous pouvez redessiner les cadres de détection si nécessaire")
            
            # Préparer l'image avec les détections existantes
            height, width = image_rgb.shape[:2]
            
            # Création d'une image avec les boîtes existantes
            canvas_image = image_rgb.copy()
            for i, det in enumerate(detections):
                x1, y1, x2, y2 = map(int, det['bbox'])
                cv2.rectangle(canvas_image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(canvas_image, f"Fruit {i+1}", (x1, y1-10),
                          cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            col1, col2 = st.columns([3, 1])
            
            with col1:
                # Canvas interactif
                canvas_result = st_canvas(
                    fill_color="rgba(255, 165, 0, 0.3)",  # Orange avec transparence
                    stroke_width=3,
                    stroke_color="#00ff00",  # Vert
                    background_image=Image.fromarray(canvas_image),
                    update_streamlit=True,
                    height=400,
                    width=600,
                    drawing_mode="rect",
                    key="canvas",
                )
            
            with col2:
                st.markdown("### 🎨 Outils de correction")
                
                st.info("**Mode Rectangle** activé\nDessinez de nouveaux cadres pour corriger les détections")
                
                # Options de validation
                st.markdown("### ✅ Actions")
                
                if st.button("🔄 Réinitialiser Canvas"):
                    st.rerun()
                
                if st.button("💾 Sauvegarder Ajustements"):
                    if canvas_result.json_data is not None:
                        # Traitement des nouveaux rectangles dessinés
                        new_detections = []
                        
                        # Garder les détections originales
                        for det in detections:
                            new_detections.append(det.copy())
                        
                        # Ajouter les nouveaux rectangles
                        for obj in canvas_result.json_data["objects"]:
                            if obj["type"] == "rect":
                                # Conversion des coordonnées du canvas vers l'image originale
                                scale_x = width / 600
                                scale_y = height / 400
                                
                                x1 = obj["left"] * scale_x
                                y1 = obj["top"] * scale_y
                                x2 = (obj["left"] + obj["width"]) * scale_x
                                y2 = (obj["top"] + obj["height"]) * scale_y
                                
                                # Calculs pour le nouveau fruit
                                width_px = x2 - x1
                                height_px = y2 - y1
                                area_px = width_px * height_px
                                
                                if st.session_state.sensor_data:
                                    distance_cm = st.session_state.sensor_data['distance_finale']
                                    focale_equiv = 800
                                    size_real_cm = (width_px * distance_cm) / focale_equiv
                                else:
                                    size_real_cm = width_px * 0.1
                                
                                rayon_cm = size_real_cm / 2
                                volume_cm3 = (4/3) * math.pi * (rayon_cm ** 3)
                                densite_fruit = 0.8
                                poids_g = volume_cm3 * densite_fruit
                                
                                new_detection = {
                                    'class_id': 50,
                                    'class_name': 'Fruit ajouté',
                                    'confidence': 0.95,  # Confiance manuelle élevée
                                    'bbox': [x1, y1, x2, y2],
                                    'width_px': width_px,
                                    'height_px': height_px,
                                    'area_px': area_px,
                                    'size_real_cm': size_real_cm,
                                    'poids_g': poids_g,
                                    'manual': True
                                }
                                new_detections.append(new_detection)
                        
                        # Mise à jour des résultats
                        st.session_state.detection_results['detections'] = new_detections
                        st.session_state.detection_results['total_fruits'] = len(new_detections)
                        st.session_state.detection_results['manual_corrections'] = True
                        
                        st.success(f"✅ {len(new_detections)} détections sauvegardées !")
                
                # Statistiques actuelles
                st.markdown("### 📊 Statistiques")
                st.write(f"**Fruits détectés :** {len(detections)}")
                total_weight = sum([d['poids_g'] for d in detections])
                st.write(f"**Poids total :** {total_weight:.0f}g")
        else:
            st.warning("📷 Image ou détections manquantes.")
    
    with tab2:
        st.subheader("📊 Correction manuelle des données")
        
        if st.session_state.detection_results:
            detections = st.session_state.detection_results['detections']
            
            # Résumé des mesures
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.markdown("### 🌳 Données Arbre")
                tree_height = st.number_input("Hauteur arbre (m)", value=3.5, min_value=0.5, max_value=50.0, step=0.1)
                tree_width = st.number_input("Largeur arbre (m)", value=2.8, min_value=0.5, max_value=20.0, step=0.1)
            
            with col2:
                st.markdown("### 📏 Données Capteurs")
                if st.session_state.sensor_data:
                    sensor_dist = st.session_state.sensor_data['distance_finale']
                    st.write(f"**Distance :** {sensor_dist:.1f} cm")
                    corrected_distance = st.number_input("Distance corrigée (cm)", value=sensor_dist, min_value=10.0, max_value=1000.0)
                else:
                    corrected_distance = st.number_input("Distance (cm)", value=150.0, min_value=10.0, max_value=1000.0)
            
            with col3:
                st.markdown("### 🍎 Données Fruits")
                manual_fruit_count = st.number_input("Nombre de fruits (manuel)", value=len(detections), min_value=0, max_value=1000)
                avg_fruit_weight = st.number_input("Poids moyen par fruit (g)", value=120.0, min_value=10.0, max_value=1000.0)
            
            # Paramètres environnementaux
            st.markdown("---")
            st.subheader("🌡️ Conditions environnementales")
            
            col_env1, col_env2, col_env3, col_env4 = st.columns(4)
            
            with col_env1:
                temperature = st.number_input("Température (°C)", value=22.0, min_value=-10.0, max_value=50.0)
            
            with col_env2:
                humidity = st.slider("Humidité (%)", 0, 100, 60)
            
            with col_env3:
                wind_speed = st.slider("Vent (km/h)", 0, 50, 5)
            
            with col_env4:
                light_condition = st.selectbox("Luminosité", ["Ensoleillé", "Nuageux", "Ombragé"])
            
            # Qualité de l'évaluation
            st.markdown("---")
            st.subheader("⭐ Évaluation de la qualité")
            
            col_qual1, col_qual2 = st.columns(2)
            
            with col_qual1:
                detection_quality = st.select_slider(
                    "Qualité de la détection",
                    options=["Mauvaise", "Moyenne", "Bonne", "Excellente"],
                    value="Bonne"
                )
            
            with col_qual2:
                confidence_level = st.select_slider(
                    "Niveau de confiance",
                    options=["Faible", "Moyen", "Élevé", "Très élevé"],
                    value="Élevé"
                )
            
            # Commentaires
            comments = st.text_area(
                "Commentaires et observations",
                placeholder="Notez ici toute observation particulière sur l'arbre, les conditions de mesure, ou les ajustements effectués..."
            )
            
            # Sauvegarde des données de validation
            if st.button("💾 Sauvegarder les corrections", type="primary"):
                validation_data = {
                    'tree_measurements': {
                        'height_m': tree_height,
                        'width_m': tree_width,
                        'corrected_distance_cm': corrected_distance
                    },
                    'fruit_data': {
                        'manual_count': manual_fruit_count,
                        'avg_weight_g': avg_fruit_weight,
                        'total_weight_estimated_g': manual_fruit_count * avg_fruit_weight
                    },
                    'environmental_conditions': {
                        'temperature_c': temperature,
                        'humidity_percent': humidity,
                        'wind_speed_kmh': wind_speed,
                        'light_condition': light_condition
                    },
                    'quality_assessment': {
                        'detection_quality': detection_quality,
                        'confidence_level': confidence_level,
                        'comments': comments
                    },
                    'validation_timestamp': datetime.now().isoformat(),
                    'validator': "Agriculteur"  # Pourrait être un nom d'utilisateur
                }
                
                st.session_state.validation_data = validation_data
                st.success("✅ Données de validation sauvegardées !")
        else:
            st.warning("📊 Aucune donnée de détection disponible.")
    
    with tab3:
        st.subheader("💾 Préparation des données finales")
        
        if st.session_state.validation_data:
            st.success("✅ Données de validation disponibles")
            
            # Préparation du résumé final
            final_summary = {
                'session_info': {
                    'tree_id': st.session_state.tree_id,
                    'analysis_date': datetime.now().isoformat(),
                    'session_duration': 'N/A'  # Pourrait être calculé
                },
                'tree_identification': st.session_state.tree_info,
                'sensor_measurements': st.session_state.sensor_data,
                'ai_detection': st.session_state.detection_results,
                'validation_corrections': st.session_state.validation_data
            }
            
            # Calculs de résumé
            if st.session_state.detection_results and st.session_state.validation_data:
                ai_count = len(st.session_state.detection_results['detections'])
                manual_count = st.session_state.validation_data['fruit_data']['manual_count']
                
                col_summary1, col_summary2, col_summary3 = st.columns(3)
                
                with col_summary1:
                    st.metric("🤖 Détection IA", f"{ai_count} fruits")
                
                with col_summary2:
                    st.metric("👨‍🌾 Validation manuelle", f"{manual_count} fruits")
                
                with col_summary3:
                    difference = abs(ai_count - manual_count)
                    st.metric("📊 Différence", f"{difference} fruits")
            
            # Affichage du résumé
            st.markdown("---")
            st.subheader("📋 Résumé de la session")
            
            with st.expander("Voir le résumé complet", expanded=True):
                st.json(final_summary)
            
            # Sauvegarde des données finales
            if st.button("💾 Finaliser et préparer l'export", type="primary"):
                st.session_state.final_results = final_summary
                st.success("✅ Session finalisée ! Vous pouvez maintenant procéder à l'enregistrement.")
                
                # Génération d'un rapport texte
                report_text = f"""
RAPPORT D'ANALYSE ARBORICOLE - ArborVision
==========================================

🌳 INFORMATIONS GÉNÉRALES
• ID Arbre: {st.session_state.tree_id}
• Date d'analyse: {datetime.now().strftime('%d/%m/%Y %H:%M')}
• Type d'arbre: {st.session_state.tree_info.get('tree_type', 'Non spécifié')}

📏 MESURES PHYSIQUES
• Hauteur: {st.session_state.validation_data['tree_measurements']['height_m']:.1f} m
• Largeur: {st.session_state.validation_data['tree_measurements']['width_m']:.1f} m
• Distance de mesure: {st.session_state.validation_data['tree_measurements']['corrected_distance_cm']:.0f} cm

🍎 ANALYSE DES FRUITS
• Nombre détecté (IA): {len(st.session_state.detection_results['detections'])} fruits
• Nombre validé (Manuel): {st.session_state.validation_data['fruit_data']['manual_count']} fruits
• Poids total estimé: {st.session_state.validation_data['fruit_data']['total_weight_estimated_g']:.0f} g

🌡️ CONDITIONS ENVIRONNEMENTALES
• Température: {st.session_state.validation_data['environmental_conditions']['temperature_c']}°C
• Humidité: {st.session_state.validation_data['environmental_conditions']['humidity_percent']}%
• Vent: {st.session_state.validation_data['environmental_conditions']['wind_speed_kmh']} km/h
• Luminosité: {st.session_state.validation_data['environmental_conditions']['light_condition']}

⭐ ÉVALUATION QUALITÉ
• Qualité détection: {st.session_state.validation_data['quality_assessment']['detection_quality']}
• Niveau de confiance: {st.session_state.validation_data['quality_assessment']['confidence_level']}

📝 COMMENTAIRES
{st.session_state.validation_data['quality_assessment']['comments']}

---
Rapport généré par ArborVision v3.0
"""
                st.text_area("📄 Aperçu du rapport", report_text, height=300)
        else:
            st.info("💾 Veuillez d'abord sauvegarder les corrections dans l'onglet précédent.")
        
        # Navigation
        st.markdown("---")
        col_nav1, col_nav2 = st.columns(2)
        
        with col_nav1:
            if st.button("⬅️ Retour Détection"):
                st.info("Retour au Module 3...")
        
        with col_nav2:
            if st.session_state.final_results and st.button("➡️ Enregistrement Final", type="primary"):
                st.info("Passage au Module 5...")

# ==================== MODULE 5 : ENREGISTREMENT FINAL ====================

elif app_mode == "💾 5. Enregistrement Final":
    st.header("💾 Module 5 : Enregistrement et Export des Données")
    
    # Message différent selon le type d'arbre
    if st.session_state.tree_type_selection == "existing":
        st.markdown("*Mise à jour des données d'un arbre existant dans la base Excel*")
    else:
        st.markdown("*Ajout d'un nouvel arbre dans la base Excel*")
    
    if not st.session_state.final_results:
        st.error("⚠️ Aucune donnée finale disponible. Veuillez finaliser la validation dans le Module 4.")
        st.stop()
    
    st.success(f"🌳 Export des données pour l'arbre **{st.session_state.tree_id}**")
    
    tab1, tab2, tab3, tab4 = st.tabs(["💾 Sauvegarde Excel", "📊 Export Formats", "📈 Rapports", "🔄 Fin de Session"])
    
    with tab1:
        st.subheader("💾 Sauvegarde automatique dans Excel")
        
        # Affichage du statut
        if st.session_state.tree_type_selection == "existing":
            st.info(f"🔄 **Mise à jour** de l'arbre {st.session_state.tree_id} dans la base de données")
        else:
            st.info(f"🆕 **Ajout** du nouvel arbre {st.session_state.tree_id} dans la base de données")
        
        # Préparation des données pour l'export
        export_data = st.session_state.final_results
        
        # Ajout de métadonnées d'export
        export_data['export_info'] = {
            'export_timestamp': datetime.now().isoformat(),
            'export_version': '3.0',
            'data_format': 'ArborVision_Standard',
            'tree_type_selection': st.session_state.tree_type_selection,
            'checksum': hash(str(export_data))
        }
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("### 📊 Résumé des données à enregistrer")
            
            # Résumé des données
            summary_data = {
                "ID Arbre": st.session_state.tree_id,
                "Type d'analyse": "Mise à jour" if st.session_state.tree_type_selection == "existing" else "Nouveau",
                "Type d'arbre": export_data.get('tree_identification', {}).get('tree_type', 'Non spécifié'),
                "Hauteur (m)": export_data.get('validation_corrections', {}).get('tree_measurements', {}).get('height_m', 0),
                "Largeur (m)": export_data.get('validation_corrections', {}).get('tree_measurements', {}).get('width_m', 0),
                "Fruits comptés": export_data.get('validation_corrections', {}).get('fruit_data', {}).get('manual_count', 0),
                "Poids total (g)": export_data.get('validation_corrections', {}).get('fruit_data', {}).get('total_weight_estimated_g', 0),
                "Distance (cm)": export_data.get('validation_corrections', {}).get('tree_measurements', {}).get('corrected_distance_cm', 0)
            }
            
            for key, value in summary_data.items():
                st.write(f"**{key} :** {value}")
        
        with col2:
            st.markdown("### 🔧 Options de sauvegarde")
            
            # Options de sauvegarde
            create_backup = st.checkbox("Créer une sauvegarde avant modification", value=True)
            add_timestamp = st.checkbox("Ajouter horodatage aux fichiers", value=True)
            
            # Nom du fichier Excel
            excel_filename = st.text_input(
                "Nom du fichier Excel",
                value="arbres_database.xlsx",
                help="Le fichier sera créé s'il n'existe pas"
            )
        
        # Bouton de sauvegarde Excel
        st.markdown("---")
        if st.button("💾 Enregistrer dans Excel", type="primary"):
            try:
                with st.spinner("💾 Enregistrement en cours..."):
                    # Sauvegarde Excel
                    saved_file = save_to_excel(export_data, st.session_state.tree_id)
                    
                    if saved_file:
                        st.success(f"✅ Données enregistrées avec succès dans {saved_file} !")
                        
                        # Mise à jour de la base de données en session
                        st.session_state.existing_trees_data = load_existing_trees_from_excel()
                        
                        # Affichage du statut de la sauvegarde
                        if st.session_state.tree_type_selection == "existing":
                            st.info("🔄 Arbre existant mis à jour avec les nouvelles données")
                        else:
                            st.info("🆕 Nouvel arbre ajouté à la base de données")
                        
                        # Statistiques de la base
                        total_trees = len(st.session_state.existing_trees_data)
                        st.metric("🌳 Total d'arbres en base", total_trees)
                        
                        # Option d'export du fichier Excel
                        try:
                            with open(saved_file, "rb") as file:
                                excel_data = file.read()
                            
                            st.download_button(
                                label="📥 Télécharger le fichier Excel",
                                data=excel_data,
                                file_name=saved_file,
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            )
                        except:
                            st.warning("⚠️ Le téléchargement direct n'est pas disponible, mais le fichier a été sauvegardé localement.")
                    
                    else:
                        st.error("❌ Erreur lors de la sauvegarde Excel")
                
            except Exception as e:
                st.error(f"❌ Erreur lors de l'enregistrement : {str(e)}")
        
        # Aperçu de la base de données mise à jour
        st.markdown("---")
        st.subheader("📊 Aperçu de la base de données")
        
        if st.session_state.existing_trees_data:
            # Affichage du tableau des arbres
            trees_for_display = []
            for tree_id, data in st.session_state.existing_trees_data.items():
                trees_for_display.append({
                    'ID': tree_id,
                    'Type': data.get('tree_type', 'N/A'),
                    'Dernière analyse': data.get('last_analysis', 'N/A'),
                    'Fruits': data.get('total_fruits_last', 0),
                    'Poids (g)': data.get('total_weight_last', 0),
                    'Hauteur (m)': data.get('height_m', 0),
                    'Largeur (m)': data.get('width_m', 0)
                })
            
            df_trees = pd.DataFrame(trees_for_display)
            st.dataframe(df_trees, use_container_width=True)
            
            # Statistiques générales
            col_stat1, col_stat2, col_stat3, col_stat4 = st.columns(4)
            
            with col_stat1:
                st.metric("🌳 Total arbres", len(trees_for_display))
            
            with col_stat2:
                total_fruits = sum([tree.get('total_fruits_last', 0) for tree in st.session_state.existing_trees_data.values()])
                st.metric("🍎 Total fruits", total_fruits)
            
            with col_stat3:
                total_weight = sum([tree.get('total_weight_last', 0) for tree in st.session_state.existing_trees_data.values()])
                st.metric("⚖️ Poids total (kg)", f"{total_weight/1000:.1f}")
            
            with col_stat4:
                analyzed_today = len([tree for tree in st.session_state.existing_trees_data.values() 
                                    if tree.get('last_analysis', '').startswith(datetime.now().strftime('%Y-%m-%d'))])
                st.metric("📅 Analysés aujourd'hui", analyzed_today)
    
    with tab2:
        st.subheader("📊 Export vers différents formats")
        
        # Export CSV détaillé
        st.markdown("### 📋 Export CSV détaillé")
        
        if st.button("📊 Générer CSV détaillé"):
            try:
                # Création d'un CSV avec une ligne par fruit détecté
                fruits_data = []
                
                if st.session_state.detection_results:
                    for i, detection in enumerate(st.session_state.detection_results['detections']):
                        fruit_row = {
                            'tree_id': st.session_state.tree_id,
                            'fruit_id': i + 1,
                            'class_name': detection.get('class_name', 'Unknown'),
                            'confidence': detection.get('confidence', 0),
                            'size_real_cm': detection.get('size_real_cm', 0),
                            'weight_g': detection.get('poids_g', 0),
                            'bbox_x1': detection.get('bbox', [0,0,0,0])[0],
                            'bbox_y1': detection.get('bbox', [0,0,0,0])[1],
                            'bbox_x2': detection.get('bbox', [0,0,0,0])[2],
                            'bbox_y2': detection.get('bbox', [0,0,0,0])[3],
                            'is_manual': detection.get('manual', False)
                        }
                        fruits_data.append(fruit_row)
                
                if fruits_data:
                    df_fruits = pd.DataFrame(fruits_data)
                    csv_detailed = f"fruits_detail_{st.session_state.tree_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                    df_fruits.to_csv(csv_detailed, index=False, encoding='utf-8')
                    
                    st.success(f"✅ CSV détaillé créé : {csv_detailed}")
                    st.dataframe(df_fruits)
                    
                    # Bouton de téléchargement
                    csv_data = df_fruits.to_csv(index=False, encoding='utf-8')
                    st.download_button(
                        label="📥 Télécharger CSV détaillé",
                        data=csv_data,
                        file_name=csv_detailed,
                        mime="text/csv"
                    )
                else:
                    st.warning("⚠️ Aucune donnée de fruits à exporter")
            
            except Exception as e:
                st.error(f"❌ Erreur : {str(e)}")
        
        # Export JSON structuré
        st.markdown("---")
        st.markdown("### 🗂️ Export JSON pour interface web")
        
        if st.button("📄 Générer JSON pour interface web"):
            try:
                # Format optimisé pour l'interface web
                web_format = {
                    "metadata": {
                        "version": "3.0",
                        "timestamp": datetime.now().isoformat(),
                        "source": "ArborVision",
                        "tree_type_analysis": st.session_state.tree_type_selection
                    },
                    "tree": {
                        "id": st.session_state.tree_id,
                        "type": st.session_state.tree_info.get('tree_type'),
                        "coordinates": st.session_state.tree_info.get('coordinates'),
                        "measurements": {
                            "height_m": st.session_state.validation_data.get('tree_measurements', {}).get('height_m'),
                            "width_m": st.session_state.validation_data.get('tree_measurements', {}).get('width_m'),
                            "distance_cm": st.session_state.validation_data.get('tree_measurements', {}).get('corrected_distance_cm')
                        }
                    },
                    "analysis": {
                        "fruits": {
                            "total_count": st.session_state.validation_data.get('fruit_data', {}).get('manual_count'),
                            "total_weight_g": st.session_state.validation_data.get('fruit_data', {}).get('total_weight_estimated_g'),
                            "avg_weight_g": st.session_state.validation_data.get('fruit_data', {}).get('avg_weight_g'),
                            "detection_method": "AI + Manual_Validation",
                            "ai_detected_count": len(st.session_state.detection_results.get('detections', []))
                        },
                        "environmental": {
                            "temperature_c": st.session_state.validation_data.get('environmental_conditions', {}).get('temperature_c'),
                            "humidity_percent": st.session_state.validation_data.get('environmental_conditions', {}).get('humidity_percent'),
                            "wind_speed_kmh": st.session_state.validation_data.get('environmental_conditions', {}).get('wind_speed_kmh'),
                            "light_condition": st.session_state.validation_data.get('environmental_conditions', {}).get('light_condition')
                        },
                        "quality_metrics": {
                            "detection_quality": st.session_state.validation_data.get('quality_assessment', {}).get('detection_quality'),
                            "confidence_level": st.session_state.validation_data.get('quality_assessment', {}).get('confidence_level'),
                            "comments": st.session_state.validation_data.get('quality_assessment', {}).get('comments')
                        }
                    },
                    "session_info": {
                        "analysis_date": datetime.now().strftime('%Y-%m-%d'),
                        "analysis_time": datetime.now().strftime('%H:%M:%S'),
                        "session_duration": "N/A",
                        "operator": "ArborVision_User"
                    }
                }
                
                json_web = f"web_export_{st.session_state.tree_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                
                st.success(f"✅ JSON web créé : {json_web}")
                st.json(web_format)
                
                # Bouton de téléchargement
                json_data = json.dumps(web_format, indent=2, ensure_ascii=False)
                st.download_button(
                    label="📥 Télécharger JSON Web",
                    data=json_data,
                    file_name=json_web,
                    mime="application/json"
                )
            
            except Exception as e:
                st.error(f"❌ Erreur : {str(e)}")
    
    with tab3:
        st.subheader("📈 Génération de rapports")
        
        # Rapport PDF (simulation)
        st.markdown("### 📄 Rapport détaillé")
        
        if st.button("📋 Générer rapport détaillé"):
            try:
                # Rapport spécialisé selon le type d'arbre
                if st.session_state.tree_type_selection == "existing":
                    rapport_titre = "RAPPORT DE MISE À JOUR ARBORICOLE"
                    rapport_type = "Mise à jour d'arbre existant"
                else:
                    rapport_titre = "RAPPORT D'ANALYSE ARBORICOLE - NOUVEL ARBRE"
                    rapport_type = "Première analyse"
                
                # Création d'un rapport complet
                report_content = f"""
{rapport_titre}
{'='*len(rapport_titre)}

📊 MÉTADONNÉES DE SESSION
• Date d'analyse : {datetime.now().strftime('%d/%m/%Y à %H:%M:%S')}
• Type d'analyse : {rapport_type}
• Version ArborVision : 3.0
• ID de session : {hash(str(st.session_state.tree_id))}

🌳 IDENTIFICATION DE L'ARBRE
• ID Arbre : {st.session_state.tree_id}
• Type d'arbre : {st.session_state.tree_info.get('tree_type', 'Non spécifié')}
• Coordonnées GPS : {st.session_state.tree_info.get('coordinates', 'Non spécifiées')}
• Statut : {"Arbre existant - mise à jour" if st.session_state.tree_type_selection == "existing" else "Nouvel arbre - première analyse"}

📏 MESURES PHYSIQUES
• Hauteur totale : {st.session_state.validation_data.get('tree_measurements', {}).get('height_m', 'N/A')} m
• Largeur de la couronne : {st.session_state.validation_data.get('tree_measurements', {}).get('width_m', 'N/A')} m
• Distance de mesure : {st.session_state.validation_data.get('tree_measurements', {}).get('corrected_distance_cm', 'N/A')} cm

🔬 ANALYSE DES CAPTEURS
• Capteur ultrason : {st.session_state.sensor_data.get('ultrason_moyenne', 'N/A')} cm
• Capteur laser : {st.session_state.sensor_data.get('laser_moyenne', 'N/A')} cm
• Distance finale calculée : {st.session_state.sensor_data.get('distance_finale', 'N/A')} cm
• Précision des mesures : {'✅ Conforme' if st.session_state.sensor_data.get('precision_ok') else '⚠️ À vérifier'}

🍎 DÉTECTION ET COMPTAGE DES FRUITS
• Méthode de détection : Intelligence Artificielle (YOLO v8) + Validation manuelle
• Fruits détectés par IA : {len(st.session_state.detection_results.get('detections', []))}
• Fruits validés manuellement : {st.session_state.validation_data.get('fruit_data', {}).get('manual_count', 'N/A')}
• Poids moyen par fruit : {st.session_state.validation_data.get('fruit_data', {}).get('avg_weight_g', 'N/A')} g
• Poids total estimé : {st.session_state.validation_data.get('fruit_data', {}).get('total_weight_estimated_g', 'N/A')} g

🌡️ CONDITIONS ENVIRONNEMENTALES
• Température ambiante : {st.session_state.validation_data.get('environmental_conditions', {}).get('temperature_c', 'N/A')}°C
• Humidité relative : {st.session_state.validation_data.get('environmental_conditions', {}).get('humidity_percent', 'N/A')}%
• Vitesse du vent : {st.session_state.validation_data.get('environmental_conditions', {}).get('wind_speed_kmh', 'N/A')} km/h
• Conditions lumineuses : {st.session_state.validation_data.get('environmental_conditions', {}).get('light_condition', 'N/A')}

⭐ ÉVALUATION DE LA QUALITÉ
• Qualité de la détection : {st.session_state.validation_data.get('quality_assessment', {}).get('detection_quality', 'N/A')}
• Niveau de confiance : {st.session_state.validation_data.get('quality_assessment', {}).get('confidence_level', 'N/A')}

📝 COMMENTAIRES ET OBSERVATIONS
{st.session_state.validation_data.get('quality_assessment', {}).get('comments', 'Aucun commentaire spécifique.')}

🔧 PARAMÈTRES TECHNIQUES
• Seuil de confiance IA : {st.session_state.detection_results.get('confidence_threshold', 'N/A')}
• Seuil IoU : {st.session_state.detection_results.get('iou_threshold', 'N/A')}
• Taille d'analyse : {st.session_state.detection_results.get('image_size', 'N/A')} pixels
• Corrections manuelles : {'Oui' if st.session_state.detection_results.get('manual_corrections') else 'Non'}

📈 RECOMMANDATIONS
• Fréquence de suivi recommandée : Mensuelle en période de croissance
• Prochaine analyse suggérée : {(datetime.now() + pd.Timedelta(days=30)).strftime('%d/%m/%Y')}
• Points d'attention : Surveillance de l'évolution du nombre de fruits

💾 SAUVEGARDE ET TRAÇABILITÉ
• Fichier Excel : arbres_database.xlsx
• Statut sauvegarde : {"Arbre mis à jour" if st.session_state.tree_type_selection == "existing" else "Nouvel arbre ajouté"}
• Horodatage : {datetime.now().isoformat()}

---
Rapport généré automatiquement par ArborVision v3.0
Système d'analyse arboricole intelligent
© 2024 - Tous droits réservés
                """
                
                # Sauvegarde du rapport
                report_filename = f"rapport_arbre_{st.session_state.tree_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
                
                st.success(f"✅ Rapport créé : {report_filename}")
                st.text_area("📄 Aperçu du rapport", report_content, height=400)
                
                # Bouton de téléchargement
                st.download_button(
                    label="📥 Télécharger le rapport",
                    data=report_content,
                    file_name=report_filename,
                    mime="text/plain"
                )
            
            except Exception as e:
                st.error(f"❌ Erreur lors de la génération : {str(e)}")
        
        # Statistiques comparatives pour arbres existants
        if st.session_state.tree_type_selection == "existing" and st.session_state.tree_info.get('previous_data'):
            st.markdown("---")
            st.markdown("### 📊 Comparaison avec la dernière analyse")
            
            prev_data = st.session_state.tree_info['previous_data']
            current_fruits = st.session_state.validation_data.get('fruit_data', {}).get('manual_count', 0)
            prev_fruits = prev_data.get('total_fruits_last', 0)
            
            current_weight = st.session_state.validation_data.get('fruit_data', {}).get('total_weight_estimated_g', 0)
            prev_weight = prev_data.get('total_weight_last', 0)
            
            col_comp1, col_comp2, col_comp3 = st.columns(3)
            
            with col_comp1:
                fruit_diff = current_fruits - prev_fruits
                st.metric(
                    "🍎 Évolution fruits",
                    current_fruits,
                    f"{fruit_diff:+d}" if fruit_diff != 0 else "Stable"
                )
            
            with col_comp2:
                weight_diff = current_weight - prev_weight
                st.metric(
                    "⚖️ Évolution poids (g)",
                    f"{current_weight:.0f}",
                    f"{weight_diff:+.0f}" if weight_diff != 0 else "Stable"
                )
            
            with col_comp3:
                # Calcul de l'évolution en pourcentage
                if prev_fruits > 0:
                    evolution_pct = ((current_fruits - prev_fruits) / prev_fruits) * 100
                    st.metric(
                        "📈 Évolution (%)",
                        f"{evolution_pct:+.1f}%",
                        "Croissance" if evolution_pct > 0 else "Décroissance" if evolution_pct < 0 else "Stable"
                    )
                else:
                    st.metric("📈 Évolution (%)", "N/A", "Première mesure")
    
    with tab4:
        st.subheader("🔄 Fin de session et nouvelle analyse")
        
        # Résumé de ce qui a été accompli
        st.markdown("### ✅ Résumé de la session")
        
        col_summary1, col_summary2 = st.columns(2)
        
        with col_summary1:
            st.markdown("**🎯 Étapes accomplies :**")
            steps_completed = [
                ("Sélection type d'arbre", st.session_state.tree_type_selection is not None),
                ("Identification arbre", st.session_state.tree_id is not None),
                ("Mesures capteurs", bool(st.session_state.sensor_data)),
                ("Détection fruits", bool(st.session_state.detection_results)),
                ("Validation données", bool(st.session_state.validation_data)),
                ("Finalisation", bool(st.session_state.final_results))
            ]
            
            for step, completed in steps_completed:
                icon = "✅" if completed else "❌"
                st.write(f"{icon} {step}")
        
        with col_summary2:
            st.markdown("**📊 Données collectées :**")
            if st.session_state.validation_data:
                st.write(f"🌳 **Arbre :** {st.session_state.tree_id}")
                st.write(f"📏 **Hauteur :** {st.session_state.validation_data.get('tree_measurements', {}).get('height_m', 'N/A')} m")
                st.write(f"🍎 **Fruits :** {st.session_state.validation_data.get('fruit_data', {}).get('manual_count', 0)}")
                st.write(f"⚖️ **Poids :** {st.session_state.validation_data.get('fruit_data', {}).get('total_weight_estimated_g', 0):.0f} g")
                st.write(f"⭐ **Qualité :** {st.session_state.validation_data.get('quality_assessment', {}).get('detection_quality', 'N/A')}")
        
        st.markdown("---")
        
        # Options de fin de session
        st.markdown("### 🚀 Prochaines actions")
        
        col_action1, col_action2, col_action3 = st.columns(3)
        
        with col_action1:
            st.markdown("#### 🔄 Nouvelle analyse")
            st.info("Analyser un autre arbre avec une nouvelle session complète")
            if st.button("🆕 Nouvelle Analyse Complète", type="primary"):
                # Réinitialisation complète
                keys_to_reset = [
                    'tree_type_selection', 'tree_id', 'tree_info', 'sensor_data',
                    'detection_results', 'validation_data', 'uploaded_tree_image', 'final_results'
                ]
                for key in keys_to_reset:
                    if key in st.session_state:
                        del st.session_state[key]
                
                st.success("✅ Session réinitialisée ! Redirection vers la sélection...")
                st.balloons()
                st.rerun()
        
        with col_action2:
            st.markdown("#### 📊 Voir la base")
            st.info("Consulter tous les arbres enregistrés")
            if st.button("📋 Consulter Base Excel"):
                if st.session_state.existing_trees_data:
                    st.info(f"📊 {len(st.session_state.existing_trees_data)} arbres dans la base de données")
                    # Affichage du tableau complet
                    trees_display = []
                    for tree_id, data in st.session_state.existing_trees_data.items():
                        trees_display.append({
                            'ID': tree_id,
                            'Type': data.get('tree_type', 'N/A'),
                            'Dernière analyse': data.get('last_analysis', 'N/A'),
                            'Fruits': data.get('total_fruits_last', 0),
                            'Poids (g)': data.get('total_weight_last', 0),
                            'Hauteur (m)': data.get('height_m', 0)
                        })
                    
                    df_all_trees = pd.DataFrame(trees_display)
                    st.dataframe(df_all_trees, use_container_width=True)
                else:
                    st.warning("Aucune donnée disponible")
        
        with col_action3:
            st.markdown("#### 🔧 Paramètres")
            st.info("Réinitialiser ou configurer l'application")
            
            if st.button("⚙️ Réinitialiser Tout"):
                # Réinitialisation complète incluant la base de données
                for key in list(st.session_state.keys()):
                    del st.session_state[key]
                st.warning("🔄 Application complètement réinitialisée")
                st.rerun()
        
        # Message de fin
        st.markdown("---")
        st.success("""
        🎉 **Session terminée avec succès !**
        
        Vos données ont été sauvegardées dans le fichier Excel et sont disponibles pour l'interface web.
        Vous pouvez maintenant fermer l'application ou commencer une nouvelle analyse.
        
        **Merci d'avoir utilisé ArborVision ! 🌳**
        """)
        
        # Informations de contact et support
        with st.expander("ℹ️ Support et informations"):
            st.markdown("""
            **📞 Support technique :**
            - Documentation : README.md
            - Logs d'erreur : Fichiers automatiquement générés
            - Sauvegarde : arbres_database.xlsx
            
            **🔧 Fichiers générés :**
            - `arbres_database.xlsx` : Base de données principale
            - `rapport_arbre_[ID]_[timestamp].txt` : Rapports détaillés
            - `web_export_[ID]_[timestamp].json` : Données pour interface web
            
            **🌐 Compatibilité interface web :**
            - Les fichiers JSON générés sont prêts pour import
            - Format standardisé ArborVision v3.0
            - Métadonnées complètes incluses
            """)
    
    # Bouton de navigation rapide
    st.markdown("---")
    col_nav_final1, col_nav_final2 = st.columns(2)
    
    with col_nav_final1:
        if st.button("⬅️ Retour Validation"):
            st.info("Retour au Module 4...")
    
    with col_nav_final2:
        if st.button("🏠 Retour à l'accueil"):
            st.info("Retour à la sélection du type d'arbre...")

# ==================== PIED DE PAGE ====================

# Sidebar - Informations système
st.sidebar.markdown("---")
st.sidebar.subheader("ℹ️ Informations système")
st.sidebar.markdown(f"""
**ArborVision** v3.0  
🚀 Interface Streamlit  
🧠 IA : YOLO v8  
📝 OCR : EasyOCR  
🔍 QR : PyZbar  

📊 **Session actuelle :**  
• Démarrée : {datetime.now().strftime('%H:%M')}  
• Arbre : {st.session_state.tree_id or 'Non identifié'}  

💻 **Compatibilité :**  
• Windows ✅  
• Linux ✅  
• MacOS ✅  
""")

# Footer principal
st.markdown("---")
st.markdown("""
<div style='text-align: center; color: gray;'>
<h4>🌳 ArborVision - Plateforme d'Analyse Arboricole Intelligente</h4>
<p>
Développé avec ❤️ en utilisant Streamlit • Intelligence Artificielle YOLO v8 • OCR EasyOCR<br>
Version 3.0 • © 2024 • Optimisé pour l'agriculture de précision
</p>
<p>
<i>🚀 Prêt pour le déploiement sur Linux • Interface tactile compatible • Export multi-format</i>
</p>
</div>
""", unsafe_allow_html=True)