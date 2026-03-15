#!/usr/bin/env bash
# Script pour gérer le déploiement Docker Microservices
# Usage: ./docker-manage.sh [start|stop|restart|status|logs|clean]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env"
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Fonctions
print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Vérifier les prérequis
check_requirements() {
    print_header "Vérification des prérequis"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi
    print_success "Docker installé"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        exit 1
    fi
    print_success "Docker Compose installé"
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "$ENV_FILE n'existe pas, création à partir du template"
        cp .env.docker .env
    fi
    print_success "$ENV_FILE trouvé"
}

# Démarrer les services
start_services() {
    print_header "Démarrage des services"
    docker-compose up -d
    print_success "Services démarrés"
    print_warning "Attendre ~30 secondes pour que les services soient sains..."
    sleep 5
    status_services
}

# Arrêter les services
stop_services() {
    print_header "Arrêt des services"
    docker-compose stop
    print_success "Services arrêtés"
}

# Redémarrer les services
restart_services() {
    print_header "Redémarrage des services"
    stop_services
    sleep 2
    start_services
}

# État des services
status_services() {
    print_header "État des services"
    docker-compose ps
    echo ""
    print_header "Health Checks"
    docker-compose exec backend curl -s http://localhost:5000/health > /dev/null && print_success "Backend OK" || print_error "Backend non disponible"
    docker-compose exec backend curl -s http://ai-service:5001/health > /dev/null && print_success "AI Service OK" || print_error "AI Service non disponible"
}

# Voir les logs
show_logs() {
    service=${1:-""}
    if [ -z "$service" ]; then
        print_header "Logs (tous les services, dernières 100 lignes)"
        docker-compose logs --tail 100
    else
        print_header "Logs ($service)"
        docker-compose logs -f "$service"
    fi
}

# Nettoyer les conteneurs et volumes
clean_all() {
    print_header "Nettoyage complet"
    print_warning "Cela supprimera TOUS les conteneurs et les données!"
    read -p "Êtes-vous sûr? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v
        print_success "Nettoyage terminé"
    else
        print_warning "Annulé"
    fi
}

# Tests de connectivité
test_connectivity() {
    print_header "Tests de connectivité"
    
    echo "🧪 Test Backend API..."
    if curl -s http://localhost:35000/health > /dev/null; then
        print_success "Backend API accessible (http://localhost:35000)"
    else
        print_error "Backend API non accessible"
    fi
    
    echo ""
    echo "🧪 Test AI Service..."
    if curl -s http://localhost:5001/health > /dev/null; then
        print_success "AI Service accessible (http://localhost:5001)"
    else
        print_error "AI Service non accessible"
    fi
    
    echo ""
    echo "🧪 Test Frontend..."
    if curl -s http://localhost:38000 > /dev/null; then
        print_success "Frontend accessible (http://localhost:38000)"
    else
        print_error "Frontend non accessible"
    fi
}

# Afficher l'aide
show_help() {
    echo "Usage: ./docker-manage.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Démarrer tous les services"
    echo "  stop        Arrêter tous les services"
    echo "  restart     Redémarrer tous les services"
    echo "  status      Afficher l'état des services"
    echo "  logs        Afficher les logs (tous les services)"
    echo "  logs SERVICE Afficher les logs d'un service spécifique"
    echo "  test        Tester la connectivité"
    echo "  clean       Nettoyer les conteneurs et volumes"
    echo "  help        Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./docker-manage.sh start"
    echo "  ./docker-manage.sh logs backend"
    echo "  ./docker-manage.sh status"
}

# Main
main() {
    check_requirements
    
    case "${1:-help}" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            status_services
            ;;
        logs)
            show_logs "$2"
            ;;
        test)
            test_connectivity
            ;;
        clean)
            clean_all
            ;;
        *)
            show_help
            ;;
    esac
}

main "$@"
