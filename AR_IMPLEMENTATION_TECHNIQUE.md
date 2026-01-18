# 🔧 Documentation Technique - Mesure AR

## Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────┐
│         TreeARMeasurement.tsx               │
│  (Composant principal React)                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐       │
│  │ MediaStream  │  │   Canvas     │       │
│  │   (Caméra)   │  │  (Dessin)    │       │
│  └──────────────┘  └──────────────┘       │
│         ↓                 ↓                 │
│  ┌──────────────────────────────┐         │
│  │   Calculs géométriques       │         │
│  │  (Distance, Calibration)     │         │
│  └──────────────────────────────┘         │
│         ↓                                   │
│  ┌──────────────────────────────┐         │
│  │   API Backend                │         │
│  │  (Enregistrement)            │         │
│  └──────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

## Fichiers créés

### Frontend

1. **`Frontend/src/pages/TreeARMeasurement.tsx`**
   - Composant principal de mesure AR
   - Interface utilisateur complète
   - Gestion de la caméra et du canvas
   - Calculs de mesure

2. **`Frontend/src/components/ARMeasurementQuickAccess.tsx`**
   - Widget d'accès rapide pour le dashboard
   - Card avec présentation des fonctionnalités
   - Navigation vers la page AR

3. **`Frontend/src/App.tsx`**
   - Route ajoutée : `/ar-measurement`
   - Import du composant TreeARMeasurement
   - Protection par authentification

4. **`Frontend/src/components/Layout.tsx`**
   - Ajout du lien "Mesure AR" dans le menu
   - Icône : Straighten (règle)
   - Accessible à tous les utilisateurs authentifiés

### Documentation

1. **`GUIDE_MESURE_AR.md`**
   - Guide utilisateur complet
   - Instructions d'utilisation
   - Résolution de problèmes
   - Conseils de précision

2. **`Frontend/AR_MEASUREMENT_GUIDE.md`**
   - Documentation technique
   - Fonctionnalités détaillées
   - Technologies utilisées
   - Roadmap des améliorations

## Technologies utilisées

### APIs Web

#### MediaDevices API
```typescript
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }
})
```

**Fonctionnalités** :
- Accès à la caméra arrière (mobile)
- Résolution optimale
- Stream vidéo en temps réel

#### Canvas API
```typescript
const ctx = canvas.getContext('2d');
ctx.arc(x, y, radius, 0, 2 * Math.PI); // Points
ctx.lineTo(x, y); // Lignes
```

**Utilisation** :
- Dessiner les points de mesure
- Tracer les lignes de distance
- Visualiser les flèches directionnelles

### Bibliothèques React

#### Material-UI (MUI)
```typescript
import { Button, TextField, Dialog, Chip } from '@mui/material';
```

**Composants utilisés** :
- Layout et grilles
- Boutons et formulaires
- Dialogues et alertes
- Icônes

#### React Hooks
```typescript
const [stream, setStream] = useState<MediaStream | null>(null);
const videoRef = useRef<HTMLVideoElement>(null);
useEffect(() => { /* Cleanup */ }, []);
```

**Hooks utilisés** :
- `useState` : État du composant
- `useRef` : Références DOM
- `useEffect` : Effets de bord

## Algorithmes de mesure

### 1. Calibration

#### Principe
```
Distance réelle (m)
─────────────────── = Ratio de calibration
Distance pixels
```

#### Code
```typescript
const calibrationDistance = 2; // mètres
const pixelToMeterRatio = calibrationDistance / 100;
```

### 2. Calcul de distance

#### Distance euclidienne 2D
```
d = √[(x₂ - x₁)² + (y₂ - y₁)²]
```

#### Code
```typescript
const pixelDistance = Math.sqrt(
  Math.pow(point2.x - point1.x, 2) + 
  Math.pow(point2.y - point1.y, 2)
);
```

### 3. Conversion pixels → mètres

#### Formule simplifiée
```
Distance réelle = (Distance pixels × Ratio) / Facteur d'ajustement
```

#### Code
```typescript
const realDistance = (pixelDistance * pixelToMeterRatio) / 10;
```

**Note** : Cette formule est une approximation. Pour plus de précision, il faudrait :
- Calibration avec un objet de taille connue
- Compensation de la perspective
- Utilisation de la distance réelle à l'objet

### 4. Amélioration future : Perspective

#### Correction de perspective
```
Hauteur réelle = Distance pixels × (Distance caméra-objet / Focale)
```

Pour implémenter :
```typescript
// Obtenir la distance avec un capteur ou calibration
const cameraDistance = 5; // mètres
const focalLength = 50; // mm (dépend de l'appareil)
const sensorHeight = 6; // mm

const realHeight = (pixelDistance * cameraDistance * sensorHeight) / 
                   (canvasHeight * focalLength);
```

## Structure du code

### TreeARMeasurement.tsx

#### Interfaces TypeScript
```typescript
interface MeasurementPoint {
  x: number;
  y: number;
  label: string;
}

interface TreeMeasurement {
  height: number;
  width: number;
  circumference?: number;
  timestamp: Date;
}
```

#### État du composant
```typescript
const [stream, setStream] = useState<MediaStream | null>(null);
const [isStreaming, setIsStreaming] = useState(false);
const [measurements, setMeasurements] = useState<TreeMeasurement[]>([]);
const [currentMeasurement, setCurrentMeasurement] = useState({});
const [measurementPoints, setMeasurementPoints] = useState([]);
const [measurementMode, setMeasurementMode] = useState<'height' | 'width' | 'circumference'>('height');
const [calibrationDistance, setCalibrationDistance] = useState(2);
```

#### Fonctions principales

1. **startCamera()** : Démarre le flux vidéo
2. **stopCamera()** : Arrête le flux
3. **handleCanvasClick()** : Gère les clics sur le canvas
4. **calculateMeasurement()** : Calcule la distance
5. **drawPoints()** : Dessine sur le canvas
6. **saveMeasurement()** : Enregistre en base

### Flux de données

```
Utilisateur clique sur canvas
        ↓
handleCanvasClick()
        ↓
Ajoute point à measurementPoints[]
        ↓
Si 2 points → calculateMeasurement()
        ↓
Calcule distance réelle
        ↓
Met à jour currentMeasurement
        ↓
Affiche dans l'interface
        ↓
Utilisateur clique "Enregistrer"
        ↓
saveMeasurement() → API Backend
        ↓
Sauvegarde dans la base de données
```

## API Backend

### Endpoint utilisé

```
POST /api/trees
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Arbre mesuré",
  "height": 5.2,
  "width": 3.8,
  "circumference": 1.2,
  "measurementDate": "2026-01-18T10:30:00Z",
  "measurementMethod": "AR"
}
```

### Réponse
```json
{
  "success": true,
  "tree": {
    "id": "abc123",
    "name": "Arbre mesuré",
    "height": 5.2,
    "width": 3.8,
    "circumference": 1.2,
    "createdAt": "2026-01-18T10:30:00Z"
  }
}
```

## Configuration requise

### Frontend

#### Dependencies (déjà présentes)
```json
{
  "@mui/material": "^5.17.1",
  "@mui/icons-material": "^5.17.1",
  "react": "^18.2.0",
  "react-router-dom": "^6.11.1",
  "axios": "^1.4.0"
}
```

#### Nouvelles dépendances (optionnelles pour v2)
```json
{
  "ar.js": "^3.4.5",  // Pour AR avancé
  "three": "^0.159.0"  // Pour 3D
}
```

### Permissions navigateur

#### HTTPS requis
```
https://votre-site.com/ar-measurement
```

**Important** : L'accès à la caméra nécessite HTTPS (sauf localhost)

#### Permissions
- Camera access : `navigator.mediaDevices.getUserMedia()`
- Storage : `localStorage` pour les préférences

## Déploiement

### Build

```bash
cd Frontend
npm run build
```

### Variables d'environnement

```env
REACT_APP_API_URL=https://api.soliferme.com
REACT_APP_AR_CALIBRATION_DEFAULT=2
REACT_APP_AR_MAX_DISTANCE=10
```

### Nginx configuration

```nginx
location /ar-measurement {
    try_files $uri /index.html;
}

# Autoriser l'accès caméra
add_header Permissions-Policy "camera=(self)";
```

## Tests

### Tests manuels

1. **Test caméra**
   - Vérifier l'activation/désactivation
   - Tester sur mobile et desktop
   - Vérifier les permissions

2. **Test mesure**
   - Mesurer un objet de taille connue
   - Comparer avec mesure réelle
   - Tester différentes distances

3. **Test enregistrement**
   - Sauvegarder une mesure
   - Vérifier en base de données
   - Tester avec/sans nom d'arbre

### Tests automatisés (à implémenter)

```typescript
describe('TreeARMeasurement', () => {
  it('should start camera', async () => {
    // Test
  });
  
  it('should calculate distance correctly', () => {
    const point1 = { x: 0, y: 0 };
    const point2 = { x: 100, y: 0 };
    const distance = calculateDistance(point1, point2);
    expect(distance).toBe(100);
  });
  
  it('should save measurement', async () => {
    // Test
  });
});
```

## Performance

### Optimisations

1. **Streaming vidéo**
   - Résolution adaptative
   - FPS optimal (30fps)
   - Libération des ressources

2. **Canvas**
   - Redessinage uniquement sur changement
   - Cleanup des objets graphiques
   - Double buffering (automatique)

3. **Mémoire**
   - Nettoyage du stream au démontage
   - Limitation de l'historique

### Monitoring

```typescript
// Taille du stream
console.log('Video dimensions:', video.videoWidth, video.videoHeight);

// Performances
performance.mark('measure-start');
// ... mesure ...
performance.mark('measure-end');
performance.measure('measurement', 'measure-start', 'measure-end');
```

## Sécurité

### Validation des données

```typescript
// Validation côté client
if (height < 0 || height > 100) {
  throw new Error('Hauteur invalide');
}

// Validation côté serveur (Backend)
if (!isValidTreeMeasurement(data)) {
  return res.status(400).json({ error: 'Invalid data' });
}
```

### Protection des données

- Authentification requise (JWT)
- HTTPS obligatoire
- Permissions caméra explicites
- Pas de stockage d'images (sauf si demandé)

## Roadmap

### Version 1.0 (Actuelle) ✅
- ✅ Caméra en temps réel
- ✅ Mesure 2D simple
- ✅ Interface utilisateur complète
- ✅ Enregistrement en base

### Version 1.5 (Court terme)
- 🔄 Amélioration de la précision
- 🔄 Calibration avec objet de référence
- 🔄 Mode photo avec annotations
- 🔄 Export des mesures

### Version 2.0 (Moyen terme)
- 📋 Intégration AR.js
- 📋 Détection automatique
- 📋 Tracking 3D
- 📋 Utilisation des capteurs (gyroscope, etc.)

### Version 3.0 (Long terme)
- 📋 Intelligence artificielle
- 📋 Reconnaissance d'espèces
- 📋 Analyse de santé
- 📋 Modélisation 3D

## Support et maintenance

### Logs

```typescript
console.log('[AR] Camera started');
console.log('[AR] Measurement calculated:', measurement);
console.error('[AR] Error:', error);
```

### Debug

Activer le mode debug :
```typescript
const DEBUG = true;

if (DEBUG) {
  console.log('Point 1:', point1);
  console.log('Point 2:', point2);
  console.log('Distance pixels:', pixelDistance);
  console.log('Distance réelle:', realDistance);
}
```

### Problèmes connus

1. **Précision limitée**
   - Solution : Calibration avec objet connu
   - Workaround : Utiliser pour estimations uniquement

2. **Perspective non corrigée**
   - Solution v2 : Implémentation de la correction
   - Workaround : Se positionner perpendiculairement

3. **Conditions lumineuses**
   - Solution : Filtres d'image (à venir)
   - Workaround : Mesurer en plein jour

## Contact développeur

Pour questions techniques :
- Email : dev@soliferme.com
- GitHub : github.com/soliferme/app
- Documentation : docs.soliferme.com

---

**Auteur** : GitHub Copilot & Équipe Soliferme  
**Version** : 1.0.0  
**Date** : Janvier 2026
