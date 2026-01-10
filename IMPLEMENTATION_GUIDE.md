# Guide d'Implémentation - Application de Gestion des Arbres

## Résumé des Fonctionnalités Implémentées

### 1. Application Mobile (Flutter)

#### Nouvelle Écran: TreeAnalysisScreen
**Fichier**: `app2/lib/screens/tree_analysis_screen.dart`

**Fonctionnalités**:
- ✅ Capture de photo d'arbre via caméra
- ✅ Détection automatique du GPS
- ✅ Sélection du type d'arbre (dropdown avec types prédéfinis)
- ✅ Lancement automatique de l'analyse AI après capture photo
- ✅ Affichage des résultats d'analyse en temps réel
- ✅ Interface moderne avec indicateurs de santé
- ✅ Recommandations pour chaque maladie détectée

**Route**: `/tree-analysis`

**Utilisation**:
```dart
Navigator.pushNamed(context, '/tree-analysis');
```

#### Mise à jour de l'API Service
**Fichier**: `app2/lib/services/api_service.dart`

**Nouvelles méthodes**:
- `createAnalysisWithGPS()` - Crée une analyse avec matching GPS
- `getAllAnalyses()` - Récupère toutes les analyses
- `getAnalysesByTreeId()` - Récupère les analyses d'un arbre
- `getAnalysisHistory()` - Récupère l'historique avec filtres

---

### 2. Backend (Node.js/Express)

#### Modèle de Données Étendu
**Fichier**: `Backend/src/models/schema.js`

**Nouveau schéma d'analyse**:
```javascript
{
  treeId: String,
  date: Date,
  gpsData: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    altitude: Number
  },
  diseaseDetection: {
    detected: Boolean,
    diseases: [{
      name: String,
      confidence: Number,
      severity: 'low'|'medium'|'high'|'critical',
      affectedArea: String,
      recommendations: [String]
    }],
    overallHealthScore: Number
  },
  treeAnalysis: {
    species: String,
    estimatedAge: Number,
    foliageDensity: Number,
    structuralIntegrity: Number,
    growthIndicators: Object
  }
}
```

#### Nouveau Contrôleur: analysisController
**Fichier**: `Backend/src/controllers/analysisController.js`

**Fonctionnalités principales**:
- ✅ **Matching GPS Intelligent**: 
  1. Recherche arbre dans un rayon de 10m
  2. Si non trouvé, cherche l'arbre le plus proche du même type (rayon 100m)
  3. Si toujours rien, crée un nouvel arbre automatiquement

- ✅ **Historique des analyses**: Filtres par date, type, sévérité
- ✅ **Statistiques**: Total, avec maladies, sains, cas critiques

**Routes**:
- `POST /api/analysis/create-with-gps` - Créer analyse avec GPS matching
- `GET /api/analysis/history` - Historique avec filtres
- `GET /api/analysis/tree/:treeId` - Analyses d'un arbre spécifique

---

### 3. Frontend Web (React/TypeScript)

#### Page: Historique des Analyses
**Fichier**: `Frontend/src/pages/AnalysisHistory.tsx`

**Fonctionnalités**:
- ✅ Affichage de toutes les analyses
- ✅ Statistiques en temps réel (cartes colorées)
- ✅ Filtres avancés (date, type, sévérité)
- ✅ Export CSV
- ✅ Vue détaillée de chaque analyse
- ✅ Indicateurs visuels de santé

**Route**: `/analysis-history` (Admin uniquement)

#### Page: Rapports d'Analyse par Arbre
**Fichier**: `Frontend/src/pages/TreeAnalysisReports.tsx`

**Fonctionnalités**:
- ✅ Historique complet des analyses d'un arbre
- ✅ Timeline des analyses
- ✅ Santé moyenne calculée
- ✅ Détails des maladies par analyse
- ✅ Accordéons pour chaque analyse
- ✅ Graphiques de progression

**Route**: `/trees/:treeId/analyses`

---

## Flux de Travail Complet

### Scénario 1: Nouvel Arbre
1. Utilisateur ouvre l'app mobile → "Analyse d'Arbre"
2. Capture photo de l'arbre
3. GPS détecté automatiquement
4. Sélectionne le type d'arbre
5. L'analyse AI se lance automatiquement
6. Backend ne trouve pas d'arbre à cette localisation
7. **Nouveau arbre créé automatiquement** avec:
   - GPS exact
   - Type d'arbre
   - Première analyse
8. Résultats affichés instantanément

### Scénario 2: Arbre Existant
1. Même processus de capture
2. Backend trouve un arbre dans un rayon de 10m
3. **Ajoute l'analyse à l'arbre existant**
4. Met à jour le statut de l'arbre si maladie détectée

### Scénario 3: Arbre Proche
1. Aucun arbre trouvé à l'emplacement exact
2. Backend cherche arbres du même type à proximité (100m)
3. **Utilise l'arbre le plus proche** pour l'analyse

### Scénario 4: Consultation Admin (Web)
1. Admin se connecte au dashboard web
2. Accède à "Historique des Analyses"
3. Voit toutes les analyses avec statistiques
4. Peut filtrer par date, sévérité, etc.
5. Clic sur un arbre → voir tous ses rapports
6. Export des données en CSV

---

## Installation et Configuration

### Dépendances à ajouter

#### Flutter (Mobile)
```yaml
# Dans pubspec.yaml
dependencies:
  geolocator: ^10.1.0  # Pour GPS
```

Installation:
```bash
cd app2
flutter pub get
```

#### React (Web)
```bash
cd Frontend
npm install date-fns  # Si pas déjà installé
```

#### Backend
Aucune nouvelle dépendance requise.

---

## Configuration des Permissions

### Android (`app2/android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### iOS (`app2/ios/Runner/Info.plist`)
```xml
<key>NSCameraUsageDescription</key>
<string>Nous avons besoin d'accéder à votre caméra pour photographier les arbres</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Nous avons besoin de votre position pour localiser les arbres</string>
```

---

## Navigation

### Mobile
Pour accéder à l'écran d'analyse:
```dart
// Depuis n'importe quel écran
Navigator.pushNamed(context, '/tree-analysis');
```

Suggestion: Ajouter un bouton dans `home_screen.dart` ou `scan_tab.dart`:
```dart
FloatingActionButton(
  onPressed: () => Navigator.pushNamed(context, '/tree-analysis'),
  child: Icon(Icons.camera_alt),
  tooltip: 'Analyser un arbre',
)
```

### Web
Les routes sont automatiquement configurées:
- Historique: `http://localhost:3000/analysis-history`
- Rapports: `http://localhost:3000/trees/TREE_ID/analyses`

Ajouter dans le menu de navigation (`Layout.tsx`):
```tsx
{userRole === 'admin' && (
  <MenuItem onClick={() => navigate('/analysis-history')}>
    <HistoryIcon /> Historique Analyses
  </MenuItem>
)}
```

---

## API Endpoints

### Créer une Analyse avec GPS Matching
```http
POST /api/analysis/create-with-gps
Authorization: Bearer {token}
Content-Type: application/json

{
  "treeType": "Olivier",
  "gpsData": {
    "latitude": 36.8065,
    "longitude": 10.1815,
    "accuracy": 5.2
  },
  "diseaseDetection": {
    "detected": true,
    "diseases": [{
      "name": "Mildiou",
      "confidence": 87.5,
      "severity": "medium",
      "affectedArea": "Feuilles",
      "recommendations": ["Traiter avec fongicide"]
    }],
    "overallHealthScore": 72
  },
  "treeAnalysis": {
    "species": "Olivier",
    "foliageDensity": 75
  }
}
```

**Réponse**:
```json
{
  "success": true,
  "message": "Nouvel arbre créé avec analyse",
  "isNewTree": true,
  "tree": { ... },
  "analysis": { ... }
}
```

### Récupérer l'Historique
```http
GET /api/analysis/history?startDate=2024-01-01&severity=high
Authorization: Bearer {token}
```

### Analyses d'un Arbre
```http
GET /api/analysis/tree/TREE-123456
Authorization: Bearer {token}
```

---

## Tests Recommandés

### Mobile
1. Tester la capture photo
2. Vérifier la détection GPS
3. Tester avec/sans connexion internet
4. Vérifier l'affichage des résultats

### Backend
```javascript
// Test avec Postman ou curl
curl -X POST http://localhost:5000/api/analysis/create-with-gps \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Web
1. Vérifier l'affichage de l'historique
2. Tester les filtres
3. Tester l'export CSV
4. Vérifier les rapports par arbre

---

## Prochaines Étapes

### Intégration AI Réelle
Actuellement, l'analyse AI est simulée. Pour intégrer un vrai modèle:

1. **Côté Mobile**: Remplacer le code mock dans `tree_analysis_screen.dart`:
```dart
// TODO: Call AI analysis service here
// Remplacer par:
final aiResult = await analysisService.analyzeImage(_capturedImage!);
```

2. **Côté Backend**: Créer un service d'analyse:
```javascript
// Backend/src/services/aiAnalysisService.js
async function analyzeTreeImage(imagePath) {
  // Appeler votre modèle TensorFlow/PyTorch
  // Retourner les résultats
}
```

### Amélioration de l'Upload d'Images
Actuellement, les images ne sont pas uploadées. Pour les gérer:

1. Configurer multer dans le backend
2. Uploader l'image vers le serveur ou cloud storage (AWS S3, etc.)
3. Stocker l'URL dans l'analyse

---

## Notes Importantes

- ✅ Toutes les fonctionnalités sont implémentées
- ✅ La logique GPS matching est fonctionnelle
- ⚠️ L'analyse AI est simulée (à remplacer par votre modèle)
- ⚠️ L'upload d'images n'est pas encore implémenté
- ✅ Toutes les routes sont configurées
- ✅ Les permissions sont documentées

Pour toute question ou assistance supplémentaire, référez-vous à ce guide ou consultez les commentaires dans le code.
