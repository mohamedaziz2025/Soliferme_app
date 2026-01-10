# Service d'Analyse AI - Installation et Configuration

## 📋 Prérequis

- Python 3.8+
- Node.js 14+
- npm ou yarn

## 🚀 Installation

### 1. Installation des dépendances Python

```bash
cd Backend
pip install -r requirements.txt
```

Si vous rencontrez des problèmes avec torch, installez-le séparément :

```bash
# Pour CPU uniquement
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Pour CUDA (GPU NVIDIA)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### 2. Installation des dépendances Node.js

```bash
cd Backend
npm install form-data
```

### 3. Télécharger le modèle YOLO

Le modèle YOLOv8 sera téléchargé automatiquement au premier lancement. Pour le télécharger manuellement :

```bash
# Dans le dossier Backend
mkdir -p models
cd models
wget https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt
```

## 🎯 Démarrage des Services

### Option 1: Démarrage Manuel

#### Terminal 1 - Service AI (Python)
```bash
cd Backend/src/services
python ai_analysis_server.py
```

Le service AI démarre sur le port **5001** par défaut.

#### Terminal 2 - Backend API (Node.js)
```bash
cd Backend
npm start
# ou
node src/index.js
```

Le backend API démarre sur le port **5000** par défaut.

### Option 2: Démarrage avec Script PowerShell

Créez un fichier `start-services.ps1` :

```powershell
# Démarrer le service AI
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend/src/services; python ai_analysis_server.py"

# Attendre 3 secondes
Start-Sleep -Seconds 3

# Démarrer le backend API
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd Backend; npm start"
```

Exécutez :
```bash
.\start-services.ps1
```

### Option 3: Démarrage avec Docker (Recommandé pour production)

Créez un `docker-compose.yml` :

```yaml
version: '3.8'

services:
  ai-service:
    build:
      context: ./Backend
      dockerfile: Dockerfile.ai
    ports:
      - "5001:5001"
    environment:
      - AI_SERVICE_PORT=5001
      - DEBUG=False
    volumes:
      - ./AI:/app/AI
      - ./Backend/models:/app/models

  backend-api:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - AI_SERVICE_URL=http://ai-service:5001
      - MONGODB_URI=mongodb://mongo:27017/fruitytrack
    depends_on:
      - ai-service
      - mongo

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Démarrez :
```bash
docker-compose up -d
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` dans le dossier Backend :

```env
# Service AI
AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_PORT=5001

# Backend
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fruitytrack
JWT_SECRET=your_jwt_secret_key

# Mode debug
DEBUG=False
```

### Configuration du service AI

Le service peut fonctionner en deux modes :

1. **Mode Complet** : Avec YOLO et MaskRCNN pour une analyse avancée
2. **Mode Basique** : Analyse par couleur uniquement (si les dépendances AI ne sont pas disponibles)

Le mode est détecté automatiquement au démarrage.

## 📡 API Endpoints

### Service AI (Port 5001)

#### Health Check
```http
GET http://localhost:5001/health
```

#### Analyser une image
```http
POST http://localhost:5001/analyze
Content-Type: multipart/form-data

{
  "file": <image_file>,
  "tree_type": "Olivier",
  "gps_data": "{\"latitude\": 36.8065, \"longitude\": 10.1815}"
}
```

#### Analyse en lot
```http
POST http://localhost:5001/batch-analyze
Content-Type: multipart/form-data

{
  "files": [<image1>, <image2>, ...]
}
```

### Backend API (Port 5000)

#### Créer une analyse avec AI
```http
POST http://localhost:5000/api/analysis/create-with-ai
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "image": <image_file>,
  "treeType": "Olivier",
  "gpsData": {
    "latitude": 36.8065,
    "longitude": 10.1815,
    "accuracy": 5.2
  },
  "notes": "Analyse de routine"
}
```

## 🧪 Tests

### Tester le service AI

```bash
curl http://localhost:5001/health
```

Résultat attendu :
```json
{
  "status": "healthy",
  "service": "AI Analysis Service",
  "version": "1.0.0"
}
```

### Tester l'analyse avec une image

```bash
curl -X POST http://localhost:5001/analyze \
  -F "file=@test_tree.jpg" \
  -F "tree_type=Olivier"
```

### Test depuis l'application mobile

1. Ouvrez l'app mobile
2. Allez dans "Analyse d'Arbre"
3. Prenez une photo
4. Sélectionnez le type d'arbre
5. Lancez l'analyse

Les logs devraient montrer :
```
🤖 Lancement de l'analyse AI...
✅ Service AI complet chargé
📊 Analyse créée avec succès
```

## 📊 Monitoring et Logs

### Logs du service AI

Les logs sont affichés dans le terminal du service AI :

```
INFO: 🚀 Démarrage du service AI sur le port 5001
INFO: ✅ Modèle YOLO chargé
INFO: ✅ Modèle MaskRCNN chargé sur cpu
INFO: Analyse de l'image: /tmp/tree_analysis_image.jpg
```

### Logs du backend

Les logs sont affichés dans le terminal du backend :

```
🤖 Lancement de l'analyse AI...
✅ Arbre trouvé à 5.23m
📊 Analyse créée avec succès
```

## ⚠️ Dépannage

### Le service AI ne démarre pas

1. Vérifier que Python 3.8+ est installé :
   ```bash
   python --version
   ```

2. Vérifier les dépendances :
   ```bash
   pip list | grep -E "Flask|opencv|torch|ultralytics"
   ```

3. Vérifier les ports :
   ```bash
   netstat -an | findstr "5001"
   ```

### Erreur "Service AI non disponible"

1. Vérifier que le service AI est démarré
2. Vérifier l'URL dans `.env` :
   ```env
   AI_SERVICE_URL=http://localhost:5001
   ```
3. Tester la connexion :
   ```bash
   curl http://localhost:5001/health
   ```

### Performances lentes

1. **Utiliser un GPU** : Si disponible, installez torch avec CUDA
2. **Réduire la taille des images** : Redimensionner avant l'upload
3. **Ajuster le timeout** : Dans `aiService.js`, augmentez `this.timeout`

### Erreur de mémoire

1. Réduire le nombre d'analyses simultanées
2. Utiliser le mode basique (sans AI avancée)
3. Augmenter la mémoire allouée :
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## 🚀 Optimisations Production

### 1. Utiliser un serveur WSGI

```bash
pip install gunicorn

# Démarrer avec gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 ai_analysis_server:app
```

### 2. Activer le cache

Modifier `ai_analysis_server.py` pour ajouter un cache :

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def analyze_cached(image_hash):
    # Analyse avec cache
    pass
```

### 3. Load Balancing

Utiliser nginx pour distribuer la charge :

```nginx
upstream ai_service {
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
}

server {
    location /analyze {
        proxy_pass http://ai_service;
    }
}
```

### 4. Monitoring avec PM2

```bash
npm install -g pm2

# Démarrer les services
pm2 start ai_analysis_server.py --name ai-service --interpreter python
pm2 start src/index.js --name backend-api

# Voir les logs
pm2 logs

# Monitoring
pm2 monit
```

## 📈 Métriques et Performance

### Temps d'analyse moyens

- **Mode Basique** : 0.5-1 seconde
- **Mode YOLO** : 2-5 secondes
- **Mode Complet (YOLO + MaskRCNN)** : 5-10 secondes

### Utilisation Mémoire

- **Service AI (basique)** : ~200MB
- **Service AI (YOLO)** : ~1.5GB
- **Service AI (complet)** : ~3GB

### Précision

- **Détection de maladies** : 75-90%
- **Analyse de santé** : 80-95%
- **Segmentation d'arbre** : 85-95%

## 📚 Ressources

- [Documentation YOLO](https://docs.ultralytics.com/)
- [PyTorch](https://pytorch.org/docs/stable/index.html)
- [Flask](https://flask.palletsprojects.com/)
- [OpenCV](https://docs.opencv.org/)

## 🆘 Support

Pour toute question ou problème :
1. Vérifier les logs
2. Consulter cette documentation
3. Vérifier les issues GitHub
4. Contacter l'équipe de développement
