#!/bin/bash

# ============================================================
# EncrypTalk Quick Start Script - Universal
# Compatible with: Ubuntu 22.04+, Raspberry Pi OS Lite
# Version: 1.0
# ============================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Detect OS
detect_os() {
    if grep -q "Raspberry Pi" /proc/model 2>/dev/null || grep -q "BCM" /proc/cpuinfo 2>/dev/null; then
        echo "raspberry"
    elif [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" ]]; then
            echo "ubuntu"
        else
            echo "other"
        fi
    else
        echo "other"
    fi
}

OS=$(detect_os)
log_info "Detected OS: $OS"

# ============================================================
# BACKEND START
# ============================================================
start_backend() {
    log_info "Starting Backend..."
    
    if [ ! -d "backend/venv" ]; then
        log_warn "Virtual environment not found. Creating one..."
        cd backend
        python3.11 -m venv venv 2>/dev/null || python3 -m venv venv
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements_clean.txt
        cd ..
    fi
    
    if [ ! -f "backend/.env" ]; then
        log_warn "backend/.env not found!"
        log_info "Creating from template and setup admin..."
        cp backend/.env.example backend/.env
        
        # Generate SECRET_KEY
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))" 2>/dev/null || echo "change-this-secret-key-in-production")
        sed -i "s|your-very-secure-random-key-here-change-in-production|$SECRET_KEY|g" backend/.env
        
        # Admin setup
        read -p "Enter admin username (default: admin): " ADMIN_USER
        ADMIN_USER=${ADMIN_USER:-admin}
        read -sp "Enter admin password (default: admin123456): " ADMIN_PASS
        ADMIN_PASS=${ADMIN_PASS:-admin123456}
        echo ""
        read -sp "Enter admin passphrase for encryption (default: admin-passphrase): " ADMIN_PHRASE
        ADMIN_PHRASE=${ADMIN_PHRASE:-admin-passphrase}
        echo ""
        
        sed -i "s|ADMIN_USERNAME=.*|ADMIN_USERNAME=$ADMIN_USER|g" backend/.env
        sed -i "s|ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$ADMIN_PASS|g" backend/.env
        sed -i "s|ADMIN_PASSPHRASE=.*|ADMIN_PASSPHRASE=$ADMIN_PHRASE|g" backend/.env
        
        log_success "✅ .env configured with admin credentials"
        log_info "Admin username: $ADMIN_USER"
        log_info "Admin password: $ADMIN_PASS"
    fi
    
    cd backend
    source venv/bin/activate
    
    # Start backend in background
    python server.py > ../backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    sleep 3
    
    # Check if backend started successfully
    if kill -0 $BACKEND_PID 2>/dev/null; then
        log_success "Backend started (PID: $BACKEND_PID)"
        echo $BACKEND_PID > ../.backend.pid
        return 0
    else
        log_error "Backend failed to start"
        log_error "Check logs: cat backend.log"
        return 1
    fi
}

# ============================================================
# FRONTEND START
# ============================================================
start_frontend() {
    log_info "Starting Frontend..."
    
    if [ ! -d "frontend/node_modules" ]; then
        log_warn "node_modules not found. Installing dependencies..."
        cd frontend
        npm ci --legacy-peer-deps
        cd ..
    fi
    
    if [ ! -f "frontend/.env" ]; then
        log_warn "frontend/.env not found!"
        log_info "Creating from template..."
        cp frontend/.env.example frontend/.env
        log_info "Frontend .env created with localhost defaults"
    fi
    
    cd frontend
    
    # Start frontend in background
    npm start > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    sleep 5
    
    # Check if frontend started successfully
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        log_success "Frontend started (PID: $FRONTEND_PID)"
        echo $FRONTEND_PID > ../.frontend.pid
        return 0
    else
        log_error "Frontend failed to start"
        log_error "Check logs: cat frontend.log"
        return 1
    fi
}

# ============================================================
# MONGODB CHECK
# ============================================================
check_mongodb() {
    log_info "Checking MongoDB..."
    
    # Check if Docker MongoDB is running
    if docker ps 2>/dev/null | grep -q "mongo"; then
        log_success "MongoDB running in Docker"
        return 0
    fi
    
    # Check if local mongod is running
    if pgrep -x "mongod" > /dev/null; then
        log_success "MongoDB running locally"
        return 0
    fi
    
    # Check if mongod command exists
    if command -v mongod &> /dev/null; then
        log_warn "MongoDB found but not running. Starting..."
        sudo systemctl start mongod 2>/dev/null || log_warn "Could not start MongoDB"
        sleep 2
        return 0
    fi
    
    log_warn "MongoDB not found locally or in Docker"
    log_info "To start MongoDB with Docker, run:"
    log_info "  docker run -d -p 27017:27017 --name encryptalk-mongo mongo:latest"
    return 1
    
    if mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        log_success "MongoDB is running"
        return 0
    else
        log_warn "MongoDB may not be accessible"
        return 1
    fi
}

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
