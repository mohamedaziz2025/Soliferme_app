# Configuration du Service YOLO Actif

## ✅ Modifications Apportées

Le backend a été mis à jour pour utiliser le **service Python YOLO réel** au lieu de générer des données synthétiques locales.

### Fichiers Modifiés

1. **Backend/src/controllers/analysisController.js**
   - Import du service AI singleton: `getAIAnalysisService()`
   - Remplacement de `generateLocalAnalysis()` par `aiService.analyzeTreeImage()`
   - Mise à jour des logs pour indiquer "YOLO" au lieu de "local"
   - Réponse API indique maintenant `method: 'python-yolo'`

2. **Backend/.env.example** (créé)
   - Configuration des variables d'environnement
   - `AI_SERVICE_URL=http://localhost:5001` (à adapter selon votre déploiement)

---

## 🚀 Configuration Requise

### 1. **Démarrer le Service Python YOLO**

```bash
cd Backend
python ai_analysis_server.py
```

Ou avec les dépendances:

```bash
pip install -r requirements.txt
python ai_analysis_server.py
```

Le service écoute sur: `http://localhost:5001`

### 2. **Configurer le Backend Node.js**

Créer/mettre à jour `Backend/.env`:

```env
AI_SERVICE_URL=http://localhost:5001
```

**Alternatives selon votre déploiement:**
- Local: `http://localhost:5001`
- Docker: `http://ai-service:5001`
- Cloud: `http://72.62.71.97:5001` (ou votre IP serveur)

### 3. **Démarrer le Backend**

```bash
cd Backend
npm install
npm start
```

---

## 📋 Flux de Traitement

1. **Frontend/Mobile** → Envoie image + GPS + type d'arbre à `/api/analysis/create-with-ai`
2. **Backend Node.js** → Reçoit l'image, appelthe AI Service
3. **Service Python YOLO** → Analyse l'image avec YOLOv8 Nano
4. **Résultats** → Retour avec:
   - `diseaseDetection`: {detected, diseases[], overallHealthScore}
   - `treeAnalysis`: {species, foliageDensity, structuralIntegrity, growthIndicators}
5. **MongoDB** → Sauvegarde les résultats
6. **Réponse** → Envoie `method: 'python-yolo'` au client

---

## 🔧 Dépannage

### Le service Python ne démarre pas

```bash
# Vérifier les dépendances
pip install -r Backend/requirements.txt

# Vérifier le port 5001
netstat -an | grep 5001
```

### Erreur "Service AI non disponible"

- Vérifier que le service Python est lancé
- Vérifier que `AI_SERVICE_URL` est correcte dans `.env`
- Vérifier la connectivité: `curl http://localhost:5001/health`

### Indiquer le mode "fallback"

Si le service Python n'est pas disponible, le système retourneautomatiquement des données simulées (avec fallback dans `_getMockAnalysis()`).

---

## 📊 Détails Techniques

- **Port Python**: 5001
- **Endpoint**: POST `/analyze` (avec fichier image et options)
- **Timeout**: 30 secondes
- **Modèle**: YOLOv8 Nano (224x224 input, 5 classes de santé)
- **Framework**: Flask + Ultralytics

---

## ✓ Vérification

Après démarrage, effectuer un test:

```bash
# Test de l'endpoint backend
curl -X POST http://localhost:5000/api/analysis/create-with-ai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@tree.jpg" \
  -F "treeType=Olivier" \
  -F "gpsData={\"latitude\": 45.5, \"longitude\": 2.3}"
```

La réponse doit contenir: `"method": "python-yolo"`
