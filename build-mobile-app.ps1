# Script pour compiler l'application mobile Flutter en APK
Write-Host "📱 Compilation de l'application mobile Soliferme..." -ForegroundColor Cyan

# Aller dans le répertoire app2
Set-Location app2

# Nettoyer les builds précédents
Write-Host "`n🧹 Nettoyage des builds précédents..." -ForegroundColor Yellow
flutter clean

# Récupérer les dépendances
Write-Host "`n📦 Téléchargement des dépendances..." -ForegroundColor Yellow
flutter pub get

# Compiler l'APK en mode release
Write-Host "`n🔨 Compilation de l'APK (mode release)..." -ForegroundColor Yellow
flutter build apk --release

# Compiler l'APK split par ABI (plus petit)
Write-Host "`n🔨 Compilation des APKs optimisés par architecture..." -ForegroundColor Yellow
flutter build apk --split-per-abi --release

Write-Host "`n✅ Compilation terminée!" -ForegroundColor Green
Write-Host "`n📦 Les APKs sont disponibles dans:" -ForegroundColor Cyan
Write-Host "   app2\build\app\outputs\flutter-apk\" -ForegroundColor White
Write-Host "`n📱 Fichiers générés:" -ForegroundColor Cyan
Write-Host "   - app-release.apk (universel)" -ForegroundColor White
Write-Host "   - app-armeabi-v7a-release.apk (32-bit)" -ForegroundColor White
Write-Host "   - app-arm64-v8a-release.apk (64-bit, recommandé)" -ForegroundColor White
Write-Host "   - app-x86_64-release.apk (émulateur)" -ForegroundColor White

Set-Location ..
