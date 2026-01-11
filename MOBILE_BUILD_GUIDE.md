# Guide de compilation et déploiement de l'application mobile

## 🚀 Configuration

L'application mobile est maintenant configurée pour utiliser vos services hébergés :
- **Backend API**: http://72.62.71.97:35000
- **AI Service**: http://72.62.71.97:5001

## 📋 Prérequis

1. **Flutter SDK** installé (https://flutter.dev/docs/get-started/install)
2. **Android Studio** avec Android SDK
3. **Appareil Android** ou émulateur

## 🔨 Compiler l'APK

### Option 1 : Avec le script PowerShell (Recommandé)
```powershell
.\build-mobile-app.ps1
```

### Option 2 : Manuellement
```bash
cd app2
flutter clean
flutter pub get
flutter build apk --release --split-per-abi
```

## 📦 Fichiers générés

Les APKs seront dans `app2\build\app\outputs\flutter-apk\`:

- **app-arm64-v8a-release.apk** (Recommandé, ~20-30 MB)
  - Pour la plupart des téléphones modernes (2017+)
  
- **app-armeabi-v7a-release.apk** (~20-30 MB)
  - Pour les anciens téléphones Android
  
- **app-release.apk** (Universel, ~50-70 MB)
  - Fonctionne sur tous les appareils (plus gros)

## 📱 Installation sur téléphone

### Via USB (ADB)
```bash
cd app2
flutter install
```

### Manuellement
1. Transférer l'APK sur le téléphone
2. Activer "Sources inconnues" dans Paramètres > Sécurité
3. Ouvrir l'APK et installer

## 🧪 Tester sur émulateur

```bash
cd app2
flutter emulators --launch <emulator_id>
flutter run
```

## 🌐 Configuration réseau

L'app est configurée pour se connecter à :
- Backend: `http://72.62.71.97:35000/api`
- AI Service: `http://72.62.71.97:5001`

Pour changer l'URL, modifiez `app2/lib/config/app_config.dart`

## 📊 Tailles approximatives

- APK arm64-v8a: ~25 MB
- APK universel: ~60 MB
- Installation: ~80-120 MB

## 🔐 Fonctionnalités

- ✅ Authentification (login/register)
- ✅ Gestion des arbres
- ✅ Analyse IA avec photo
- ✅ Géolocalisation GPS
- ✅ Mode hors ligne avec sync
- ✅ Carte interactive
- ✅ Dashboard et statistiques
- ✅ Notifications
- ✅ QR Code scanning

## 🐛 Dépannage

### Erreur de connexion
- Vérifiez que le backend est accessible : http://72.62.71.97:35000/health
- Vérifiez la connexion Internet du téléphone

### APK ne s'installe pas
- Vérifiez la version Android (minimum 5.0 / API 21)
- Activez "Sources inconnues"

### App crash au démarrage
- Vérifiez les logs : `flutter logs`
- Reconstruisez : `flutter clean && flutter build apk --release`
