# Script pour voir les logs de tous les services

Write-Host "📋 LOGS EN TEMPS RÉEL - SOLIFERME" -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

docker-compose logs -f --tail=50
