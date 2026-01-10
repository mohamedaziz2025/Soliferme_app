"""
Script Python pour l'analyse AI des arbres
À exécuter comme serveur Flask pour l'API backend Node.js
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import logging
from werkzeug.utils import secure_filename
import tempfile

# Ajouter le dossier AI au path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'AI'))

try:
    from tree_analysis_service import get_analysis_service
except ImportError:
    # Si l'import échoue, créer un service de base
    print("⚠️ Service d'analyse non trouvé, utilisation du mode dégradé")
    get_analysis_service = None

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """Check de santé du service"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Analysis Service',
        'version': '1.0.0'
    })

@app.route('/analyze', methods=['POST'])
def analyze_tree():
    """
    Endpoint principal d'analyse d'arbre
    
    Accepte:
        - file: Image de l'arbre
        - tree_type: Type d'arbre (optionnel)
        - gps_data: Données GPS (optionnel)
    
    Retourne:
        - diseaseDetection: Résultats de détection de maladies
        - treeAnalysis: Analyse structurelle de l'arbre
    """
    try:
        # Vérifier si un fichier est présent
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'Aucun fichier fourni'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Nom de fichier vide'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'error': 'Type de fichier non autorisé'
            }), 400
        
        # Sauvegarder le fichier temporairement
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f'tree_analysis_{filename}')
        file.save(temp_path)
        
        logger.info(f"Analyse de l'image: {temp_path}")
        
        # Analyser l'image
        if get_analysis_service:
            service = get_analysis_service()
            results = service.analyze_image(temp_path)
        else:
            # Mode dégradé avec analyse basique
            results = _basic_analysis(temp_path)
        
        # Nettoyer le fichier temporaire
        try:
            os.remove(temp_path)
        except:
            pass
        
        # Ajouter les métadonnées de la requête
        results['metadata'] = {
            'tree_type': request.form.get('tree_type', 'Non spécifié'),
            'gps_data': request.form.get('gps_data', None)
        }
        
        return jsonify(results)
    
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def _basic_analysis(image_path):
    """Analyse basique sans AI avancée"""
    import cv2
    import numpy as np
    
    try:
        # Charger l'image
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Impossible de charger l'image")
        
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Analyse simple de la verdure
        green_mask = cv2.inRange(hsv, np.array([35, 40, 40]), np.array([85, 255, 255]))
        green_ratio = np.sum(green_mask > 0) / green_mask.size
        
        # Score de santé basique
        health_score = int(green_ratio * 150)
        health_score = min(100, max(0, health_score))
        
        # Détection basique de problèmes
        diseases = []
        
        # Zone jaune (possible chlorose)
        yellow_mask = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([40, 255, 255]))
        yellow_ratio = np.sum(yellow_mask > 0) / yellow_mask.size
        
        if yellow_ratio > 0.15:
            diseases.append({
                'name': 'Chlorose possible',
                'confidence': min(yellow_ratio * 400, 85),
                'severity': 'medium',
                'affectedArea': 'Feuillage',
                'recommendations': [
                    'Vérifier l\'apport en nutriments',
                    'Analyser le pH du sol',
                    'Apporter des engrais si nécessaire'
                ]
            })
        
        # Zone brune (possible nécrose)
        brown_mask = cv2.inRange(hsv, np.array([10, 50, 20]), np.array([20, 200, 100]))
        brown_ratio = np.sum(brown_mask > 0) / brown_mask.size
        
        if brown_ratio > 0.10:
            diseases.append({
                'name': 'Nécrose tissulaire détectée',
                'confidence': min(brown_ratio * 500, 80),
                'severity': 'medium',
                'affectedArea': 'Zones foliaires',
                'recommendations': [
                    'Éliminer les parties atteintes',
                    'Traitement préventif recommandé',
                    'Surveiller l\'évolution'
                ]
            })
        
        return {
            'success': True,
            'diseaseDetection': {
                'detected': len(diseases) > 0,
                'diseases': diseases,
                'overallHealthScore': health_score
            },
            'treeAnalysis': {
                'species': 'À identifier',
                'foliageDensity': int(green_ratio * 100),
                'structuralIntegrity': 75,
                'growthIndicators': {
                    'newGrowth': health_score > 70,
                    'leafColor': 'Vert' if health_score > 70 else 'Variable',
                    'branchHealth': 'Normal'
                }
            },
            'analysisMethod': 'basic_color_analysis'
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'diseaseDetection': {
                'detected': False,
                'diseases': [],
                'overallHealthScore': 50
            },
            'treeAnalysis': {}
        }

@app.route('/batch-analyze', methods=['POST'])
def batch_analyze():
    """Analyse de plusieurs images en lot"""
    try:
        files = request.files.getlist('files')
        
        if not files or len(files) == 0:
            return jsonify({
                'success': False,
                'error': 'Aucun fichier fourni'
            }), 400
        
        results = []
        
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{filename}')
                file.save(temp_path)
                
                if get_analysis_service:
                    service = get_analysis_service()
                    result = service.analyze_image(temp_path)
                else:
                    result = _basic_analysis(temp_path)
                
                result['filename'] = filename
                results.append(result)
                
                try:
                    os.remove(temp_path)
                except:
                    pass
        
        return jsonify({
            'success': True,
            'total': len(results),
            'results': results
        })
    
    except Exception as e:
        logger.error(f"Erreur lors de l'analyse en lot: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVICE_PORT', 5001))
    logger.info(f"🚀 Démarrage du service AI sur le port {port}")
    logger.info(f"📁 Dossier d'upload: {UPLOAD_FOLDER}")
    
    # Vérifier si le service AI complet est disponible
    if get_analysis_service:
        try:
            service = get_analysis_service()
            logger.info("✅ Service AI complet chargé")
        except Exception as e:
            logger.warning(f"⚠️ Service AI en mode dégradé: {e}")
    else:
        logger.info("ℹ️ Utilisation de l'analyse basique")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.environ.get('DEBUG', 'False') == 'True'
    )
