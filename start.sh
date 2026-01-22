#!/bin/bash

# ============================================================
# EncrypTalk Frontend Start Script (Idempotent)
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[!]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"

RUN_TESTS=0
RUN_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --test) RUN_TESTS=1 ;;
    --build) RUN_BUILD=1 ;;
    --no-test) RUN_TESTS=0 ;;
    --no-build) RUN_BUILD=0 ;;
    *) log_warn "Bilinmeyen argüman: $arg" ;;
  esac
done

log_info "Doctor kontrolü çalıştırılıyor..."
"$REPO_ROOT/scripts/doctor.sh"

cd "$REPO_ROOT/frontend"

if [ ! -f "package.json" ]; then
  log_error "frontend/package.json bulunamadı"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  log_info "Bağımlılıklar yükleniyor (yarn install)..."
  yarn install
else
  log_success "node_modules hazır"
fi

if [ "$RUN_TESTS" -eq 1 ]; then
  log_info "Testler çalıştırılıyor (CI=1 yarn test)..."
  CI=1 yarn test
fi

if [ "$RUN_BUILD" -eq 1 ]; then
  log_info "Build alınıyor (yarn build)..."
  yarn build
fi

log_success "Frontend başlatılıyor..."
log_info "Varsayılan adres: http://localhost:3000"
log_info "Durdurmak için: Ctrl+C"

yarn start

# ============================================================
# MAIN
# ============================================================
main() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${GREEN}EncrypTalk Quick Start${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    
    # Parse arguments
    START_BACKEND=1
    START_FRONTEND=1
    
    if [ "$1" = "backend" ]; then
        START_FRONTEND=0
    elif [ "$1" = "frontend" ]; then
        START_BACKEND=0
    elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        cat << 'EOF'
Usage: ./start.sh [option]

Options:
  (no args)    Start both backend and frontend
  backend      Start backend only
  frontend     Start frontend only
  stop         Stop running services
  status       Show service status
  logs         Show live logs
  help         Show this message

Examples:
  ./start.sh                    # Start all
  ./start.sh backend            # Start backend only
  ./start.sh stop               # Stop all services
  ./start.sh logs               # Show logs

Access:
  Frontend: http://localhost:3000
  Backend:  http://localhost:8001
  Health:   http://localhost:8001/api/health
EOF
        exit 0
    elif [ "$1" = "stop" ]; then
        if [ -f ".backend.pid" ]; then
            log_info "Stopping backend..."
            kill $(cat .backend.pid) 2>/dev/null || true
            rm -f .backend.pid
            log_success "Backend stopped"
        fi
        if [ -f ".frontend.pid" ]; then
            log_info "Stopping frontend..."
            kill $(cat .frontend.pid) 2>/dev/null || true
            rm -f .frontend.pid
            log_success "Frontend stopped"
        fi
        exit 0
    elif [ "$1" = "status" ]; then
        if [ -f ".backend.pid" ] && kill -0 $(cat .backend.pid) 2>/dev/null; then
            log_success "Backend: Running (PID: $(cat .backend.pid))"
        else
            log_warn "Backend: Not running"
        fi
        if [ -f ".frontend.pid" ] && kill -0 $(cat .frontend.pid) 2>/dev/null; then
            log_success "Frontend: Running (PID: $(cat .frontend.pid))"
        else
            log_warn "Frontend: Not running"
        fi
        exit 0
    elif [ "$1" = "logs" ]; then
        log_info "Backend logs:"
        tail -f backend.log 2>/dev/null &
        log_info "Frontend logs:"
        tail -f frontend.log 2>/dev/null
        exit 0
    fi
    
    # Check prerequisites
    log_info "Checking prerequisites..."
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 not found. Install it first:"
        log_error "  Ubuntu: sudo apt install python3.11"
        log_error "  Raspberry Pi: sudo apt install python3.11"
        exit 1
    fi
    
    if ! command -v node &> /dev/null && ! command -v npm &> /dev/null; then
        log_error "Node.js/npm not found. Install it first:"
        log_error "  Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs"
        log_error "  Raspberry Pi: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install nodejs"
        exit 1
    fi
    
    log_success "Prerequisites found"
    echo ""
    
    # Check MongoDB
    check_mongodb
    echo ""
    
    # Start services
    BACKEND_SUCCESS=1
    FRONTEND_SUCCESS=1
    
    if [ $START_BACKEND -eq 1 ]; then
        start_backend || BACKEND_SUCCESS=0
    fi
    
    echo ""
    
    if [ $START_FRONTEND -eq 1 ]; then
        start_frontend || FRONTEND_SUCCESS=0
    fi
    
    # Summary
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${GREEN}Services Status:${NC}"
    
    if [ $BACKEND_SUCCESS -eq 1 ]; then
        echo -e "${GREEN}✓${NC} Backend running on http://localhost:8001"
        echo -e "  Health check: curl http://localhost:8001/api/health"
    else
        echo -e "${RED}✗${NC} Backend failed to start"
    fi
    
    if [ $FRONTEND_SUCCESS -eq 1 ]; then
        echo -e "${GREEN}✓${NC} Frontend running on http://localhost:3000"
    else
        echo -e "${RED}✗${NC} Frontend failed to start"
    fi
    
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    
    if [ $BACKEND_SUCCESS -eq 1 ] && [ $FRONTEND_SUCCESS -eq 1 ]; then
        echo -e "${GREEN}✓ All services started successfully!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Open http://localhost:3000 in your browser"
        echo "  2. Login with test credentials"
        echo "  3. Start chatting!"
        echo ""
        echo "Logs:"
        echo "  Backend:  tail -f backend.log"
        echo "  Frontend: tail -f frontend.log"
        echo ""
        echo "Stop services: ./start.sh stop"
    else
        log_error "Some services failed to start"
        exit 1
    fi
}

# Run main function
main "$@"
