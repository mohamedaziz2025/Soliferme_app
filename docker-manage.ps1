# Script pour gérer le déploiement Docker Microservices (Windows PowerShell)
# Usage: .\docker-manage.ps1 -Action start|stop|restart|status|logs|clean|test

param(
    [ValidateSet('start', 'stop', 'restart', 'status', 'logs', 'test', 'clean', 'help')]
    [string]$Action = 'help',
    
    [string]$Service = '',
    
    [string]$EnvFile = '.env',
    
    [string]$ComposeFile = 'docker-compose.yml'
)

# Couleurs (pour PowerShell moderne)
$Colors = @{
    Success = 'Green'
    Error   = 'Red'
    Warning = 'Yellow'
    Info    = 'Cyan'
}

# Fonctions
function Print-Header($text) {
    Write-Host "════════════════════════════════════════" -ForegroundColor $Colors.Info
    Write-Host $text -ForegroundColor $Colors.Info
    Write-Host "════════════════════════════════════════" -ForegroundColor $Colors.Info
}

function Print-Success($text) {
    Write-Host "✓ $text" -ForegroundColor $Colors.Success
}

function Print-Error($text) {
    Write-Host "✗ $text" -ForegroundColor $Colors.Error
}

function Print-Warning($text) {
    Write-Host "⚠ $text" -ForegroundColor $Colors.Warning
}

# Vérifier les prérequis
function Check-Requirements {
    Print-Header "Vérification des prérequis"
    
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $docker) {
        Print-Error "Docker n'est pas installé"
        exit 1
    }
    Print-Success "Docker installé"
    
    $compose = Get-Command docker-compose -ErrorAction SilentlyContinue
    if (-not $compose) {
        Print-Error "Docker Compose n'est pas installé"
        exit 1
    }
    Print-Success "Docker Compose installé"
    
    if (-not (Test-Path $EnvFile)) {
        Print-Warning "$EnvFile n'existe pas, création à partir du template"
        Copy-Item '.env.docker' $EnvFile
    }
    Print-Success "$EnvFile trouvé"
}

# Démarrer les services
function Start-Services {
    Print-Header "Démarrage des services"
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Services démarrés"
        Print-Warning "Attendre ~30 secondes pour que les services soient sains..."
        Start-Sleep -Seconds 5
        Get-ServiceStatus
    } else {
        Print-Error "Erreur au démarrage des services"
    }
}

# Arrêter les services
function Stop-Services {
    Print-Header "Arrêt des services"
    docker-compose stop
    
    if ($LASTEXITCODE -eq 0) {
        Print-Success "Services arrêtés"
    }
}

# Redémarrer les services
function Restart-Services {
    Print-Header "Redémarrage des services"
    Stop-Services
    Start-Sleep -Seconds 2
    Start-Services
}

# État des services
function Get-ServiceStatus {
    Print-Header "État des services"
    docker-compose ps
    
    Write-Host ""
    Print-Header "Health Checks"
    
    try {
        $response = docker-compose exec backend curl -s http://localhost:5000/health
        if ($LASTEXITCODE -eq 0) {
            Print-Success "Backend OK"
        } else {
            Print-Error "Backend non disponible"
        }
    } catch {
        Print-Error "Backend non disponible"
    }
    
    try {
        $response = docker-compose exec backend curl -s http://ai-service:5001/health
        if ($LASTEXITCODE -eq 0) {
            Print-Success "AI Service OK"
        } else {
            Print-Error "AI Service non disponible"
        }
    } catch {
        Print-Error "AI Service non disponible"
    }
}

# Voir les logs
function Show-Logs {
    if ([string]::IsNullOrEmpty($Service)) {
        Print-Header "Logs (tous les services, dernières 100 lignes)"
        docker-compose logs --tail 100
    } else {
        Print-Header "Logs ($Service)"
        docker-compose logs -f $Service
    }
}

# Tests de connectivité
function Test-Connectivity {
    Print-Header "Tests de connectivité"
    
    Write-Host "🧪 Test Backend API..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:35000/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Print-Success "Backend API accessible (http://localhost:35000)"
        } else {
            Print-Error "Backend API non accessible"
        }
    } catch {
        Print-Error "Backend API non accessible"
    }
    
    Write-Host ""
    Write-Host "🧪 Test AI Service..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5001/health" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Print-Success "AI Service accessible (http://localhost:5001)"
        } else {
            Print-Error "AI Service non accessible"
        }
    } catch {
        Print-Error "AI Service non accessible"
    }
    
    Write-Host ""
    Write-Host "🧪 Test Frontend..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:38000" -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Print-Success "Frontend accessible (http://localhost:38000)"
        } else {
            Print-Error "Frontend non accessible"
        }
    } catch {
        Print-Error "Frontend non accessible"
    }
}

# Nettoyer
function Clean-All {
    Print-Header "Nettoyage complet"
    $response = Read-Host "Êtes-vous sûr? Cela supprimera TOUS les conteneurs et les données! (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        docker-compose down -v
        Print-Success "Nettoyage terminé"
    } else {
        Print-Warning "Annulé"
    }
}

# Afficher l'aide
function Show-Help {
    Write-Host ""
    Write-Host "Usage: .\docker-manage.ps1 -Action <action> [-Service <service>]" -ForegroundColor $Colors.Info
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor $Colors.Info
    Write-Host "  start       Démarrer tous les services"
    Write-Host "  stop        Arrêter tous les services"
    Write-Host "  restart     Redémarrer tous les services"
    Write-Host "  status      Afficher l'état des services"
    Write-Host "  logs        Afficher les logs (tous les services)"
    Write-Host "  test        Tester la connectivité"
    Write-Host "  clean       Nettoyer les conteneurs et volumes"
    Write-Host "  help        Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:" -ForegroundColor $Colors.Info
    Write-Host "  .\docker-manage.ps1 -Action start"
    Write-Host "  .\docker-manage.ps1 -Action logs -Service backend"
    Write-Host "  .\docker-manage.ps1 -Action status"
    Write-Host ""
}

# Main
Check-Requirements

switch ($Action) {
    'start' {
        Start-Services
    }
    'stop' {
        Stop-Services
    }
    'restart' {
        Restart-Services
    }
    'status' {
        Get-ServiceStatus
    }
    'logs' {
        Show-Logs
    }
    'test' {
        Test-Connectivity
    }
    'clean' {
        Clean-All
    }
    'help' {
        Show-Help
    }
    default {
        Show-Help
    }
}
