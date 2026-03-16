# Full system smoke test for Soliferme

$allPassed = $true

function Write-Section($title) {
    Write-Host ""
    Write-Host $title -ForegroundColor Yellow
}

function Test-Url($name, $url) {
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 4 -UseBasicParsing
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
            Write-Host "   [OK] $name -> $url" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "   [FAIL] $name -> $url" -ForegroundColor Red
    }
    return $false
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " SOLIFERME - FULL SMOKE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Section "1) Docker availability"
try {
    docker --version | Out-Null
    Write-Host "   [OK] Docker detected" -ForegroundColor Green
} catch {
    Write-Host "   [FAIL] Docker not detected" -ForegroundColor Red
    $allPassed = $false
}

Write-Section "2) Docker containers"
$containers = @()
try {
    $json = docker-compose ps --format json 2>$null
    if ($json) {
        $containers = $json | ConvertFrom-Json
    }
} catch {
    $containers = @()
}

if ($containers -and $containers.Count -gt 0) {
    $running = ($containers | Where-Object { $_.State -eq 'running' }).Count
    Write-Host "   [INFO] Running containers: $running/$($containers.Count)" -ForegroundColor Cyan
    foreach ($container in $containers) {
        $stateText = if ($container.State -eq 'running') { '[OK]' } else { '[FAIL]' }
        Write-Host "   $stateText $($container.Service) state=$($container.State) health=$($container.Health)" -ForegroundColor White
    }
} else {
    Write-Host "   [WARN] No running docker-compose containers found" -ForegroundColor Yellow
    $allPassed = $false
}

Write-Section "3) Services health endpoints"
if (-not (Test-Url 'AI service' 'http://localhost:5001/health')) { $allPassed = $false }
if (-not (Test-Url 'Backend service' 'http://localhost:5000/health')) { $allPassed = $false }
if (-not (Test-Url 'Frontend service' 'http://localhost:3000')) { $allPassed = $false }

Write-Section "4) MongoDB in container"
try {
    $result = docker exec soliferme-mongodb mongosh --quiet --eval "db.adminCommand('ping').ok" 2>$null
    if ($result -eq '1') {
        Write-Host "   [OK] MongoDB ping successful" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] MongoDB ping failed" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "   [FAIL] MongoDB container not available" -ForegroundColor Red
    $allPassed = $false
}

Write-Section "5) Required files"
$requiredFiles = @(
    'docker-compose.yml',
    '.env.docker',
    'Backend\\Dockerfile',
    'Backend\\requirements.txt',
    'Backend\\src\\services\\Dockerfile',
    'Frontend\\Dockerfile',
    'deploy-docker.ps1',
    'docker-logs.ps1',
    'docker-stop.ps1',
    'test-ai-service.ps1'
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] Missing $file" -ForegroundColor Red
        $allPassed = $false
    }
}

Write-Section "6) AI model files"
if (Test-Path 'Backend\\models\\yolov8n.pt') {
    $info = Get-Item 'Backend\\models\\yolov8n.pt'
    Write-Host "   [OK] Backend model yolov8n.pt ($($info.Length) bytes)" -ForegroundColor Green
} else {
    Write-Host "   [FAIL] Missing Backend\\models\\yolov8n.pt" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path 'app2\\assets\\models\\mobilenet_v2_tree_health.tflite') {
    $info = Get-Item 'app2\\assets\\models\\mobilenet_v2_tree_health.tflite'
    Write-Host "   [OK] Mobile model mobilenet_v2_tree_health.tflite ($($info.Length) bytes)" -ForegroundColor Green
} else {
    Write-Host "   [WARN] Missing app2\\assets\\models\\mobilenet_v2_tree_health.tflite" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "RESULT: PASS" -ForegroundColor Green
} else {
    Write-Host "RESULT: PARTIAL/FAIL" -ForegroundColor Yellow
    Write-Host "Recommended: start stack and re-run this script." -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan
