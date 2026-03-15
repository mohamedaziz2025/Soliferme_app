# ✅ Checklist de Validation - Docker Microservices

## 📋 Avant de Commencer

Assurez-vous que vous avez:

- [ ] Docker installé (`docker --version`)
- [ ] Docker Compose installé (`docker-compose --version`)
- [ ] Git dans le dossier du projet (`git -C . rev-parse --is-inside-work-tree`)
- [ ] Espace disque libre (~5GB pour les images Docker)
- [ ] Port 38000, 35000, 5001, 27017 disponibles

---

## 🔧 Configuration Initiale

```bash
# 1. Naviguer dans le répertoire du projet
cd c:\Users\pc\Downloads\Soliferme_app

# 2. Verifier que les fichiers existent
ls .env.docker         # Doit exister
ls docker-compose.yml  # Doit exister

# 3. Copier la configuration
Copy-Item .env.docker -Destination .env  # Windows
cp .env.docker .env                      # Linux/Mac

# 4. Éditer si nécessaire (optionnel)
notepad .env  # Windows
nano .env     # Linux/Mac
```

---

## 🚀 Démarrage

### **Option A: With Management Script (Recommended)**

**Windows:**
```powershell
# Rendre le script exécutable
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Démarrer les services
.\docker-manage.ps1 -Action start

# Vérifier l'état
.\docker-manage.ps1 -Action status

# Voir les logs
.\docker-manage.ps1 -Action logs
```

**Linux/Mac:**
```bash
chmod +x docker-manage.sh
./docker-manage.sh start
./docker-manage.sh status
./docker-manage.sh logs
```

### **Option B: Manual Docker Compose**

```bash
# Démarrer tous les services
docker-compose up -d

# Voir l'état
docker-compose ps

# Attendre ~30 secondes pour que les services soient sains
sleep 30

# Vérifier les logs
docker-compose logs -f
```

---

## ✅ Tests de Validation

### **Test 1: Services Sains?**
```bash
docker-compose ps

# Tous les services doivent montrer:
# STATUS: Up (healthy)
# OU Au minimum: Up
```

**Résultat attendu:**
```
NAME                    STATUS
soliferme-mongodb       Up (healthy)
soliferme-ai-service    Up (healthy)
soliferme-backend       Up (healthy)
soliferme-frontend      Up (healthy)
```

### **Test 2: Ports Accessibles?**

**Windows PowerShell:**
```powershell
# Backend
Invoke-WebRequest -Uri "http://localhost:35000/health"

# AI Service
Invoke-WebRequest -Uri "http://localhost:5001/health"

# Frontend
Invoke-WebRequest -Uri "http://localhost:38000"
```

**Linux/Mac:**
```bash
# Backend
curl http://localhost:35000/health

# AI Service  
curl http://localhost:5001/health

# Frontend
curl http://localhost:38000
```

### **Test 3: Communication Inter-Services?**

```bash
# Le Backend peut-il atteindre le service AI?
docker-compose exec backend \
  curl http://ai-service:5001/health

# Résultat: {"status": "ok"} ou similaire
```

### **Test 4: Frontend Accessible?**

Ouvrir dans le navigateur: **http://localhost:38000**

Vous devez voir:
- [ ] Page de login (ou interface d'accueil)
- [ ] Pas d'erreurs dans la console (F12)
- [ ] Network tab montre les requêtes sans erreur 404/500

### **Test 5: Authentification & Analyse**

```bash
# 1. S'authentifier
curl -X POST http://localhost:35000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'

# Réponse: { "token": "...", "userId": "...", ... }

# 2. Copier le token

# 3. Envoyer une image pour analyse
curl -X POST http://localhost:35000/api/analysis/create-with-ai \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@sample_tree.jpg" \
  -F "treeType=Olivier" \
  -F "gpsData={\"latitude\": 45.5, \"longitude\": 2.3}" \
  -F "measurements={}" \
  -F "notes=Test analysis"

# Réponse devrait inclure:
# "method": "python-yolo"
# "diseaseDetection": { ... }
```

---

## 🧪 Execution du Test Complet

```powershell
# Windows PowerShell
.\docker-manage.ps1 -Action start
.\docker-manage.ps1 -Action status
.\docker-manage.ps1 -Action test
.\docker-manage.ps1 -Action logs -Service backend
```

---

## 🐛 Debugging

### **Logs en Temps Réel**

```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Dernières N lignes
docker-compose logs --tail 50 backend
```

### **Inspecter un Conteneur**

```bash
# Accéder au shell bash du conteneur
docker-compose exec backend bash

# À l'intérieur du conteneur:
ls -la /app                 # Voir les fichiers
cat .env                    # Voir les variables config
npm version                 # Voir la version Node
exit                        # Quitter
```

### **Vérifier les Variables d'Environnement**

```bash
# Dans le conteneur Backend
docker-compose exec backend env | grep -E "(REACT_APP|AI_SERVICE|PORT)"

# Résultat devrait montrer:
# PORT=5000
# AI_SERVICE_URL=http://ai-service:5001
# MONGODB_URI=mongodb://admin:...
```

---

## 🔄 Commandes Utiles

| Action | Commande |
|--------|----------|
| Démarrer | `docker-compose up -d` |
| Arrêter | `docker-compose stop` |
| Redémarrer | `docker-compose restart` |
| Voir l'état | `docker-compose ps` |
| Logs | `docker-compose logs -f` |
| Nettoyer | `docker-compose down` |
| Hard Reset | `docker-compose down -v` |

---

## ⚠️ Problèmes Courants

### **Problème: "Port already in use"**

```bash
# Trouver le processus qui utilise le port
netstat -ano | findstr :35000  # Windows
lsof -i :35000                 # Mac/Linux

# Solution 1: Arrêter le processus
taskkill /PID <PID> /F  # Windows

# Solution 2: Utiliser un port différent
# Éditer .env: BACKEND_PORT_EXTERNAL=35001
# Relancer: docker-compose up -d
```

### **Problème: "Cannot connect to Docker daemon"**

```bash
# Le daemon Docker n'est pas lancé
# Solution: Lancer Docker Desktop ou le service Docker
docker --version  # Doit retourner une version
```

### **Problème: "Service network error"**

```bash
# Le réseau Docker ne fonctionne pas
# Solution: Redémarrer Docker
docker-compose restart

# Ou réinitialiser complètement
docker-compose down -v
docker-compose up -d
```

### **Problème: "Frontend cannot reach backend"**

```bash
# Vérifier que la variable REACT_APP_API_URL est correcte
docker-compose exec frontend env | grep REACT_APP_API_URL

# Doit afficher: http://localhost:35000 (ou votre URL)

# Si incorrect, éditer .env et redémarrer
docker-compose restart
```

---

## 📊 Vérification des Variables d'Environnement

```bash
# Vérifier la configuration chargée
docker-compose config

# Vérifier les variables dans chaque conteneur
docker-compose exec mongodb env | grep MONGO
docker-compose exec backend env | grep PORT
docker-compose exec ai-service env | grep FLASK
docker-compose exec frontend env | grep REACT_APP
```

---

## 🎯 Checklist de Succès

Vérifier que vous pouvez:

- [ ] Lancer `docker-compose up -d` sans erreurs
- [ ] Voir tous les services "Up (healthy)" dans `docker-compose ps`
- [ ] Accéder à http://localhost:38000 dans le navigateur
- [ ] Voir les logs sans erreurs critiques
- [ ] Faire des requêtes API avec curl
- [ ] Tester une analyse complète

---

## 🚨 Si Ça Ne Marche Pas

1. **Vérifier les prérequis:**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Réinitialiser complètement:**
   ```bash
   docker-compose down -v
   rm .env
   cp .env.docker .env
   docker-compose up -d
   ```

3. **Voir les logs détaillés:**
   ```bash
   docker-compose logs -f backend
   ```

4. **Envoyer un rapport:**
   - Coller les logs de: `docker-compose logs`
   - Résultat de: `docker-compose ps`
   - Votre `.env` (sans secrets)

---

## 📚 Documentation

- **QUICK_START_DOCKER.md** - Démarrage rapide
- **DOCKER_MICROSERVICES_GUIDE.md** - Architecture détaillée
- **ARCHITECTURE_SUMMARY.md** - Sommaire des changements
- **DOCKER_READY.md** - Vue d'ensemble pour commencer

---

## ✅ Vous êtes Prêt!

Une fois tous les tests passés, votre architecture Docker est opérationnelle!

### **Prochaines étapes:**

1. **Tester** - Créer un utilisateur et faire une analyse
2. **Déployer** - Sur votre serveur de production
3. **Monitorer** - Ajouter des alertes et logging
4. **Scaler** - Ajouter plusieurs instances si nécessaire

---

**Besoin d'aide?** Consultez la documentation ou vérifiez les logs!

Bon déploiement! 🚀
