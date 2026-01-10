# 🌳 SoliFerme - Application d'Analyse d'Arbres avec IA

Application mobile et web pour l'analyse automatique de la santé des arbres utilisant l'intelligence artificielle.

## 🎯 Fonctionnalités

### 📱 Application Mobile (Flutter)
- Capture photo d'arbre avec GPS automatique
- Sélection du type d'arbre (Olivier, Palmier, Citronnier, etc.)
- Analyse IA en temps réel des maladies
- Score de santé global
- Recommandations de traitement
- Historique des analyses par arbre

### 🌐 Interface Web Admin (React)
- Dashboard des analyses
- Historique complet avec filtres
- Rapports détaillés par arbre
- Export CSV des données
- Statistiques et graphiques

### 🤖 Service d'Analyse IA (Python)
- Détection de maladies avec YOLO v8
- Analyse de la structure foliaire
- Détection de stress hydrique
- Évaluation de la santé globale
- Mode fallback (analyse par couleur)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Application Mobile                 │
│            (Flutter / Dart)                     │
│      📱 iOS | Android | Web                     │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼─────────┐  ┌─────▼──────────────┐
│  Frontend Web    │  │   Backend API      │
│  (React + MUI)   │  │  (Node.js/Express) │
│  Port: 3000      │  │  Port: 5000        │
└──────────────────┘  └─────┬──────────────┘
                            │
                   ┌────────┴────────┐
                   │                 │
         ┌─────────▼────────┐  ┌────▼─────────┐
         │   AI Service     │  │   MongoDB    │
         │ (Python/Flask)   │  │   Database   │
         │   Port: 5001     │  │  Port: 27017 │
         └──────────────────┘  └──────────────┘
```

## 🚀 Déploiement Rapide avec Docker

### Prérequis
- Docker Desktop ([Télécharger](https://www.docker.com/products/docker-desktop))
- 8 GB RAM minimum
- 10 GB d'espace disque

### Démarrage en 1 commande

```powershell
.\deploy-docker.ps1
```

Cette commande va:
1. ✅ Vérifier Docker
2. ✅ Construire toutes les images
3. ✅ Démarrer tous les services
4. ✅ Tester la santé des services

### Accès aux services

| Service | URL | Description |
|---------|-----|-------------|
| 🌐 Frontend | http://localhost:3000 | Interface web admin |
| 🔧 Backend API | http://localhost:5000 | API REST |
| 🤖 AI Service | http://localhost:5001 | Analyse IA |
| 📦 MongoDB | localhost:27017 | Base de données |

### Arrêter les services

```powershell
.\docker-stop.ps1
```

### Voir les logs

```powershell
.\docker-logs.ps1
```

## 📱 Application Mobile Flutter

### Installation

```bash
cd app2
flutter pub get
```

### Lancer sur émulateur/device

```bash
# Android
flutter run

# iOS (Mac uniquement)
flutter run -d ios

# Web
flutter run -d chrome
```

### Configuration API

Modifier `lib/services/api_service.dart`:

```dart
// Android Emulator
const String API_URL = "http://10.0.2.2:5000";

// iOS Simulator
const String API_URL = "http://localhost:5000";

// Device physique (remplacer par l'IP de votre PC)
const String API_URL = "http://192.168.1.X:5000";
```

## 🛠️ Installation Manuelle (Sans Docker)

### Backend API

```bash
cd Backend
npm install
npm start
```

Variables d'environnement (`.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/soliferme
JWT_SECRET=votre_secret
AI_SERVICE_URL=http://localhost:5001
```

### Service AI Python

```bash
cd Backend/src/services
pip install -r requirements.txt
python ai_analysis_server.py
```

### Frontend Web

```bash
cd Frontend
npm install
npm start
```

### MongoDB

```bash
# Installer MongoDB Community
# https://www.mongodb.com/try/download/community

# Démarrer MongoDB
mongod --dbpath ./data/db
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md) | Guide rapide Docker (3 commandes) |
| [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) | Documentation complète Docker |
| [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) | Étapes détaillées de déploiement |
| [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) | Guide de démarrage rapide |
| [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) | Guide d'implémentation |
| [Backend/AI_SERVICE_README.md](Backend/AI_SERVICE_README.md) | Documentation service IA |

## 🧪 Tests

### Tester le Backend

```powershell
curl http://localhost:5000/health
```

### Tester le Service AI

```powershell
curl http://localhost:5001/health
```

### Tester avec une image

```powershell
curl -X POST http://localhost:5001/analyze `
  -F "file=@test_tree.jpg" `
  -F "tree_type=Olivier"
```

## 📊 Workflow d'Analyse

1. **Capture** - L'utilisateur prend une photo d'arbre via l'app mobile
2. **GPS** - La position GPS est automatiquement détectée
3. **Type** - Sélection du type d'arbre (Olivier, Palmier, etc.)
4. **Upload** - La photo est envoyée au Backend API
5. **AI** - Le Backend envoie l'image au Service AI Python
6. **Analyse** - YOLO + OpenCV analysent l'image
7. **Maladies** - Détection des maladies, score de santé
8. **GPS Matching** - Recherche d'arbres existants à proximité:
   - ✅ < 10m → Mise à jour de l'arbre existant
   - ✅ < 100m même type → Mise à jour du plus proche
   - ✅ Sinon → Création d'un nouvel arbre
9. **Sauvegarde** - Résultats stockés dans MongoDB
10. **Affichage** - Résultats affichés dans l'app mobile
11. **Admin** - Consultation dans l'interface web

## 🔐 Sécurité

- ✅ Authentification JWT
- ✅ Bcrypt pour les mots de passe
- ✅ CORS configuré
- ✅ Rate limiting
- ✅ Validation des inputs
- ✅ Conteneurs non-root
- ✅ Health checks

## 🌐 Hébergement Cloud

### Options recommandées

- **DigitalOcean App Platform** - Le plus simple
- **AWS ECS** - Le plus scalable
- **Railway** - Le plus rapide
- **Azure Container Instances** - Pour les entreprises
- **Heroku** - Pour le développement

### Exemple Railway

```bash
npm install -g @railway/cli
railway login
railway up
```

## 🤝 Contribution

Le projet est structuré en 4 parties indépendantes:

- `app2/` - Application mobile Flutter
- `Backend/` - API Node.js + Service AI Python
- `Frontend/` - Interface web React
- `AI/` - Scripts AI de référence

## 📝 License

Propriétaire - SoliFerme 2026

## 🆘 Support

### Problèmes courants

**Service AI ne démarre pas:**
```powershell
cd Backend
pip install -r requirements.txt
python src/services/ai_analysis_server.py
```

**Backend ne trouve pas MongoDB:**
```powershell
# Vérifier que MongoDB tourne
docker ps | findstr mongo

# Redémarrer MongoDB
docker-compose restart mongodb
```

**Erreur de permission GPS mobile:**
```dart
// Android: Vérifier android/app/src/main/AndroidManifest.xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

// iOS: Vérifier ios/Runner/Info.plist
<key>NSLocationWhenInUseUsageDescription</key>
```

### Logs de debug

```powershell
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend
docker-compose logs -f ai-service

# Application mobile
flutter logs
```

## 📬 Contact

Pour toute question sur le déploiement ou l'hébergement, consultez:
- [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
- [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md)

---

**🎉 Bonne analyse d'arbres avec SoliFerme!**
