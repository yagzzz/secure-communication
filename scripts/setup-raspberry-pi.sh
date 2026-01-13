#!/bin/bash

# ============================================================
# EncrypTalk Setup for Raspberry Pi OS Lite 64-bit
# Version: 1.0
# Platform: Raspberry Pi 4/5 with Raspberry Pi OS Lite 64-bit
# ============================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/encryptalk"
APP_USER="encryptalk"
DOMAIN="${1:-encryptalk.local}"

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

# ==================================================
# RASPBERRY PI OS LITE 64-BIT SETUP
# ==================================================

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}EncrypTalk Setup - Raspberry Pi OS Lite 64-bit${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/model 2>/dev/null && ! grep -q "BCM" /proc/cpuinfo 2>/dev/null; then
    log_warn "This script is optimized for Raspberry Pi"
    log_warn "But can work on other ARM64 systems"
fi

# Check if 64-bit
if [ "$(uname -m)" != "aarch64" ]; then
    log_error "This script requires 64-bit OS (ARM64)"
    log_error "Current system: $(uname -m)"
    exit 1
fi

log_success "Detected: Raspberry Pi OS Lite 64-bit (ARM64)"
echo ""

# ==================================================
# SYSTEM UPDATES
# ==================================================
log_info "Updating system packages..."
sudo apt update
sudo apt upgrade -y

log_success "System updated"

# ==================================================
# INSTALL DEPENDENCIES
# ==================================================
log_info "Installing dependencies..."
log_info "This may take 10-15 minutes on Raspberry Pi..."

# Lightweight build tools (minimal installation)
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    nodejs \
    npm \
    ufw \
    supervisor

log_success "Dependencies installed"

# ==================================================
# NODE.JS LTS (If not recent enough)
# ==================================================
log_info "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

if [ "$NODE_VERSION" -lt 18 ]; then
    log_info "Node.js version too old. Installing LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    log_success "Node.js 18 LTS installed"
else
    log_success "Node.js $(node -v) already installed"
fi

# ==================================================
# MONGODB SETUP
# ==================================================
log_info "MongoDB Configuration..."

read -p "Use MongoDB? (y/n, or use MongoDB Atlas) [y]: " USE_MONGO
USE_MONGO=${USE_MONGO:-y}

if [ "$USE_MONGO" = "y" ]; then
    log_warn "MongoDB installation on Raspberry Pi is not recommended"
    log_info "Options:"
    log_info "  1. MongoDB Atlas (cloud) - RECOMMENDED"
    log_info "  2. Local MongoDB (slower)"
    read -p "Install local MongoDB? (y/n) [n]: " INSTALL_LOCAL_MONGO
    INSTALL_LOCAL_MONGO=${INSTALL_LOCAL_MONGO:-n}
    
    if [ "$INSTALL_LOCAL_MONGO" = "y" ]; then
        log_warn "Installing MongoDB locally (this is slow on RPi)..."
        sudo apt install -y mongodb-server
        sudo systemctl start mongod
        sudo systemctl enable mongod
        log_success "MongoDB installed"
    else
        log_info "Using MongoDB Atlas URL instead"
        log_info "Sign up at: https://www.mongodb.com/cloud/atlas"
        read -p "Enter MongoDB Atlas connection string: " MONGO_URL
    fi
else
    log_warn "Skipping MongoDB installation"
    log_info "You must configure MONGO_URL in backend/.env"
fi

echo ""

# ==================================================
# APPLICATION SETUP
# ==================================================
log_info "Setting up application directory..."

sudo mkdir -p "$APP_DIR"
sudo useradd -r -s /bin/bash "$APP_USER" 2>/dev/null || true
sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

log_success "Application directory ready at $APP_DIR"

# ==================================================
# BACKEND SETUP
# ==================================================
log_info "Setting up Backend..."

cd "$APP_DIR"

# Clone if not already here
if [ ! -d "backend" ]; then
    sudo -u "$APP_USER" git clone https://github.com/yourusername/secure-communication.git . 2>/dev/null || \
    log_warn "Git clone failed - manually copy files to $APP_DIR"
fi

cd backend

# Create Python venv
log_info "Creating Python virtual environment..."
sudo -u "$APP_USER" python3.11 -m venv venv 2>/dev/null || sudo -u "$APP_USER" python3 -m venv venv

# Install dependencies
log_info "Installing Python dependencies (this may take 5-10 minutes)..."
sudo -u "$APP_USER" bash -c "source venv/bin/activate && pip install --upgrade pip"
sudo -u "$APP_USER" bash -c "source venv/bin/activate && pip install -r requirements_clean.txt"

# Create .env
if [ ! -f ".env" ]; then
    sudo -u "$APP_USER" cp .env.example .env
    log_warn "⚠️  IMPORTANT: Edit backend/.env with your settings"
    log_info "Run: sudo nano $APP_DIR/backend/.env"
    
    if [ ! -z "$MONGO_URL" ]; then
        log_info "Setting MONGO_URL in .env..."
        sudo sed -i "s|MONGO_URL=.*|MONGO_URL=$MONGO_URL|" .env
    fi
fi

log_success "Backend setup complete"

# ==================================================
# FRONTEND SETUP
# ==================================================
log_info "Setting up Frontend..."

cd "$APP_DIR/frontend"

# Install dependencies
log_info "Installing npm dependencies (this may take 5-10 minutes)..."
sudo -u "$APP_USER" npm ci --legacy-peer-deps

# Create .env
if [ ! -f ".env" ]; then
    sudo -u "$APP_USER" cp .env.example .env
    log_info "Frontend .env created"
fi

log_success "Frontend setup complete"

# ==================================================
# FIREWALL CONFIGURATION
# ==================================================
log_info "Configuring UFW firewall..."

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp          # SSH
sudo ufw allow 3000/tcp        # Frontend dev
sudo ufw allow 8001/tcp        # Backend dev
sudo ufw --force enable

log_success "Firewall configured"

# ==================================================
# SUPERVISOR SETUP (Auto-start services)
# ==================================================
log_info "Setting up supervisor for auto-restart..."

sudo tee /etc/supervisor/conf.d/encryptalk-backend.conf > /dev/null << 'EOF'
[program:encryptalk-backend]
directory=/opt/encryptalk/backend
command=/opt/encryptalk/backend/venv/bin/python server.py
user=encryptalk
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/encryptalk-backend.log
environment=PATH="/opt/encryptalk/backend/venv/bin"
EOF

sudo tee /etc/supervisor/conf.d/encryptalk-frontend.conf > /dev/null << 'EOF'
[program:encryptalk-frontend]
directory=/opt/encryptalk/frontend
command=npm start
user=encryptalk
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/encryptalk-frontend.log
environment=PATH="/opt/encryptalk/frontend/node_modules/.bin:/usr/bin:/bin"
EOF

sudo supervisorctl reread
sudo supervisorctl update

log_success "Supervisor configured"

# ==================================================
# OPTIONAL: NGINX REVERSE PROXY
# ==================================================
read -p "Install Nginx reverse proxy? (y/n) [n]: " INSTALL_NGINX
INSTALL_NGINX=${INSTALL_NGINX:-n}

if [ "$INSTALL_NGINX" = "y" ]; then
    log_info "Installing Nginx..."
    sudo apt install -y nginx
    
    sudo cp "$APP_DIR/backend/nginx-config.example" /etc/nginx/sites-available/encryptalk
    sudo sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/encryptalk
    
    sudo ln -sf /etc/nginx/sites-available/encryptalk /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    sudo nginx -t && sudo systemctl restart nginx
    
    log_success "Nginx installed and configured"
fi

# ==================================================
# FINAL STATUS
# ==================================================
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✓ EncrypTalk Setup Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Edit configuration:"
echo "   sudo nano $APP_DIR/backend/.env"
echo ""
echo "2. Start services:"
echo "   sudo supervisorctl start all"
echo ""
echo "3. Access the application:"
echo "   Frontend:  http://encryptalk.local:3000"
echo "   Backend:   http://encryptalk.local:8001/api/health"
echo ""
echo -e "${BLUE}Management Commands:${NC}"
echo "   sudo supervisorctl status          # Check status"
echo "   sudo supervisorctl start all       # Start all services"
echo "   sudo supervisorctl stop all        # Stop all services"
echo "   sudo supervisorctl restart all     # Restart all services"
echo ""
echo "   tail -f /var/log/encryptalk-backend.log   # Backend logs"
echo "   tail -f /var/log/encryptalk-frontend.log  # Frontend logs"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Edit .env with your MongoDB URL and secrets"
echo "- On first run, admin user will be created"
echo "- Services auto-start on reboot"
echo ""
