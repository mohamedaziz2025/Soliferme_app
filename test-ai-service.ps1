# Script de test du service AI

Write-Host "🧪 Test du Service d'Analyse AI" -ForegroundColor Cyan
Write-Host ""

# Fonction pour tester un endpoint
function Test-Endpoint {
    param (
        [string]$Url,
        [string]$Name
    )
    
    Write-Host "  Testing $Name..." -NoNewline
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host " ✅ OK" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Test du service AI
Write-Host "1️⃣  Service AI (Port 5001)" -ForegroundColor Magenta
$aiOk = Test-Endpoint -Url "http://localhost:5001/health" -Name "Health Check"

if ($aiOk) {
    Write-Host "    ✅ Service AI opérationnel" -ForegroundColor Green
} else {
    Write-Host "    ❌ Service AI non accessible" -ForegroundColor Red
    Write-Host "    💡 Démarrez-le avec: python Backend/src/services/ai_analysis_server.py" -ForegroundColor Yellow
}

Write-Host ""

# Test du backend API
Write-Host "2️⃣  Backend API (Port 5000)" -ForegroundColor Blue
$backendOk = Test-Endpoint -Url "http://localhost:5000/health" -Name "Health Check"

if ($backendOk) {
    Write-Host "    ✅ Backend API opérationnel" -ForegroundColor Green
} else {
    Write-Host "    ❌ Backend API non accessible" -ForegroundColor Red
    Write-Host "    💡 Démarrez-le avec: node Backend/src/index.js" -ForegroundColor Yellow
}

Write-Host ""

# Test du frontend (optionnel)
Write-Host "3️⃣  Frontend Web (Port 3000)" -ForegroundColor Green
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Host "    ✅ Frontend Web opérationnel" -ForegroundColor Green
}
catch {
    Write-Host "    ⚠️  Frontend Web non démarré (optionnel)" -ForegroundColor Yellow
    Write-Host "    💡 Démarrez-le avec: cd Frontend; npm start" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($aiOk -and $backendOk) {
    Write-Host "🎉 Système prêt pour l'analyse AI!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📸 Pour tester avec une image:" -ForegroundColor Cyan
    Write-Host '  curl -X POST http://localhost:5001/analyze -F "file=@test_tree.jpg"' -ForegroundColor White
} else {
    Write-Host "⚠️  Certains services ne sont pas disponibles" -ForegroundColor Yellow
    Write-Host "   Utilisez: .\start-all-services.ps1 pour les démarrer" -ForegroundColor White
}

Write-Host ""
