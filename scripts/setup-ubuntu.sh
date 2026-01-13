#!/bin/bash

# ============================================================
# EncrypTalk Complete Setup & Deployment Script for Ubuntu
# Version: 1.0
# Platform: Ubuntu 22.04 LTS+
# ============================================================

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-encryptalk.local}"
APP_DIR="/opt/encryptalk"
APP_USER="encryptalk"
BACKEND_PORT="8001"
FRONTEND_PORT="3000"
MONGODB_PORT="27017"

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

# 1. System Update & Dependencies
log_info "Installing system dependencies..."
sudo apt update && sudo apt upgrade -y

# Core dependencies
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    python3.11 \
    python3.11-venv \
    python3-pip \
    nodejs \
    npm \
    mongodb-server \
    mongodb-clients \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    supervisor \
    systemd

log_success "System dependencies installed"

# 2. Node.js Setup (if not latest)
log_info "Configuring Node.js..."
sudo npm install -g npm@latest
log_success "Node.js configured"

# 3. Application Directory
log_info "Setting up application directory..."
sudo mkdir -p "$APP_DIR"
sudo useradd -r -s /bin/bash "$APP_USER" 2>/dev/null || true
sudo chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
log_success "Application directory ready at $APP_DIR"

# 4. MongoDB Setup
log_info "Setting up MongoDB..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Test MongoDB connection
if mongo --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    log_success "MongoDB is running"
else
    log_error "MongoDB connection failed"
    exit 1
fi

# 5. Backend Setup
log_info "Setting up Backend..."
cd "$APP_DIR"

# Clone or use existing repo
if [ ! -d "backend" ]; then
    log_error "Backend directory not found at $APP_DIR/backend"
    log_info "Please ensure project is in $APP_DIR"
    exit 1
fi

cd "$APP_DIR/backend"

# Setup Python venv
sudo -u "$APP_USER" python3.11 -m venv venv

# Install dependencies
sudo -u "$APP_USER" bash -c "source venv/bin/activate && pip install --upgrade pip && pip install -r requirements_clean.txt"

# Create .env if doesn't exist
if [ ! -f ".env" ]; then
    log_warn "Creating .env from template..."
    cp .env.example .env
    log_info "⚠️  IMPORTANT: Edit $APP_DIR/backend/.env with your MongoDB URL and secrets!"
    log_info "Run: sudo nano $APP_DIR/backend/.env"
fi

# Create MongoDB collections with indices (optional)
log_info "Initializing database..."
cd "$APP_DIR/backend"
sudo -u "$APP_USER" bash -c "source venv/bin/activate && python init_admin.py" || log_warn "Admin creation may have failed - check MongoDB connection"

log_success "Backend setup complete"

# 6. Frontend Setup
log_info "Setting up Frontend..."
cd "$APP_DIR/frontend"

# Create .env if doesn't exist
if [ ! -f ".env" ]; then
    log_warn "Creating .env from template..."
    cp .env.example .env
    log_info "⚠️  IMPORTANT: Update REACT_APP_BACKEND_URL in $APP_DIR/frontend/.env"
    sed -i "s|http://localhost:8001|https://api.$DOMAIN|g" .env
fi

# Install dependencies
sudo -u "$APP_USER" npm ci --legacy-peer-deps

# Build frontend
sudo -u "$APP_USER" npm run build

log_success "Frontend build complete"

# 7. Systemd Services
log_info "Creating systemd services..."

# Backend service
sudo tee /etc/systemd/system/encryptalk-backend.service > /dev/null << 'EOF'
[Unit]
Description=EncrypTalk Backend API
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=notify
User=encryptalk
Group=encryptalk
WorkingDirectory=/opt/encryptalk/backend
Environment="PATH=/opt/encryptalk/backend/venv/bin"
Environment="PYTHONUNBUFFERED=1"
Environment="HOST=127.0.0.1"
Environment="PORT=8001"
Environment="WORKERS=4"
ExecStart=/opt/encryptalk/backend/venv/bin/python server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Frontend service (pm2-managed Node.js)
sudo tee /etc/systemd/system/encryptalk-frontend.service > /dev/null << 'EOF'
[Unit]
Description=EncrypTalk Frontend (Node.js)
After=network.target

[Service]
Type=forking
User=encryptalk
Group=encryptalk
WorkingDirectory=/opt/encryptalk/frontend/build
ExecStart=/usr/bin/node /usr/local/bin/pm2 start serve --name encryptalk-frontend --port 3000
ExecStop=/usr/local/bin/pm2 stop encryptalk-frontend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
log_success "Systemd services created"

# 8. Nginx Reverse Proxy
log_info "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/encryptalk > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN api.$DOMAIN www.$DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN api.$DOMAIN www.$DOMAIN;
    
    # SSL Certificates (certbot will fill these in)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    client_max_body_size 100M;
    
    # API Routes -> Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }
    
    # Socket.IO -> Backend
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }
    
    # Frontend Routes -> React Build
    location / {
        root /opt/encryptalk/frontend/build;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8001/api/health;
        access_log off;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/encryptalk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
if sudo nginx -t; then
    log_success "Nginx configuration valid"
else
    log_error "Nginx configuration error"
    exit 1
fi

sudo systemctl restart nginx
log_success "Nginx configured and restarted"

# 9. SSL with Certbot
log_info "Setting up SSL with Let's Encrypt..."
if [ "$DOMAIN" != "encryptalk.local" ]; then
    sudo certbot --nginx -d "$DOMAIN" -d "api.$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || log_warn "Certbot setup may need manual attention"
    log_success "SSL certificate installed"
else
    log_warn "Skipping SSL for local domain ($DOMAIN)"
    log_info "For production, use a real domain and run: sudo certbot --nginx -d yourdomain.com"
fi

# 10. Firewall Configuration
log_info "Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow from 127.0.0.1 to 127.0.0.1 port 8001  # Local backend
sudo ufw allow from 127.0.0.1 to 127.0.0.1 port 27017 # Local MongoDB
sudo ufw --force enable

log_success "Firewall configured"

# 11. Fail2Ban Configuration
log_info "Configuring Fail2Ban..."
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
logpath = /var/log/nginx/*error.log
EOF

sudo systemctl restart fail2ban
log_success "Fail2Ban configured"

# 12. Log Rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/encryptalk > /dev/null << 'EOF'
/var/log/encryptalk/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 encryptalk encryptalk
    sharedscripts
}
EOF

log_success "Log rotation configured"

# 13. Start Services
log_info "Starting services..."
sudo systemctl start encryptalk-backend
sudo systemctl enable encryptalk-backend

# Wait for backend to be ready
sleep 2

# Check backend health
if curl -s http://127.0.0.1:8001/api/health | grep -q '"status":"healthy"'; then
    log_success "Backend is healthy"
else
    log_warn "Backend health check returned unexpected response"
fi

log_success "Services started"

# Final Summary
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}✓ EncrypTalk Installation Complete!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "${BLUE}Access Points:${NC}"
echo "  Frontend:  https://$DOMAIN"
echo "  Backend:   https://api.$DOMAIN/api"
echo "  API Health: https://api.$DOMAIN/api/health"
echo ""
echo -e "${BLUE}Management:${NC}"
echo "  Backend logs:   sudo journalctl -u encryptalk-backend -f"
echo "  Frontend logs:  sudo journalctl -u encryptalk-frontend -f"
echo "  MongoDB:        mongo"
echo "  Nginx config:   sudo nano /etc/nginx/sites-available/encryptalk"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  1. Edit backend/.env: sudo nano $APP_DIR/backend/.env"
echo "  2. Set strong CORS_ORIGINS"
echo "  3. Change admin password (see .env.example)"
echo "  4. Run migrations if needed"
echo "  5. Test at: curl https://$DOMAIN/api/health"
echo ""
echo -e "${GREEN}============================================================${NC}"
