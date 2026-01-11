# Script pour remplacer toutes les URLs localhost:5000 par l'URL du backend hébergé
$backendUrl = "http://72.62.71.97:35000"

# Trouver tous les fichiers TypeScript/JavaScript dans Frontend/src
$files = Get-ChildItem -Path "Frontend\src" -Recurse -Include *.tsx,*.ts,*.jsx,*.js

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Remplacer localhost:5000 par l'URL hébergée
    $newContent = $content -replace 'http://localhost:5000', $backendUrl
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "✅ Updated: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n✨ Done! All URLs have been updated to: $backendUrl" -ForegroundColor Cyan
