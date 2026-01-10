# Démarrage automatique des services avec analyse AI

Write-Host "🚀 Démarrage des services de l'application..." -ForegroundColor Green
Write-Host ""

# Vérifier si Python est installé
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python détecté: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python n'est pas installé. Installez Python 3.8+ depuis https://www.python.org/" -ForegroundColor Red
    exit 1
}

# Vérifier si Node.js est installé
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js n'est pas installé. Installez Node.js depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan

# Installer les dépendances Python
Write-Host "  - Installation des dépendances Python..." -ForegroundColor Cyan
Set-Location Backend
pip install -r requirements.txt -q
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erreur lors de l'installation des dépendances Python (non critique)" -ForegroundColor Yellow
}

# Installer les dépendances Node.js
Write-Host "  - Installation des dépendances Node.js..." -ForegroundColor Cyan
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances Node.js" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "🎯 Démarrage des services..." -ForegroundColor Green

# Créer les dossiers nécessaires
New-Item -ItemType Directory -Force -Path "Backend\uploads\analysis" | Out-Null

# Terminal 1: Service AI (Python)
Write-Host "  1️⃣  Service AI (Python) - Port 5001" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host '🤖 Service AI - Port 5001' -ForegroundColor Magenta; cd '$PWD\Backend\src\services'; python ai_analysis_server.py"
) -WindowStyle Normal

Start-Sleep -Seconds 3

# Terminal 2: Backend API (Node.js)
Write-Host "  2️⃣  Backend API (Node.js) - Port 5000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host '🔧 Backend API - Port 5000' -ForegroundColor Blue; cd '$PWD\Backend'; node src/index.js"
) -WindowStyle Normal

Start-Sleep -Seconds 2

# Terminal 3: Frontend Web (React)
Write-Host "  3️⃣  Frontend Web (React) - Port 3000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Write-Host '🌐 Frontend Web - Port 3000' -ForegroundColor Green; cd '$PWD\Frontend'; npm start"
) -WindowStyle Normal

Write-Host ""
Write-Host "✅ Tous les services sont en cours de démarrage!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 URLs des services:" -ForegroundColor Yellow
Write-Host "  - Service AI:    http://localhost:5001" -ForegroundColor White
Write-Host "  - Backend API:   http://localhost:5000" -ForegroundColor White
Write-Host "  - Frontend Web:  http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "📱 Pour l'application mobile Flutter:" -ForegroundColor Yellow
Write-Host "  cd app2" -ForegroundColor White
Write-Host "  flutter run" -ForegroundColor White
Write-Host ""
Write-Host "⏹️  Pour arrêter les services, fermez les fenêtres PowerShell" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Documentation: Backend\AI_SERVICE_README.md" -ForegroundColor Cyan
Write-Host ""

# Garder ce terminal ouvert
Read-Host "Appuyez sur Entrée pour quitter le lanceur (les services continueront à tourner)"
