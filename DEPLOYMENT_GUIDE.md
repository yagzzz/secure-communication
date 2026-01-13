# EncrypTalk Deployment Guide

## Overview

This guide covers deploying EncrypTalk to production on Ubuntu 22.04 LTS with:
- FastAPI backend (async Python)
- React frontend (static SPA)
- MongoDB database (async driver)
- Nginx reverse proxy
- Let's Encrypt SSL/TLS
- Automated backups

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Preparation](#server-preparation)
3. [Automated Setup](#automated-setup)
4. [Manual Setup](#manual-setup)
5. [Post-Deployment](#post-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Scaling](#scaling)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Hardware Requirements
- **CPU**: 2 cores minimum (4+ recommended)
- **RAM**: 2GB minimum (4GB+ recommended)  
- **Disk**: 20GB free space (SSD recommended)
- **Network**: 100Mbps uplink, static IP address

### Software Requirements
- Ubuntu 22.04 LTS (recommended) or newer
- SSH access (root or sudo user)
- Domain name with DNS control
- MongoDB (will be installed)

### Pre-Deployment Checklist
- [ ] Domain DNS pointing to server IP
- [ ] SSH key-based authentication configured
- [ ] Server firewall (UFW) ready
- [ ] MongoDB credentials/connection string ready
- [ ] SSL certificate domain secured (certbot-compatible)

---

## Server Preparation

### 1. Initial Server Setup

```bash
# SSH into server
ssh ubuntu@yourdomain.com

# Update system
sudo apt update && sudo apt upgrade -y

# Set hostname
sudo hostnamectl set-hostname encryptalk

# Set timezone
sudo timedatectl set-timezone UTC

# Create deployment user (optional, recommended)
sudo useradd -m -s /bin/bash encryptalk
sudo usermod -aG sudo encryptalk
```

### 2. Configure SSH Security

```bash
# Disable root login
sudo sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password authentication
sudo sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config

# Change default SSH port (optional)
sudo sed -i 's/^#Port.*/Port 2222/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd
```

### 3. Configure Firewall

```bash
# Enable UFW
sudo ufw --force enable

# Allow SSH
sudo ufw allow 2222/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block all incoming except above
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Verify rules
sudo ufw status
```

### 4. Install System Dependencies

```bash
# Core dependencies
sudo apt install -y \
    build-essential \
    curl \
    git \
    wget \
    nano \
    htop \
    net-tools \
    dnsutils

# Python 3.11
sudo apt install -y \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip

# Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Nginx
sudo apt install -y nginx

# SSL certificates
sudo apt install -y certbot python3-certbot-nginx

# Monitoring & utilities
sudo apt install -y \
    supervisor \
    fail2ban \
    logrotate
```

---

## Automated Setup

### One-Command Deployment

The fastest way to deploy is using the automated setup script:

```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-ubuntu.sh | \
    sudo bash -s yourdomain.com

# Or if you already have the repo cloned:
cd /path/to/secure-communication
chmod +x scripts/setup-ubuntu.sh
sudo scripts/setup-ubuntu.sh yourdomain.com
```

**What the script does:**
1. ✓ Updates system packages
2. ✓ Installs all dependencies (Python, Node, MongoDB, Nginx)
3. ✓ Creates application user (`encryptalk`)
4. ✓ Sets up backend Python venv
5. ✓ Installs Python dependencies
6. ✓ Builds frontend (npm install + npm run build)
7. ✓ Creates systemd service files
8. ✓ Configures Nginx reverse proxy
9. ✓ Sets up SSL with Certbot
10. ✓ Configures UFW firewall
11. ✓ Starts all services
12. ✓ Verifies deployment with health checks

**After script completes:**
```bash
# Edit backend environment variables
sudo nano /opt/encryptalk/backend/.env

# Update MONGO_URL, SECRET_KEY, CORS_ORIGINS, admin credentials
# Then reload:
sudo systemctl daemon-reload
sudo systemctl restart encryptalk-backend

# Verify deployment
curl https://yourdomain.com/api/health
```

---

## Manual Setup

If you prefer step-by-step control:

### Step 1: Prepare Application Directory

```bash
# Create and navigate to app directory
sudo mkdir -p /opt/encryptalk
cd /opt/encryptalk

# Clone repository
sudo git clone https://github.com/yourusername/secure-communication.git .

# Create application user
sudo useradd -r -s /bin/bash encryptalk 2>/dev/null || true

# Set permissions
sudo chown -R encryptalk:encryptalk /opt/encryptalk
```

### Step 2: Backend Setup

```bash
cd /opt/encryptalk/backend

# Create Python virtual environment
sudo -u encryptalk python3.11 -m venv venv

# Activate and install dependencies
sudo -u encryptalk bash -c "source venv/bin/activate && pip install --upgrade pip && pip install -r requirements_clean.txt"

# Create .env file
sudo -u encryptalk cp .env.example .env

# Edit .env with production values
sudo nano /opt/encryptalk/backend/.env

# Example .env content:
# MONGO_URL=mongodb://localhost:27017/encryptalk
# SECRET_KEY=your-secret-key-here-32-chars
# CORS_ORIGINS=https://yourdomain.com
# ADMIN_USERNAME=yourusername
# ADMIN_PASSWORD=strong-password
# ADMIN_PASSPHRASE=encryption-passphrase

# Initialize database and admin user
sudo -u encryptalk bash -c "source venv/bin/activate && python init_admin.py"
```

### Step 3: Frontend Setup

```bash
cd /opt/encryptalk/frontend

# Install dependencies
sudo -u encryptalk npm ci --legacy-peer-deps

# Create .env file
sudo -u encryptalk cp .env.example .env

# Edit .env
sudo nano /opt/encryptalk/frontend/.env

# Example .env content:
# REACT_APP_BACKEND_URL=https://yourdomain.com

# Build frontend
sudo -u encryptalk npm run build
```

### Step 4: Database Setup

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Test connection
mongo --eval "db.adminCommand('ping')"
```

### Step 5: Configure Services

```bash
# Copy systemd service
sudo cp /opt/encryptalk/backend/encryptalk-backend.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable encryptalk-backend
sudo systemctl start encryptalk-backend

# Verify
sudo systemctl status encryptalk-backend
```

### Step 6: Configure Nginx

```bash
# Copy and edit Nginx config
sudo cp /opt/encryptalk/backend/nginx-config.example /etc/nginx/sites-available/encryptalk

# Edit for your domain
sudo nano /etc/nginx/sites-available/encryptalk
# Replace 'yourdomain.com' with actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/encryptalk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: SSL with Certbot

```bash
# Obtain SSL certificate
sudo certbot certonly \
    --nginx \
    -d yourdomain.com \
    -d www.yourdomain.com \
    -d api.yourdomain.com \
    --non-interactive \
    --agree-tos \
    -m admin@yourdomain.com

# Enable auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run
```

### Step 8: Verify Deployment

```bash
# Test backend health
curl http://127.0.0.1:8001/api/health

# Test frontend accessibility
curl -I http://127.0.0.1/

# Test HTTPS
curl https://yourdomain.com/api/health
curl -I https://yourdomain.com
```

---

## Post-Deployment

### Environment Validation

```bash
# Check all services running
sudo systemctl status encryptalk-backend
sudo systemctl status nginx
sudo systemctl status mongod

# View recent logs
sudo journalctl -u encryptalk-backend -n 20
sudo tail -20 /var/log/nginx/encryptalk_error.log

# Test endpoints
curl https://yourdomain.com/api/health | jq
curl -X POST https://yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
```

### Security Hardening

```bash
# Configure Fail2Ban
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
EOF

sudo systemctl restart fail2ban

# Configure log rotation
sudo tee /etc/logrotate.d/encryptalk > /dev/null << 'EOF'
/var/log/nginx/encryptalk*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
EOF
```

### Backup Configuration

```bash
# Make backup script executable
chmod +x /opt/encryptalk/scripts/backup-restore.sh

# Schedule daily backups at 2 AM
echo "0 2 * * * /opt/encryptalk/scripts/backup-restore.sh backup" | sudo crontab -

# Or manually backup now
sudo /opt/encryptalk/scripts/backup-restore.sh backup

# List backups
sudo /opt/encryptalk/scripts/backup-restore.sh list
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Health endpoint
curl https://yourdomain.com/api/health

# Service status
systemctl status encryptalk-backend
systemctl status nginx
systemctl status mongod

# System resources
df -h              # Disk usage
free -h            # Memory usage
top -bn1 | head    # CPU usage
```

### Weekly Tasks

```bash
# Check logs for errors
sudo journalctl -u encryptalk-backend --since "7 days ago" | grep ERROR
sudo grep ERROR /var/log/nginx/encryptalk_error.log | wc -l

# Check failed authentication attempts
sudo grep "authentication failed" /var/log/fail2ban.log

# Database size
mongo encryptalk --eval "db.stats()"
```

### Monthly Tasks

```bash
# Security updates
sudo apt update && sudo apt upgrade -y

# Check SSL certificate expiry
sudo certbot certificates

# Verify backups
sudo /opt/encryptalk/scripts/backup-restore.sh verify

# Update dependencies
pip list --outdated
npm outdated
```

### Monitoring Tools (Optional)

```bash
# Install Prometheus node exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

---

## Scaling

### Horizontal Scaling (Multiple Backends)

For high traffic, run multiple backend instances:

```bash
# Create 4 instances of backend
for i in {1..4}; do
    PORT=$((8001 + i))
    sudo cp /etc/systemd/system/encryptalk-backend.service \
        /etc/systemd/system/encryptalk-backend-$i.service
    
    sudo sed -i "s/PORT=8001/PORT=$PORT/" \
        /etc/systemd/system/encryptalk-backend-$i.service
    
    sudo systemctl daemon-reload
    sudo systemctl enable encryptalk-backend-$i
    sudo systemctl start encryptalk-backend-$i
done

# Update Nginx upstream
sudo tee /etc/nginx/conf.d/backend_upstream.conf > /dev/null << 'EOF'
upstream backend {
    least_conn;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
    server 127.0.0.1:8004;
    server 127.0.0.1:8005;
}
EOF

# Update Nginx site config to use upstream
sudo sed -i 's/proxy_pass http:\/\/127.0.0.1:8001/proxy_pass http:\/\/backend/' \
    /etc/nginx/sites-available/encryptalk

sudo nginx -t && sudo systemctl reload nginx
```

### Database Scaling

```bash
# For read-heavy workloads, add MongoDB replica set
mongo --eval "
rs.initiate({
    _id: 'rs0',
    members: [
        { _id: 0, host: 'localhost:27017' }
    ]
})
"

# Connection string with replica set
MONGO_URL="mongodb://user:password@localhost:27017/encryptalk?replicaSet=rs0"
```

### CDN Integration

For static assets:

```bash
# Generate asset manifest
cd /opt/encryptalk/frontend/build

# Configure CDN in Nginx
sudo tee /etc/nginx/conf.d/cdn.conf > /dev/null << 'EOF'
# Add CDN URLs to images, JS, CSS
map $request_uri $cdn_url {
    ~^/static/(.*)$ "https://cdn.yourdomain.com/static/$1";
    default "";
}
EOF
```

---

## Troubleshooting

### Backend Issues

```bash
# Check if port 8001 is in use
lsof -i :8001

# Check Python version
python3.11 --version

# Test MongoDB connection
python3.11 << 'EOF'
from pymongo import MongoClient
import os
url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
try:
    client = MongoClient(url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✓ MongoDB OK")
except Exception as e:
    print(f"✗ Error: {e}")
EOF

# Run backend in foreground for debugging
cd /opt/encryptalk/backend
source venv/bin/activate
python server.py
```

### Frontend Issues

```bash
# Check build directory
ls -la /opt/encryptalk/frontend/build/

# Rebuild frontend
cd /opt/encryptalk/frontend
npm ci --legacy-peer-deps
npm run build

# Check Nginx logs
sudo tail -50 /var/log/nginx/encryptalk_error.log
sudo tail -50 /var/log/nginx/encryptalk_access.log

# Test Nginx config
sudo nginx -t
```

### SSL/TLS Issues

```bash
# Check certificate
sudo certbot certificates

# Check certificate validity
openssl s_client -connect yourdomain.com:443 -showcerts 2>/dev/null | grep -A 2 "Verify return"

# Renew certificate manually
sudo certbot renew --force-renewal

# Check renewal logs
sudo tail -50 /var/log/letsencrypt/letsencrypt.log
```

### Performance Issues

```bash
# Check system resources
df -h                    # Disk usage
free -h                  # Memory
top -b -n 1             # CPU

# Check database performance
mongo encryptalk << 'EOF'
db.serverStatus()
db.currentOp()
db.system.profile.find().sort(millis:-1).limit(5)
EOF

# Check slow queries
sudo journalctl -u encryptalk-backend | grep -i "slow"
```

---

## Emergency Procedures

### Service Recovery

```bash
# If backend crashes
sudo systemctl restart encryptalk-backend

# If MongoDB crashes
sudo systemctl restart mongod

# If Nginx fails
sudo nginx -t && sudo systemctl restart nginx
```

### Restore from Backup

```bash
# List available backups
sudo /opt/encryptalk/scripts/backup-restore.sh list

# Restore latest backup
sudo /opt/encryptalk/scripts/backup-restore.sh restore \
    /var/backups/encryptalk/encryptalk-backup-20240115_120000.tar.gz

# This will:
# 1. Stop backend service
# 2. Drop current database
# 3. Restore from backup
# 4. Restore uploads directory
# 5. Start backend service
```

### Database Recovery

```bash
# If database is corrupt, rebuild indices
mongo encryptalk << 'EOF'
db.users.reIndex()
db.conversations.reIndex()
db.messages.reIndex()
EOF
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Created by**: DevOps Team
