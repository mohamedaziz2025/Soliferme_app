# FruityTrack

Application mobile de suivi d'arbres fruitiers.

## Installation

1. Assurez-vous d'avoir Flutter installé sur votre machine (version 3.0.0 ou supérieure)
2. Clonez ce dépôt
3. Exécutez `flutter pub get` pour installer les dépendances
4. Placez le modèle TensorFlow Lite MobileNetV2 dans `assets/models/mobilenet_v2_tree_health.tflite`
   - Fallback compatibilité accepté: `assets/models/tree_health_model.tflite` ou `assets/models/tree_analysis_model.tflite`
5. Si vous souhaitez activer les mesures AR, clonez ou conservez le dossier `ar_flutter_plugin` au niveau racine et ajoutez la dépendance correspondante (déjà configurée dans ce dépôt).
5. Téléchargez les polices Roboto et placez-les dans `assets/fonts/`:
   - Roboto-Regular.ttf
   - Roboto-Medium.ttf
   - Roboto-Bold.ttf

## Configuration

1. Assurez-vous que le backend est en cours d'exécution sur `http://localhost:5000`
2. Pour Android, ajoutez les permissions suivantes dans `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
   <uses-permission android:name="android.permission.CAMERA"/>
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
   ```

3. Pour iOS, ajoutez les permissions dans `ios/Runner/Info.plist`:
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>Pour scanner les QR codes et analyser les arbres</string>
   <key>NSPhotoLibraryUsageDescription</key>
   <string>Pour sauvegarder les QR codes générés</string>
   ```

## Fonctionnalités

- Authentification utilisateur
- Tableau de bord avec statistiques
- Liste des arbres avec filtres et recherche
- Scanner de QR code pour identification rapide
- Analyse de santé des arbres avec MobileNetV2 (TensorFlow Lite)
- Mesures en Réalité Augmentée (plugin local `ar_flutter_plugin`)
  - accessible depuis la fiche d'un arbre via l'icone 📏
- Synchronisation des données hors ligne
- Notifications pour le suivi des arbres
- Interface administrateur pour la gestion des utilisateurs

## Architecture

L'application utilise:
- Provider pour la gestion d'état
- Services pour la logique métier
- MobileNetV2 TensorFlow Lite pour l'analyse d'images
- WorkManager pour les tâches en arrière-plan
- API REST pour la communication avec le backend

## Développement

Pour lancer l'application en mode développement:
```bash
flutter run
```

Pour construire l'APK:
```bash
flutter build apk
```

Pour construire l'IPA (iOS):
```bash
flutter build ipa
```
