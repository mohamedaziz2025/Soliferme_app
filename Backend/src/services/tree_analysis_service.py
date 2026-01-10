"""
Service d'Analyse AI pour la Détection de Maladies et l'Analyse des Arbres
YOLOv8 + Analyse OpenCV
"""

import os
import logging
from typing import Dict, List, Optional
import cv2
import numpy as np

# Configuration
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TreeAnalysisService")

# Vérifier la disponibilité des bibliothèques
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("⚠️ YOLO non disponible → pip install ultralytics")

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("⚠️ PyTorch non disponible → pip install torch")


class TreeAnalysisService:
    """Service d'analyse d'arbres utilisant YOLO et OpenCV"""
    
    def __init__(self):
        self.device = "cuda" if TORCH_AVAILABLE and torch.cuda.is_available() else "cpu"
        self.yolo_model = None
        self._load_models()

    def _load_models(self):
        """Charger les modèles AI si disponibles"""
        try:
            if YOLO_AVAILABLE:
                model_path = os.getenv('MODEL_PATH', './models')
                yolo_file = os.path.join(model_path, 'yolov8n.pt')
                
                if os.path.exists(yolo_file):
                    self.yolo_model = YOLO(yolo_file)
                    logger.info(f"✅ YOLO chargé depuis {yolo_file}")
                else:
                    # Télécharger automatiquement
                    self.yolo_model = YOLO("yolov8n.pt")
                    logger.info("✅ YOLO chargé (téléchargé automatiquement)")
        except Exception as e:
            logger.error(f"❌ Erreur chargement YOLO: {e}")

    def analyze_image(self, image_path: str) -> Dict:
        """
        Analyser une image d'arbre
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Dict contenant l'analyse complète
        """
        try:
            # Lire l'image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Impossible de lire l'image: {image_path}")

            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Effectuer les analyses
            diseases = self._detect_diseases(image_rgb)
            health = self._assess_tree_health(image_rgb)
            structure = self._analyze_tree_structure(image_rgb)

            return {
                "success": True,
                "diseaseDetection": diseases,
                "treeAnalysis": {
                    "species": health["species"],
                    "foliageDensity": health["foliage_density"],
                    "structuralIntegrity": structure["structural_integrity"],
                    "estimatedAge": structure["estimated_age"],
                    "growthIndicators": {
                        "newGrowth": health["new_growth"],
                        "leafColor": health["leaf_color"],
                        "branchHealth": health["branch_health"],
                    },
                },
            }

        except Exception as e:
            logger.error(f"❌ Erreur analyse: {e}")
            return {
                "success": False,
                "error": str(e),
                "diseaseDetection": {
                    "detected": False,
                    "diseases": [],
                    "overallHealthScore": 50,
                },
            }

    def _detect_diseases(self, image_rgb: np.ndarray) -> Dict:
        """Détecter les maladies dans l'image"""
        diseases = []

        # Analyse avec YOLO si disponible
        if self.yolo_model:
            try:
                results = self.yolo_model.predict(
                    source=image_rgb,
                    conf=0.25,
                    iou=0.45,
                    verbose=False,
                )[0]

                if results.boxes:
                    for box in results.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        roi = image_rgb[y1:y2, x1:x2]

                        if roi.size == 0:
                            continue

                        conf = float(box.conf[0])
                        disease = self._map_to_disease(conf, roi)

                        if disease:
                            diseases.append({
                                "name": disease,
                                "confidence": round(conf * 100, 2),
                                "severity": self._get_severity(conf, roi),
                                "affectedArea": self._get_affected_area(y1, y2, image_rgb.shape[0]),
                                "recommendations": self._get_recommendations(disease),
                            })
            except Exception as e:
                logger.warning(f"⚠️ Erreur YOLO: {e}")

        # Analyse par couleur (fallback)
        color_disease = self._detect_disease_by_color(image_rgb)
        if color_disease:
            diseases.append(color_disease)

        # Calculer le score de santé
        score = self._calculate_health_score(diseases, image_rgb)

        return {
            "detected": len(diseases) > 0,
            "diseases": diseases,
            "overallHealthScore": score,
        }

    def _map_to_disease(self, conf: float, roi: np.ndarray) -> Optional[str]:
        """Mapper une détection à une maladie"""
        avg_color = cv2.mean(roi)[:3]

        # Analyse basée sur les couleurs moyennes
        if avg_color[1] < 90 and avg_color[2] < 80:  # Peu de vert, peu de rouge
            return "Nécrose foliaire"
        if avg_color[0] > 160 and avg_color[1] < 100:  # Beaucoup de bleu, peu de vert
            return "Chlorose"
        if conf > 0.6:
            return "Stress hydrique"
        
        return None

    def _get_severity(self, conf: float, roi: np.ndarray) -> str:
        """Déterminer la sévérité"""
        area = roi.shape[0] * roi.shape[1]
        
        if conf > 0.8 or area > 40000:
            return "critical"
        if conf > 0.6:
            return "high"
        if conf > 0.4:
            return "medium"
        return "low"

    def _get_affected_area(self, y1: int, y2: int, height: int) -> str:
        """Déterminer la zone affectée"""
        mid = (y1 + y2) / 2
        
        if mid < height / 3:
            return "Couronne"
        if mid < 2 * height / 3:
            return "Branches"
        return "Tronc"

    def _get_recommendations(self, disease: str) -> List[str]:
        """Obtenir les recommandations pour une maladie"""
        recommendations = {
            "Nécrose foliaire": [
                "Éliminer les feuilles atteintes",
                "Traitement fongicide adapté",
                "Améliorer la ventilation",
            ],
            "Chlorose": [
                "Apport en fer chélaté",
                "Analyse du pH du sol",
                "Correction de l'arrosage",
            ],
            "Stress hydrique": [
                "Augmenter la fréquence d'arrosage",
                "Installer un système de goutte-à-goutte",
                "Appliquer du paillage",
            ],
        }
        
        return recommendations.get(disease, [
            "Surveillance régulière recommandée",
            "Consulter un arboriculteur si persistant"
        ])

    def _detect_disease_by_color(self, image_rgb: np.ndarray) -> Optional[Dict]:
        """Détection basée sur l'analyse des couleurs"""
        # Convertir en HSV pour une meilleure analyse des couleurs
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Détecter les zones jaunes (chlorose)
        yellow_mask = cv2.inRange(hsv, (20, 100, 100), (40, 255, 255))
        yellow_ratio = np.mean(yellow_mask > 0)

        if yellow_ratio > 0.15:  # Plus de 15% de jaune
            return {
                "name": "Chlorose généralisée",
                "confidence": round(min(yellow_ratio * 400, 95), 2),
                "severity": "high" if yellow_ratio > 0.25 else "medium",
                "affectedArea": "Feuillage",
                "recommendations": [
                    "Analyse du sol recommandée",
                    "Apport d'engrais adaptés",
                    "Vérifier le drainage",
                ],
            }
        
        return None

    def _calculate_health_score(self, diseases: List[Dict], image_rgb: np.ndarray) -> int:
        """Calculer le score de santé global"""
        score = 100
        
        # Pénalités par maladie
        severity_penalties = {
            "critical": 30,
            "high": 20,
            "medium": 10,
            "low": 5,
        }
        
        for disease in diseases:
            penalty = severity_penalties.get(disease["severity"], 5)
            score -= penalty
        
        # Bonus/malus selon la densité de feuillage
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        green_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
        green_ratio = np.mean(green_mask > 0)
        
        if green_ratio < 0.2:  # Très peu de vert
            score -= 15
        elif green_ratio > 0.6:  # Beaucoup de vert
            score += 10
        
        return max(0, min(100, score))

    def _assess_tree_health(self, image_rgb: np.ndarray) -> Dict:
        """Évaluer la santé générale de l'arbre"""
        # Convertir en HSV
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
        
        # Analyser le feuillage vert
        green_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
        foliage_density = int(np.mean(green_mask > 0) * 100)

        # Déterminer la couleur des feuilles
        if foliage_density > 40:
            leaf_color = "Vert sain"
        elif foliage_density > 20:
            leaf_color = "Vert pâle"
        else:
            leaf_color = "Décoloré"

        return {
            "species": "À identifier",
            "foliage_density": foliage_density,
            "leaf_color": leaf_color,
            "new_growth": foliage_density > 50,
            "branch_health": "Bon" if foliage_density > 40 else "Moyen",
        }

    def _analyze_tree_structure(self, image_rgb: np.ndarray) -> Dict:
        """Analyser la structure de l'arbre"""
        # Convertir en niveaux de gris
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        
        # Détecter les contours
        edges = cv2.Canny(gray, 50, 150)
        complexity = np.mean(edges > 0)

        # Estimer l'âge basé sur la complexité
        if complexity > 0.2:
            age = "15+ ans"
        elif complexity > 0.12:
            age = "8-15 ans"
        else:
            age = "3-8 ans"

        # Intégrité structurelle
        integrity = int(100 - complexity * 100)
        integrity = max(0, min(100, integrity))

        return {
            "estimated_age": age,
            "structural_integrity": integrity,
        }


# Singleton
_service = None

def get_analysis_service() -> TreeAnalysisService:
    """Obtenir l'instance singleton du service"""
    global _service
    if _service is None:
        _service = TreeAnalysisService()
    return _service


if __name__ == "__main__":
    service = get_analysis_service()
    logger.info("✅ Service d'analyse prêt")
