Write-Host "=== FrutyTrack Frontend Build Debug Script ===" -ForegroundColor Green
Write-Host "Checking Node.js and npm versions..."
node --version
npm --version

Write-Host "`nChecking package.json..."
if (Test-Path "package.json") {
    Write-Host "package.json found" -ForegroundColor Green
} else {
    Write-Host "ERROR: package.json not found" -ForegroundColor Red
    exit 1
}

Write-Host "`nInstalling dependencies..."
npm ci

Write-Host "`nChecking TypeScript configuration..."
if (Test-Path "tsconfig.json") {
    Write-Host "tsconfig.json found" -ForegroundColor Green
    Write-Host "Running TypeScript check..."
    npx tsc --noEmit --project tsconfig.json
    if ($LASTEXITCODE -ne 0) {
        Write-Host "TypeScript check failed" -ForegroundColor Yellow
    }
} else {
    Write-Host "tsconfig.json not found" -ForegroundColor Yellow
}

Write-Host "`nRunning build with verbose output..."
$env:CI = "true"
$env:GENERATE_SOURCEMAP = "false"
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nBuild completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nBuild failed!" -ForegroundColor Red
}
