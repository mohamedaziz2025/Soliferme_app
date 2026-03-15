# Docker Microservices - Architecture avec Variables Centralisées

## 🎯 Objectif

Remplacer les **50+ IPs codées en dur** (72.62.71.97) par une architecture Docker cohérente utilisant des **variables d'environnement centralisées**.

---

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────┐
│           VARIABLES D'ENVIRONNEMENT CENTRALISÉES         │
│              (.env.docker ou .env.local)                │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────────────────────────┐
        │      docker-compose.yml             │
        │   (utilise les variables)           │
        └─────────────────────────────────────┘
                          ↓
    ┌─────────────┬──────────────┬──────────────┐
    ↓             ↓              ↓              ↓
┌─────────┐  ┌──────────┐  ┌─────────┐  ┌───────────┐
│MongoDB  │  │AI Service│  │Backend  │  │Frontend   │
│:27017   │  │:5001     │  │:35000   │  │:38000     │
│         │  │(Python)  │  │(Node.js)│  │(React)    │
└─────────┘  └──────────┘  └─────────┘  └───────────┘
   (DB)       (YOLO)       (API)         (Web UI)
```

---

## ✅ Modifications Effectuées

### 1. **docker-compose.yml** - Utilise les variables d'environnement
```yaml
environment:
  - BACKEND_PORT=${BACKEND_PORT:-5000}
  - MONGODB_URI=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/${MONGO_DATABASE}
  - AI_SERVICE_URL=http://ai-service:${AI_SERVICE_PORT:-5001}
  - REACT_APP_API_URL=${REACT_APP_API_URL:-http://localhost:35000}
```

### 2. **.env.docker** - Configuration centralisée
```env
# Ports internes
BACKEND_PORT=5000
AI_SERVICE_PORT=5001
MONGO_USER=admin
MONGO_PASSWORD=soliferme2026

# Ports externes (accessibles depuis l'hôte)
BACKEND_PORT_EXTERNAL=35000
FRONTEND_PORT_EXTERNAL=38000

# URL accessible depuis le navigateur
REACT_APP_API_URL=http://localhost:35000
```

### 3. **Frontend/src/config/apiConfig.ts** - Configuration centralisée
```typescript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:35000';
export const BACKEND_API = {
  AUTH: `${API_BASE_URL}/api/auth`,
  TREES: `${API_BASE_URL}/api/trees`,
  ANALYSIS: `${API_BASE_URL}/api/analysis`,
};
```

---

## 🚀 Comment Déployer

### **Option 1: Local (sans Docker)**

```bash
# Terminal 1: Service Python YOLO
cd Backend
python -m pip install -r requirements.txt
python ai_analysis_server.py

# Terminal 2: Backend Node.js
cd Backend
npm install
npm start

# Terminal 3: Frontend React
cd Frontend
npm install
npm start
```

**Configuration locale (.env):**
```env
REACT_APP_API_URL=http://localhost:35000
```

---

### **Option 2: Docker Compose (Recommandé)**

#### **A. Créer un fichier `.env` pour votre environnement**

**Pour développement local:**
```bash
cp .env.docker .env.local
```

Contenu de `.env.local`:
```env
NODE_ENV=development
BACKEND_PORT=5000
BACKEND_PORT_EXTERNAL=35000
FRONTEND_PORT_EXTERNAL=38000
REACT_APP_API_URL=http://localhost:35000
MONGO_USER=admin
MONGO_PASSWORD=soliferme2026
JWT_SECRET=dev_secret_key_not_for_production
```

#### **B. Lancer Docker Compose**

```bash
# Utiliser le fichier .env.local
docker-compose --env-file .env.local up -d

# Ou simplement (utilise .env.docker)
docker-compose up -d
```

#### **C. Vérifier les services**

```bash
# Voir l'état des services
docker-compose ps

# Vérifier les logs
docker-compose logs backend
docker-compose logs ai-service
docker-compose logs frontend

# Tester la connexion
curl http://localhost:5000/health
curl http://localhost:5001/health
curl http://localhost:38000
```

---

### **Option 3: Production (Serveur Distant)**

Si votre serveur est à `192.168.1.100`:

**`.env.prod`:**
```env
NODE_ENV=production
BACKEND_PORT_EXTERNAL=35000
FRONTEND_PORT_EXTERNAL=38000
REACT_APP_API_URL=http://192.168.1.100:35000
MONGO_PASSWORD=votre_mot_de_passe_securise_ici
JWT_SECRET=votre_secret_jwt_tres_securise
```

**Déployer:**
```bash
docker-compose --env-file .env.prod up -d
```

---

## 🔧 Remplacer les IPs Codées en Dur

### **Script PowerShell Automatique**

```powershell
# Simuler (voir quelles modifications seraient faites)
.\replace-hardcoded-ips.ps1 -DryRun

# Appliquer les remplacements réels
.\replace-hardcoded-ips.ps1
```

### **Remplacements Manuels (Frontend)**

Les fichiers suivants contiennent encore des IPs codées:
- `Frontend/src/pages/Login.tsx`
- `Frontend/src/pages/Register.tsx`
- `Frontend/src/pages/UserManagement.tsx`
- `Frontend/src/components/AddTreeForm.tsx`
- Et 15+ autres...

**Solution:** Importer et utiliser `apiConfig.ts`:
```typescript
import { API_ENDPOINTS } from '../config/apiConfig';

// Au lieu de:
fetch('http://72.62.71.97:35000/api/trees')

// Utiliser:
fetch(API_ENDPOINTS.TREES_LIST)
```

---

## 📊 Flux de Communication Docker

```
┌─────────────┐
│  Navigateur │
│  localhost  │
└──────┬──────┘
       │ http://localhost:38000
       ↓
┌──────────────────┐
│  Frontend (Nginx)│
│  Port 80 (38000) │
└──────┬───────────┘
       │ http://backend:5000
       │ (résolution DNS Docker)
       ↓
┌──────────────────────────┐
│  Backend API (Node.js)   │
│  Port 5000 (35000 ext)   │
└──────┬───────────────────┘
       │ http://ai-service:5001
       │ http://mongodb:27017
       ↓
┌─────────────────┬──────────────┐
│ Service YOLO    │  MongoDB     │
│ Port 5001       │  Port 27017  │
│ (5001 ext)      │  (27017 ext) │
└─────────────────┴──────────────┘
```

---

## 🔒 Variables d'Environnement Sécuritaires

**À JAMAIS commiter en Git:**
```env
JWT_SECRET=your_real_secret_here
MONGO_PASSWORD=your_database_password_here
```

**À utiliser:**
1. `.env.local` - Pour développement (dans `.gitignore`)
2. `.env.prod` - Pour production (géré par le déploiement)
3. Secrets Docker - Pour production en cluster Docker

---

## 📝 Checklist de Migration

- [ ] Créer `.env.docker` et `.env.local`
- [ ] Mettre à jour `docker-compose.yml` ✅
- [ ] Créer `Frontend/src/config/apiConfig.ts` ✅
- [ ] Mettre à jour les imports Frontend
- [ ] Remplacer les IPs en dur avec le script PowerShell
- [ ] Tester localement avec Docker Compose
- [ ] Tester sur serveur de production
- [ ] Documenter les variables d'environnement

---

## 🧪 Tests de Validation

```bash
# 1. Vérifier que Docker Compose démarre sans erreur
docker-compose config

# 2. Lancer les services
docker-compose up -d

# 3. Attendre ~30 secondes (health checks)
sleep 30

# 4. Vérifier la santé des services
docker-compose exec backend curl http://localhost:5000/health
docker-compose exec backend curl http://ai-service:5001/health

# 5. Tester l'analyse frontend
curl http://localhost:38000

# 6. Voir les logs
docker-compose logs -f backend

# 7. Arrêter les services
docker-compose down
```

---

## 🎓 Points Clés

| Avant | Après |
|-------|-------|
| IP codée: `72.62.71.97:35000` | Variable: `${REACT_APP_API_URL}` |
| 50+ références hardcodées | 1 source unique de configuration |
| Impossible de changer d'environnement | Flexible selon `.env` chargé |
| Services disconnectés | Services dans le même réseau Docker |
| URLs complètes partout | URLs construites dynamiquement |

---

## 💡 Améliorations Futures

1. **Health Checks Améliorés** - Vérifier aussi la connectivité AI ↔ Backend
2. **Scaling Horizontal** - Ajouter plusieurs instances Backend
3. **Reverse Proxy Nginx** - Router le trafic avec un Load Balancer
4. **Volumes Nommés** - Mieux que des volumes anonymes
5. **Logging Centralisé** - Utiliser ELK ou similar
6. **CI/CD Pipeline** - Déploiement automatique

---

## 📞 Support

Pour toute question sur la configuration Docker:
```bash
# Voir la configuration active
docker-compose config

# Inspecter un service
docker-compose exec backend env | grep REACT_APP

# Redémarrer un service
docker-compose restart backend
```
