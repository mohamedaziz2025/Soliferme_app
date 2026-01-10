# Script pour arrêter tous les services Docker

Write-Host "🛑 Arrêt des services Docker..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "✅ Tous les services sont arrêtés" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Pour redémarrer: .\deploy-docker.ps1" -ForegroundColor Cyan
