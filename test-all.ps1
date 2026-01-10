# Script de test complet du système

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧪 TESTS COMPLETS - SOLIFERME        ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test 1: Docker
Write-Host "1️⃣  Test Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "   ✅ Docker installé" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker non installé" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Conteneurs en cours
Write-Host ""
Write-Host "2️⃣  État des conteneurs..." -ForegroundColor Yellow
$containers = docker-compose ps --format json 2>$null | ConvertFrom-Json
if ($containers) {
    $running = ($containers | Where-Object { $_.State -eq "running" }).Count
    $total = $containers.Count
    Write-Host "   📦 $running/$total conteneurs en cours" -ForegroundColor Cyan
    
    foreach ($container in $containers) {
        $status = if ($container.State -eq "running") { "✅" } else { "❌" }
        $health = if ($container.Health) { "($($container.Health))" } else { "" }
        Write-Host "      $status $($container.Service) $health" -ForegroundColor White
    }
} else {
    Write-Host "   ⚠️  Aucun conteneur en cours" -ForegroundColor Yellow
    Write-Host "   💡 Lancez: .\deploy-docker.ps1" -ForegroundColor Cyan
}

# Test 3: MongoDB
Write-Host ""
Write-Host "3️⃣  Test MongoDB..." -ForegroundColor Yellow
try {
    $result = docker exec soliferme-mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" 2>$null
    if ($result -eq "1") {
        Write-Host "   ✅ MongoDB connecté" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MongoDB non accessible" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "   ❌ MongoDB conteneur non trouvé" -ForegroundColor Red
    $allPassed = $false
}

# Test 4: AI Service
Write-Host ""
Write-Host "4️⃣  Test AI Service..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -TimeoutSec 3 -UseBasicParsing 2>$null
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        Write-Host "   ✅ AI Service OK (mode: $($data.mode))" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ AI Service non accessible (port 5001)" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Backend API
Write-Host ""
Write-Host "5️⃣  Test Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -TimeoutSec 3 -UseBasicParsing 2>$null
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend API OK" -ForegroundColor Green
        
        # Test endpoints supplémentaires
        $endpoints = @(
            "/api/health",
            "/api/trees"
        )
        
        foreach ($endpoint in $endpoints) {
            try {
                $test = Invoke-WebRequest -Uri "http://localhost:5000$endpoint" -TimeoutSec 2 -UseBasicParsing 2>$null
                Write-Host "      ✅ $endpoint" -ForegroundColor Green
            } catch {
                Write-Host "      ⚠️  $endpoint (nécessite auth)" -ForegroundColor Yellow
            }
        }
    }
} catch {
    Write-Host "   ❌ Backend API non accessible (port 5000)" -ForegroundColor Red
    $allPassed = $false
}

# Test 6: Frontend
Write-Host ""
Write-Host "6️⃣  Test Frontend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing 2>$null
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend accessible" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Frontend non accessible (port 3000)" -ForegroundColor Red
    $allPassed = $false
}

# Test 7: Volumes
Write-Host ""
Write-Host "7️⃣  Test Volumes..." -ForegroundColor Yellow
$volumes = docker volume ls --filter name=soliferme --format "{{.Name}}"
if ($volumes) {
    Write-Host "   📦 Volumes créés:" -ForegroundColor Cyan
    foreach ($vol in $volumes) {
        Write-Host "      ✅ $vol" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Aucun volume trouvé" -ForegroundColor Yellow
}

# Test 8: Réseau
Write-Host ""
Write-Host "8️⃣  Test Réseau..." -ForegroundColor Yellow
$network = docker network ls --filter name=soliferme --format "{{.Name}}"
if ($network) {
    Write-Host "   ✅ Réseau: $network" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Réseau non créé" -ForegroundColor Yellow
}

# Test 9: Fichiers de configuration
Write-Host ""
Write-Host "9️⃣  Test Fichiers de configuration..." -ForegroundColor Yellow
$files = @(
    "docker-compose.yml",
    "Backend\Dockerfile",
    "Backend\src\services\Dockerfile",
    "Frontend\Dockerfile",
    "Backend\.env.docker",
    "Backend\requirements.txt"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file manquant" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test 10: Scripts
Write-Host ""
Write-Host "🔟 Test Scripts..." -ForegroundColor Yellow
$scripts = @(
    "deploy-docker.ps1",
    "docker-logs.ps1",
    "docker-stop.ps1",
    "test-ai-service.ps1"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "   ✅ $script" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $script manquant" -ForegroundColor Red
        $allPassed = $false
    }
}

# Résumé
Write-Host ""
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "🎉 TOUS LES TESTS SONT PASSÉS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Le système est prêt à l'emploi" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 Vous pouvez maintenant:" -ForegroundColor Yellow
    Write-Host "   • Utiliser l'app mobile Flutter" -ForegroundColor White
    Write-Host "   • Accéder au Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   • Tester l'API: http://localhost:5000" -ForegroundColor White
} else {
    Write-Host "⚠️  CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Actions recommandées:" -ForegroundColor Yellow
    Write-Host "   1. Vérifier que Docker Desktop est démarré" -ForegroundColor White
    Write-Host "   2. Lancer: .\deploy-docker.ps1" -ForegroundColor White
    Write-Host "   3. Attendre 30 secondes" -ForegroundColor White
    Write-Host "   4. Relancer ce test" -ForegroundColor White
}
Write-Host "═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
