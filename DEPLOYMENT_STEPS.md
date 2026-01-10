# 🐳 Guide de Déploiement - Étapes Détaillées

## Vue d'ensemble

Ce projet utilise Docker Compose pour orchestrer 4 services:
- **MongoDB** (Base de données)
- **AI Service** (Analyse d'images Python/Flask)
- **Backend API** (Node.js/Express)
- **Frontend** (React/Nginx)

## 🚀 Installation et Démarrage

### Méthode 1: Script Automatique (Recommandé)

```powershell
# Déployer tout en une commande
.\deploy-docker.ps1
```

Ce script va:
1. ✅ Vérifier Docker et Docker Compose
2. ✅ Arrêter les anciens conteneurs
3. ✅ Construire toutes les images
4. ✅ Démarrer tous les services
5. ✅ Tester la santé de chaque service

### Méthode 2: Commandes Manuelles

```powershell
# 1. Construire les images
docker-compose build

# 2. Démarrer les services
docker-compose up -d

# 3. Vérifier l'état
docker-compose ps

# 4. Voir les logs
docker-compose logs -f
```

## 📊 Vérification du Déploiement

### Vérifier que tous les conteneurs tournent

```powershell
docker-compose ps
```

Résultat attendu:
```
NAME                    STATUS        PORTS
soliferme-mongodb       Up (healthy)  0.0.0.0:27017->27017/tcp
soliferme-ai-service    Up (healthy)  0.0.0.0:5001->5001/tcp
soliferme-backend       Up (healthy)  0.0.0.0:5000->5000/tcp
soliferme-frontend      Up (healthy)  0.0.0.0:3000->80/tcp
```

### Tester les endpoints

```powershell
# Backend API
curl http://localhost:5000/health

# AI Service
curl http://localhost:5001/health

# Frontend
curl http://localhost:3000
```

## 🔍 Debug et Logs

### Voir les logs en temps réel

```powershell
# Tous les services
.\docker-logs.ps1

# Ou docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs -f ai-service
```

### Inspecter un conteneur

```powershell
# Entrer dans le conteneur backend
docker exec -it soliferme-backend sh

# Entrer dans MongoDB
docker exec -it soliferme-mongodb mongosh

# Voir les variables d'environnement
docker exec soliferme-backend env
```

### Problèmes courants

#### 1. Port déjà utilisé

```powershell
# Trouver quel processus utilise le port
netstat -ano | findstr :5000

# Tuer le processus
Stop-Process -Id <PID> -Force
```

#### 2. Service ne démarre pas

```powershell
# Voir les logs détaillés
docker-compose logs backend --tail=100

# Redémarrer un service
docker-compose restart backend
```

#### 3. Erreur de connexion MongoDB

```powershell
# Vérifier que MongoDB est prêt
docker exec soliferme-mongodb mongosh --eval "db.adminCommand('ping')"

# Voir les logs MongoDB
docker-compose logs mongodb
```

## 🔄 Mise à Jour du Code

### Après modification du code

```powershell
# 1. Arrêter les services
docker-compose down

# 2. Reconstruire l'image modifiée
docker-compose build backend  # ou ai-service, ou frontend

# 3. Redémarrer
docker-compose up -d

# 4. Vérifier
docker-compose logs -f backend
```

### Reconstruire tout

```powershell
# Forcer la reconstruction complète
docker-compose build --no-cache

# Ou utiliser le script
.\deploy-docker.ps1
```

## 📦 Gestion des Données

### Volumes persistants

Les données sont stockées dans des volumes Docker:
- `mongodb_data` - Base de données
- `backend_uploads` - Fichiers uploadés
- `ai_models` - Modèles AI
- `backend_logs` - Logs

```powershell
# Lister les volumes
docker volume ls

# Inspecter un volume
docker volume inspect soliferme_mongodb_data

# Backup MongoDB
docker exec soliferme-mongodb mongodump --out=/backup
docker cp soliferme-mongodb:/backup ./backup_$(Get-Date -Format "yyyyMMdd")
```

### Nettoyer les volumes (⚠️ Perte de données)

```powershell
# Arrêter et supprimer volumes
docker-compose down -v

# Nettoyer tout Docker
docker system prune -a --volumes
```

## 🌐 Configuration Production

### 1. Variables d'environnement

Créer `.env` à la racine:

```env
# MongoDB
MONGO_ROOT_PASSWORD=votre_mot_de_passe_securise
MONGO_DATABASE=soliferme_prod

# JWT
JWT_SECRET=votre_secret_jwt_tres_long_et_securise_2026

# URLs
BACKEND_URL=https://api.votredomaine.com
FRONTEND_URL=https://votredomaine.com
```

### 2. HTTPS avec Nginx

Ajouter un reverse proxy:

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
      - ./certs:/etc/nginx/certs:ro
```

### 3. Limiter les ressources

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

## 🔐 Sécurité

### 1. Secrets Docker

```powershell
# Créer un secret
echo "mon_secret_jwt" | docker secret create jwt_secret -

# Utiliser dans docker-compose
secrets:
  jwt_secret:
    external: true
```

### 2. Scanner les vulnérabilités

```powershell
# Scanner une image
docker scan soliferme-backend
```

### 3. Utilisateurs non-root

Tous les conteneurs utilisent des utilisateurs non-root pour la sécurité.

## 📱 Application Mobile

L'app mobile Flutter n'est pas dockerisée (elle tourne sur les devices).

Configuration pour pointer vers les services Docker:

```dart
// app2/lib/services/api_service.dart

// Android Emulator
const String API_URL = "http://10.0.2.2:5000";

// iOS Simulator
const String API_URL = "http://localhost:5000";

// Device physique (mettre l'IP de votre PC)
const String API_URL = "http://192.168.1.X:5000";
```

## 🚀 Hébergement Cloud

### Option 1: DigitalOcean App Platform

```bash
# 1. Installer doctl
# 2. Se connecter
doctl auth init

# 3. Déployer
doctl apps create --spec .do/app.yaml
```

### Option 2: AWS ECS

```bash
# 1. Push vers ECR
docker tag soliferme-backend:latest <account>.dkr.ecr.region.amazonaws.com/soliferme-backend
docker push <account>.dkr.ecr.region.amazonaws.com/soliferme-backend

# 2. Déployer sur ECS
aws ecs update-service --cluster soliferme --service backend --force-new-deployment
```

### Option 3: Railway

```bash
# 1. Installer Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Déployer
railway up
```

## 🛑 Arrêter les Services

```powershell
# Script rapide
.\docker-stop.ps1

# Ou commande directe
docker-compose down

# Avec suppression des volumes (⚠️)
docker-compose down -v
```

## 📚 Ressources

- Documentation Docker: [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md)
- Guide rapide: [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md)
- Service AI: [Backend/AI_SERVICE_README.md](Backend/AI_SERVICE_README.md)
- Implémentation: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)

## ✅ Checklist de Production

- [ ] Changer tous les mots de passe par défaut
- [ ] Configurer HTTPS/SSL
- [ ] Activer les backups MongoDB
- [ ] Configurer les logs centralisés
- [ ] Mettre en place le monitoring (Prometheus/Grafana)
- [ ] Tester les sauvegardes/restaurations
- [ ] Documenter les procédures d'urgence
- [ ] Configurer les alertes
- [ ] Scanner les vulnérabilités
- [ ] Optimiser les images (multi-stage builds)

---

**🎉 Votre application est prête pour le déploiement!**
