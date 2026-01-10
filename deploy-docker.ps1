# Script de déploiement Docker - SoliFerme
# Exécuter: .\deploy-docker.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🐳 DÉPLOIEMENT DOCKER - SOLIFERME" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Docker
Write-Host "1️⃣  Vérification de Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "   ✅ Docker installé: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker n'est pas installé!" -ForegroundColor Red
    Write-Host "   📥 Téléchargez Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Vérifier Docker Compose
try {
    $composeVersion = docker-compose --version
    Write-Host "   ✅ Docker Compose installé: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker Compose n'est pas installé!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Vérifier que Docker est en cours d'exécution
Write-Host "2️⃣  Vérification du daemon Docker..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "   ✅ Docker daemon actif" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker daemon non actif!" -ForegroundColor Red
    Write-Host "   💡 Démarrez Docker Desktop" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Arrêter les conteneurs existants
Write-Host "3️⃣  Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose down 2>$null
Write-Host "   ✅ Conteneurs arrêtés" -ForegroundColor Green

Write-Host ""

# Construire les images
Write-Host "4️⃣  Construction des images Docker..." -ForegroundColor Yellow
Write-Host "   (Cela peut prendre 5-10 minutes la première fois)" -ForegroundColor Cyan
docker-compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erreur lors de la construction!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Images construites avec succès" -ForegroundColor Green

Write-Host ""

# Démarrer les services
Write-Host "5️⃣  Démarrage des services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erreur lors du démarrage!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Attendre que les services soient prêts
Write-Host "6️⃣  Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Vérifier l'état des conteneurs
Write-Host ""
Write-Host "7️⃣  État des conteneurs:" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Tester les services
Write-Host "8️⃣  Test des services:" -ForegroundColor Yellow
Write-Host ""

# Test MongoDB
Write-Host "   📦 MongoDB..." -NoNewline
try {
    docker exec soliferme-mongodb mongosh --quiet --eval "db.adminCommand('ping')" | Out-Null
    Write-Host " ✅" -ForegroundColor Green
} catch {
    Write-Host " ❌" -ForegroundColor Red
}

# Test AI Service
Write-Host "   🤖 AI Service..." -NoNewline
Start-Sleep -Seconds 3
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
} catch {
    Write-Host " ⏳ (démarrage en cours...)" -ForegroundColor Yellow
}

# Test Backend
Write-Host "   🔧 Backend API..." -NoNewline
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
} catch {
    Write-Host " ⏳ (démarrage en cours...)" -ForegroundColor Yellow
}

# Test Frontend
Write-Host "   🌐 Frontend..." -NoNewline
Start-Sleep -Seconds 2
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host " ✅" -ForegroundColor Green
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
} catch {
    Write-Host " ⏳ (démarrage en cours...)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DÉPLOIEMENT TERMINÉ!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Services disponibles:" -ForegroundColor Yellow
Write-Host "   🌐 Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "   🔧 Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "   🤖 AI Service:  http://localhost:5001" -ForegroundColor White
Write-Host "   📦 MongoDB:     localhost:27017" -ForegroundColor White
Write-Host ""
Write-Host "📝 Commandes utiles:" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f           # Voir les logs" -ForegroundColor White
Write-Host "   docker-compose ps                # État des services" -ForegroundColor White
Write-Host "   docker-compose down              # Arrêter tout" -ForegroundColor White
Write-Host "   docker-compose restart backend   # Redémarrer un service" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: DOCKER_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Conseil: Si un service n'est pas encore prêt (⏳), attendez 30s et testez:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:5000/health" -ForegroundColor White
Write-Host ""
