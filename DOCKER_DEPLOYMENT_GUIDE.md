# 🐳 Guide de Déploiement Docker - SoliFerme

## 📋 Prérequis

- **Docker Desktop** 20.10+ ([Télécharger](https://www.docker.com/products/docker-desktop))
- **Docker Compose** 2.0+ (inclus avec Docker Desktop)
- **8 GB RAM minimum** recommandés
- **10 GB d'espace disque** libre

## 🚀 Démarrage Rapide

### 1. Construire et Démarrer Tous les Services

```powershell
# Depuis la racine du projet
docker-compose up -d --build
```

Cette commande va:
- ✅ Construire les images Docker pour Backend, AI Service, et Frontend
- ✅ Télécharger l'image MongoDB 7.0
- ✅ Créer le réseau `soliferme-network`
- ✅ Créer les volumes persistants
- ✅ Démarrer tous les conteneurs en arrière-plan

### 2. Vérifier le Statut

```powershell
# Voir tous les conteneurs
docker-compose ps

# Voir les logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f ai-service
```

### 3. Tester les Services

```powershell
# Test Backend API
curl http://localhost:5000/health

# Test AI Service
curl http://localhost:5001/health

# Test Frontend
curl http://localhost:3000

# Test MongoDB
docker exec soliferme-mongodb mongosh --eval "db.adminCommand('ping')"
```

## 📦 Architecture Docker

```
┌─────────────────────────────────────────────────────────────┐
│                    soliferme-network                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Frontend   │  │   Backend    │  │  AI Service  │    │
│  │  (Nginx:80)  │  │  (Node:5000) │  │(Flask:5001)  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         └─────────────────┼──────────────────┘             │
│                           │                                │
│                    ┌──────┴───────┐                        │
│                    │   MongoDB    │                        │
│                    │   (27017)    │                        │
│                    └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Services Docker

### 1. MongoDB (Port 27017)
- **Image:** `mongo:7.0`
- **Données:** Volume `mongodb_data` (persistant)
- **Credentials:** 
  - Username: `admin`
  - Password: `soliferme2026`
  - Database: `soliferme`

### 2. AI Service (Port 5001)
- **Base:** `python:3.9-slim`
- **Technologie:** Flask + OpenCV + YOLO
- **Volumes:** 
  - `ai_models` - Modèles AI
  - `ai_uploads` - Images uploadées
- **Environnement:**
  - `AI_MODE=basic` (basique sans YOLO) ou `full` (avec YOLO)

### 3. Backend API (Port 5000)
- **Base:** `node:18-alpine`
- **Technologie:** Node.js + Express + Mongoose
- **Volumes:**
  - `backend_uploads` - Fichiers uploadés
  - `backend_logs` - Logs applicatifs
- **Dépendances:** MongoDB, AI Service

### 4. Frontend (Port 3000)
- **Base:** `nginx:alpine`
- **Technologie:** React + Nginx
- **Build:** Multi-stage (npm build → nginx serve)
- **Dépendances:** Backend API

## 📝 Commandes Utiles

### Gestion des Services

```powershell
# Démarrer tous les services
docker-compose up -d

# Arrêter tous les services
docker-compose down

# Redémarrer un service
docker-compose restart backend

# Reconstruire une image
docker-compose build --no-cache ai-service

# Voir les logs
docker-compose logs -f --tail=100

# Arrêter et supprimer les volumes
docker-compose down -v
```

### Maintenance

```powershell
# Entrer dans un conteneur
docker exec -it soliferme-backend sh
docker exec -it soliferme-mongodb mongosh

# Voir les ressources utilisées
docker stats

# Nettoyer les images inutilisées
docker system prune -a

# Inspecter un volume
docker volume inspect soliferme_mongodb_data

# Backup de la base de données
docker exec soliferme-mongodb mongodump --out=/backup
```

### Debug

```powershell
# Logs détaillés Backend
docker-compose logs backend | tail -n 50

# Logs détaillés AI Service
docker-compose logs ai-service | tail -n 50

# Inspecter le réseau
docker network inspect soliferme_soliferme-network

# Tester la connectivité entre services
docker exec soliferme-backend ping ai-service
docker exec soliferme-backend curl http://ai-service:5001/health
```

## 🔐 Variables d'Environnement

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://admin:soliferme2026@mongodb:27017/soliferme?authSource=admin
JWT_SECRET=votre_secret_jwt_super_securise_2026
AI_SERVICE_URL=http://ai-service:5001
CORS_ORIGIN=http://localhost:3000
```

### AI Service (.env)
```env
FLASK_PORT=5001
AI_MODE=basic
MODEL_PATH=/app/models
PYTHONUNBUFFERED=1
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
```

## 🎯 Configuration pour Production

### 1. Utiliser un Reverse Proxy (Traefik ou Nginx)

```yaml
# docker-compose.prod.yml
services:
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

### 2. Activer HTTPS avec Let's Encrypt

```powershell
# Installer Certbot
docker run -it --rm -v certbot-data:/etc/letsencrypt certbot/certbot certonly --standalone
```

### 3. Configurer les Secrets

```powershell
# Utiliser Docker Secrets
echo "mon_secret_jwt" | docker secret create jwt_secret -
```

### 4. Limiter les Ressources

```yaml
# Dans docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 🚨 Troubleshooting

### Problème: Service ne démarre pas

```powershell
# Voir les logs de création
docker-compose logs --tail=50 backend

# Vérifier l'état de santé
docker inspect soliferme-backend | grep -A 10 Health
```

### Problème: MongoDB connection refused

```powershell
# Vérifier que MongoDB est prêt
docker-compose logs mongodb | grep "Waiting for connections"

# Tester la connexion
docker exec soliferme-backend ping mongodb
```

### Problème: AI Service timeout

```powershell
# Augmenter le timeout dans docker-compose.yml
healthcheck:
  start_period: 120s  # Au lieu de 60s
```

### Problème: Espace disque insuffisant

```powershell
# Nettoyer les volumes inutilisés
docker volume prune

# Nettoyer les images
docker image prune -a

# Voir l'utilisation disque
docker system df
```

## 📊 Monitoring

### Health Checks

Tous les services ont des health checks configurés:
- **MongoDB:** `mongosh --eval "db.adminCommand('ping')"`
- **AI Service:** `curl -f http://localhost:5001/health`
- **Backend:** `curl -f http://localhost:5000/health`
- **Frontend:** `wget http://localhost/`

### Logs Centralisés

```powershell
# Installer Portainer pour une interface web
docker run -d -p 9000:9000 --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

## 🔄 Mise à Jour

```powershell
# 1. Pull les dernières modifications
git pull origin main

# 2. Reconstruire les images
docker-compose build

# 3. Redémarrer avec zéro downtime
docker-compose up -d --no-deps --build backend

# 4. Vérifier
docker-compose ps
docker-compose logs -f backend
```

## 📱 Application Mobile Flutter

L'app mobile n'est pas dockerisée car elle s'exécute sur les devices:

```powershell
# Configuration pour pointer vers les services Docker
# Dans app2/lib/services/api_service.dart
const String API_URL = "http://10.0.2.2:5000";  # Android emulator
# ou
const String API_URL = "http://localhost:5000";  # iOS simulator
```

## ✅ Checklist de Déploiement

- [ ] Docker Desktop installé et démarré
- [ ] Toutes les variables d'environnement configurées
- [ ] `docker-compose build` exécuté avec succès
- [ ] Tous les services démarrés: `docker-compose ps` (all healthy)
- [ ] Health checks OK pour tous les services
- [ ] Test Backend API: `curl http://localhost:5000/health`
- [ ] Test AI Service: `curl http://localhost:5001/health`
- [ ] Test Frontend: Ouvrir `http://localhost:3000`
- [ ] Volumes créés et montés correctement
- [ ] Logs vérifiés sans erreurs critiques

## 🆘 Support

### Logs Complets

```powershell
# Générer un rapport de debug
docker-compose logs > debug-report.log
docker-compose ps >> debug-report.log
docker system df >> debug-report.log
```

### Redémarrage Complet

```powershell
# Arrêter tout
docker-compose down

# Supprimer les volumes (ATTENTION: perte de données)
docker-compose down -v

# Reconstruire tout
docker-compose build --no-cache

# Redémarrer
docker-compose up -d
```

---

**🎉 Votre application SoliFerme est maintenant containerisée et prête pour l'hébergement!**

## 🌐 Hébergement Cloud Recommandé

- **AWS:** EC2 + RDS + S3 + ECS
- **Azure:** App Service + Container Instances + Cosmos DB
- **DigitalOcean:** Droplet + Managed Database + Spaces
- **Heroku:** Container Registry + Add-ons
- **Railway:** Déploiement direct depuis GitHub
