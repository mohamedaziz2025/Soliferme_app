# 🚀 Démarrage Rapide - Architecture Docker Microservices

## 🎯 Ce que vous avez

Une application complète à 3 niveaux:

| Service | Port Interne | Port Externe | Technologie |
|---------|--------------|--------------|-------------|
| **Frontend** | 80 | 38000 | React + Nginx |
| **Backend** | 5000 | 35000 | Node.js + Express |
| **AI Service** | 5001 | 5001 | Python + Flask + YOLO |
| **Database** | 27017 | 27017 | MongoDB |

---

## ⚡ Démarrage en 3 Étapes

### **1️⃣ Préparer les Variables d'Environnement**

```bash
# Copier la configuration
cp .env.docker .env

# Éditer selon vos besoins (optionnel)
# nano .env  (Linux/Mac)
# notepad .env  (Windows)
```

**Contenu de `.env`:**
```env
# Environnement
NODE_ENV=production

# Ports
BACKEND_PORT=5000
BACKEND_PORT_EXTERNAL=35000
FRONTEND_PORT_EXTERNAL=38000
AI_SERVICE_PORT=5001

# Base de données
MONGO_USER=admin
MONGO_PASSWORD=soliferme2026
MONGO_DATABASE=soliferme

# URLs
REACT_APP_API_URL=http://localhost:35000

# Sécurité
JWT_SECRET=your_secret_key_here
```

---

### **2️⃣ Lancer Docker Compose**

```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier l'état
docker-compose ps

# Attendre que les services soient sains (~30 secondes)
```

**Vous verrez:**
```
NAME                STATUS
soliferme-mongodb   Up (healthy)
soliferme-ai-service Up (healthy)  
soliferme-backend   Up (healthy)
soliferme-frontend  Up (healthy)
```

---

### **3️⃣ Accéder à l'Application**

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:38000 | Interface web |
| **Backend API** | http://localhost:35000 | API REST |
| **AI Service** | http://localhost:5001 | YOLO service |

---

## 🧪 Tests Rapides

### **Test 1: Vérifier la connectivité**

```bash
# Backend OK?
curl http://localhost:35000/health

# AI Service OK?
curl http://localhost:5001/health

# Frontend OK?
curl http://localhost:38000
```

### **Test 2: Voir les logs**

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs -f ai-service
```

### **Test 3: Tester une analyse**

```bash
# Créer une analyse (vous devez d'abord vous authentifier)
curl -X POST http://localhost:35000/api/analysis/create-with-ai \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@sample_tree.jpg" \
  -F "treeType=Olivier" \
  -F "gpsData={\"latitude\": 45.5, \"longitude\": 2.3}"
```

---

## 🛑 Arrêter les Services

```bash
# Arrêter tous les services (garder les données)
docker-compose stop

# Arrêter et supprimer les conteneurs
docker-compose down

# Arrêter et supprimer TOUT (y compris les données!)
docker-compose down -v
```

---

## 📊 Architecture Visible

```
                    UTILISATEUR
                        |
                        | Browser
                        |
                    http://localhost:38000
                        |
                    ╔═══════════════════╗
                    ║  FRONTEND (React) ║
                    ║  Port 80 (38000)  ║
                    ╚═════════╤═════════╝
                              |
                              | http://backend:5000
                              | (résolution DNS Docker)
                              |
                    ╔═════════▼═════════╗
                    ║ BACKEND (Node.js) ║
                    ║ Port 5000 (35000) ║
                    ╚═════╤═════════╤═══╝
                          |         |
            http://mongodb:27017   http://ai-service:5001
                          |         |
            ╔═════════════▼───╗  ╔─▼─────────────╗
            ║    MONGODB      ║  ║  AI SERVICE   ║
            ║ Port 27017      ║  ║ Python YOLO  ║
            ║              ║  ║  Port 5001     ║
            ╚─────────────────╝  ╚───────────────╝
```

---

## 🔧 Troubleshooting

### **"Port already in use"**
```bash
# Voir quel processus utilise le port
netstat -ano | findstr :35000  (Windows)
lsof -i :35000  (Mac/Linux)

# Utiliser un port différent
docker-compose --env-file .env.local up -d
# (et éditer .env.local pour changer BACKEND_PORT_EXTERNAL)
```

### **"Connection refused"**
```bash
# Les services mettent du temps à démarrer
# Attendre ~30 secondes et vérifier l'état
docker-compose ps

# Si toujours pas healthy, vérifier les logs
docker-compose logs backend
```

### **"Service AI not available"**
```bash
# Le backend utilise une analyse synthétique en fallback
# Vérifier que ai-service est bien lancé
docker-compose logs ai-service

# Vérifier le health check
curl http://localhost:5001/health
```

---

## 📈 Prochaines Étapes

1. **Créer un utilisateur test:**
   ```bash
   curl -X POST http://localhost:35000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "test123"}'
   ```

2. **Télécharger une image d'arbre pour analyse**
   - Aller sur http://localhost:38000
   - Se connecter
   - Uploader une image pour faire une analyse

3. **Consulter les résultats**
   - Voir les résultats YOLO en temps réel
   - Vérifier les données dans MongoDB

---

## 🎓 Architecture Détails

### **Variables d'Environnement Centralisées**

- **Défini dans:** `.env.docker` (ou `.env.local`, `.env.prod`)
- **Utilisé par:** `docker-compose.yml`
- **Injecté dans:** Chaque conteneur via `environment`
- **Avantage:** Pas d'IP codée en dur, configuration flexible

### **Communication Entre Microservices**

Dans Docker, les services se trouvent par leur nom de conteneur:
- Frontend appelle Backend: `http://backend:5000`
- Backend appelle AI Service: `http://ai-service:5001`
- Backend appelle MongoDB: `mongodb:27017`

(Pas besoin d'IP, le réseau Docker gère tout!)

---

## 📚 Fichiers Importants

| Fichier | Rôle |
|---------|------|
| `.env.docker` | Configuration par défaut |
| `.env.local` | Votre configuration locale |
| `docker-compose.yml` | Définition des services |
| `Frontend/src/config/apiConfig.ts` | Config React |
| `Backend/src/index.js` | Serveur Node.js |
| `Backend/ai_analysis_server.py` | Serveur YOLO |

---

## ✅ Vérification Finale

```bash
# 1. Conteneurs lancés?
docker-compose ps

# 2. Services sains?
docker-compose exec backend curl http://ai-service:5001/health

# 3. Frontend accessible?
firefox http://localhost:38000

# 4. Logs sans erreur?
docker-compose logs --tail 20
```

**Si tout est ✅, vous êtes prêt à utiliser Soliferme!**

---

## 💡 Tips

- **Développement:** Gardez `docker-compose` actif dans un terminal
- **Testing:** Utilisez Postman pour tester les API
- **Debugging:** `docker-compose logs -f [service]` pour voir en temps réel
- **Reset:** `docker-compose down -v` puis `docker-compose up -d` pour un démarrage propre

Bon déploiement! 🚀
