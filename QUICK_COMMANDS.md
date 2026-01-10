# 🚀 COMMANDES RAPIDES - SOLIFERME

## Déploiement Docker

### Démarrer tout
```powershell
.\deploy-docker.ps1
```

### Voir les logs
```powershell
.\docker-logs.ps1
# ou
docker-compose logs -f backend
docker-compose logs -f ai-service
```

### Arrêter tout
```powershell
.\docker-stop.ps1
# ou
docker-compose down
```

### Redémarrer un service
```powershell
docker-compose restart backend
docker-compose restart ai-service
```

### Reconstruire après modification
```powershell
docker-compose build backend
docker-compose up -d backend
```

---

## Tests Rapides

### Backend API
```powershell
curl http://localhost:5000/health
```

### AI Service
```powershell
curl http://localhost:5001/health
```

### MongoDB
```powershell
docker exec soliferme-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Analyse d'image
```powershell
curl -X POST http://localhost:5001/analyze `
  -F "file=@test_tree.jpg" `
  -F "tree_type=Olivier"
```

---

## Application Mobile

### Lancer l'app
```bash
cd app2
flutter run
```

### Nettoyer et relancer
```bash
flutter clean
flutter pub get
flutter run
```

---

## Debug

### Entrer dans un conteneur
```powershell
# Backend
docker exec -it soliferme-backend sh

# MongoDB
docker exec -it soliferme-mongodb mongosh

# AI Service
docker exec -it soliferme-ai-service sh
```

### Voir l'état des conteneurs
```powershell
docker-compose ps
docker stats
```

### Nettoyer Docker
```powershell
# Arrêter et supprimer (garde les volumes)
docker-compose down

# Arrêter et supprimer tout (y compris volumes)
docker-compose down -v

# Nettoyer les images inutilisées
docker system prune -a
```

---

## Développement

### Modifier le code Backend
```powershell
# 1. Modifier les fichiers dans Backend/
# 2. Reconstruire
docker-compose build backend
# 3. Redémarrer
docker-compose up -d backend
# 4. Voir les logs
docker-compose logs -f backend
```

### Modifier le code AI
```powershell
# 1. Modifier Backend/src/services/*.py
# 2. Reconstruire
docker-compose build ai-service
# 3. Redémarrer
docker-compose up -d ai-service
# 4. Voir les logs
docker-compose logs -f ai-service
```

### Modifier le Frontend
```powershell
# 1. Modifier Frontend/src/
# 2. Reconstruire
docker-compose build frontend
# 3. Redémarrer
docker-compose up -d frontend
```

---

## Backup / Restore

### Backup MongoDB
```powershell
# Créer un backup
docker exec soliferme-mongodb mongodump --out=/backup

# Copier le backup localement
docker cp soliferme-mongodb:/backup ./backup_$(Get-Date -Format "yyyyMMdd")
```

### Restore MongoDB
```powershell
# Copier le backup dans le conteneur
docker cp ./backup soliferme-mongodb:/restore

# Restaurer
docker exec soliferme-mongodb mongorestore /restore
```

---

## Production

### Vérifier la santé
```powershell
docker-compose ps
# Tous doivent être "Up (healthy)"
```

### Mettre à jour en production
```powershell
# Pull les changements
git pull origin main

# Rebuild sans cache
docker-compose build --no-cache

# Redémarrer avec zéro downtime
docker-compose up -d --no-deps backend

# Vérifier
docker-compose logs -f backend
```

---

## URLs des Services

- 🌐 Frontend: http://localhost:3000
- 🔧 Backend API: http://localhost:5000
- 🤖 AI Service: http://localhost:5001
- 📦 MongoDB: localhost:27017

---

## Documentation

- [README.md](README.md) - Documentation principale
- [DOCKER_QUICK_START.md](DOCKER_QUICK_START.md) - Démarrage rapide
- [DOCKER_DEPLOYMENT_GUIDE.md](DOCKER_DEPLOYMENT_GUIDE.md) - Guide complet
- [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) - Étapes détaillées
- [SUMMARY_CORRECTIONS.md](SUMMARY_CORRECTIONS.md) - Récapitulatif corrections
