# ============================================================================
# Script pour Remplacer les IPs Codées en Dur par des Variables d'Environnement
# ============================================================================
# Ce script remplace toutes les références hardcodées à 72.62.71.97
# par des variables d'environnement dans tous les fichiers du projet

param(
    [string]$ProjectRoot = (Get-Location),
    [string]$ApiUrl = "http://localhost:35000",
    [string]$AiServiceUrl = "http://localhost:5001",
    [switch]$DryRun = $false
)

Write-Host "🔄 Remplacement des IPs codées en dur..." -ForegroundColor Cyan
Write-Host "Racine du projet: $ProjectRoot"
Write-Host "URL API cible: $ApiUrl"
Write-Host "URL Service AI: $AiServiceUrl"
if ($DryRun) { Write-Host "⚠️ MODE DRY-RUN: Pas de modifications" -ForegroundColor Yellow }

# Extensions de fichiers à traiter
$extensions = @("*.tsx", "*.ts", "*.jsx", "*.js", "*.dart", "*.ps1", "*.md")

# IP et ports à remplacer
$hardcodedIps = @{
    "72.62.71.97:35000" = "`${REACT_APP_API_URL}"
    "72.62.71.97:5001" = "`${AI_SERVICE_URL}"
    "72.62.71.97:35002" = "`${AI_SERVICE_URL}"
    "72.62.71.97" = "YOUR_SERVER_IP"
}

$replacements = @{
    "http://72.62.71.97:35000" = $ApiUrl
    "http://72.62.71.97:5001" = $AiServiceUrl
    "http://72.62.71.97:35002" = $AiServiceUrl
}

$replaceCount = 0
$files = @()

# Trouver tous les fichiers concernés
foreach ($extension in $extensions) {
    $files += Get-ChildItem -Path $ProjectRoot -Filter $extension -Recurse -ErrorAction SilentlyContinue
}

Write-Host "`n📁 Fichiers à traiter: $($files.Count)" -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Effectuer les remplacements
    foreach ($pattern in $replacements.Keys) {
        if ($content -match [regex]::Escape($pattern)) {
            $content = $content -replace [regex]::Escape($pattern), $replacements[$pattern]
            Write-Host "  ✓ $($file.Name)" -ForegroundColor Green
            $replaceCount++
        }
    }
    
    # Écrire les modifications (ou simuler en dry-run)
    if ($content -ne $originalContent) {
        if (-not $DryRun) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            Write-Host "    ✅ Mis à jour: $($file.Name)" -ForegroundColor Green
        } else {
            Write-Host "    [DRY-RUN] Serait modifié: $($file.Name)" -ForegroundColor Gray
        }
    }
}

Write-Host "`n✨ Terminé!" -ForegroundColor Green
Write-Host "Fichiers traités: $replaceCount"

if ($DryRun) {
    Write-Host "`n💡 Pour appliquer les modifications, relancez le script sans -DryRun" -ForegroundColor Cyan
}
