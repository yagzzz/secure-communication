# EncrypTalk Quick Start Guide

## 🚀 One-Command Deployment (Ubuntu 22.04+)

```bash
# For a new Ubuntu server:
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-ubuntu.sh | sudo bash -s yourdomain.com

# That's it! Then:
# 1. Edit backend/.env with your MongoDB credentials
# 2. Visit https://yourdomain.com
```

---

## 📋 Prerequisites

- **OS**: Ubuntu 22.04 LTS or newer
- **RAM**: 2GB minimum (4GB recommended)
- **Disk**: 10GB free space (for database, logs, uploads)
- **Domain**: A domain name pointing to your server IP
- **Database**: MongoDB (installed by setup script) OR cloud MongoDB URL

---

## 🔧 Manual Setup (Step-by-Step)

If you prefer to understand each step or run locally:

### Step 1: Clone Repository
```bash
cd /opt
sudo git clone https://github.com/yourusername/secure-communication.git encryptalk
cd encryptalk
```

### Step 2: Backend Setup
```bash
cd backend

# Create Python virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies (use minimal version for faster install)
pip install -r requirements_clean.txt

# Configure environment
cp .env.example .env
nano .env  # Edit: MONGO_URL, SECRET_KEY, CORS_ORIGINS, admin credentials

# Initialize admin user
python init_admin.py

# Test backend
python server.py
# Should print: "Uvicorn running on 0.0.0.0:8001"
```

### Step 3: Frontend Setup (in another terminal)
```bash
cd frontend

# Install dependencies
npm ci --legacy-peer-deps

# Configure environment
cp .env.example .env
nano .env  # Edit: REACT_APP_BACKEND_URL=http://localhost:8001

# Run development server
npm start
# Visit http://localhost:3000
```

### Step 4: Production Deployment
```bash
# (After successful local testing)

# Create upload directories
mkdir -p backend/uploads/{profiles,files,stickers,nas}
chmod 755 backend/uploads/{profiles,files,stickers,nas}

# Copy systemd service
sudo cp backend/encryptalk-backend.service /etc/systemd/system/

# Copy nginx config
sudo cp backend/nginx-config.example /etc/nginx/sites-available/encryptalk

# Edit nginx config for your domain
sudo nano /etc/nginx/sites-available/encryptalk

# Enable nginx site
sudo ln -s /etc/nginx/sites-available/encryptalk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Start services
sudo systemctl daemon-reload
sudo systemctl start encryptalk-backend
sudo systemctl enable encryptalk-backend
sudo systemctl reload nginx

# Verify
curl http://localhost:8001/api/health
curl https://yourdomain.com/api/health
```

---

## 🔑 Environment Variables

### Backend (.env)
```bash
# Required
MONGO_URL=mongodb://user:password@localhost:27017/encryptalk
SECRET_KEY=your-super-secret-key-here-32-chars-min
ADMIN_USERNAME=yourname
ADMIN_PASSWORD=strong-password-16-chars-min
ADMIN_PASSPHRASE=passphrase-for-encryption

# Recommended
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ENVIRONMENT=production
LOG_LEVEL=info

# Optional
HOST=0.0.0.0
PORT=8001
MAX_UPLOAD_SIZE=104857600  # 100MB
```

### Frontend (.env)
```bash
# Required
REACT_APP_BACKEND_URL=https://yourdomain.com

# Optional
REACT_APP_SOCKETIO_URL=https://yourdomain.com
REACT_APP_ENV=production
```

---

## 🐛 Quick Troubleshooting

### Backend won't start
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check .env file
cat backend/.env | grep MONGO_URL

# Run with verbose output
cd backend && source venv/bin/activate && python server.py
```

### Frontend won't build
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm ci --legacy-peer-deps

# Check Node version
node --version  # Should be 18+
```

### Can't connect via HTTPS
```bash
# Check SSL certificate
sudo certbot certificates

# Check nginx config
sudo nginx -t

# Check if CORS_ORIGINS is set (no '*')
cat backend/.env | grep CORS_ORIGINS
```

### Real-time messages not working
```bash
# Check socket.io logs
sudo journalctl -u encryptalk-backend -n 20 | grep socket

# Check WebSocket connection
curl -i "https://yourdomain.com/socket.io/?EIO=4&transport=polling"
```

---

## 📊 Common Commands

```bash
# View backend logs
sudo journalctl -u encryptalk-backend -f

# View frontend logs
sudo journalctl -u encryptalk-frontend -f

# Restart services
sudo systemctl restart encryptalk-backend
sudo systemctl restart encryptalk-frontend
sudo systemctl reload nginx

# Check service status
systemctl status encryptalk-backend
systemctl status encryptalk-frontend
systemctl status mongod
systemctl status nginx

# View health status
curl https://yourdomain.com/api/health | jq

# Access MongoDB CLI
mongo encryptalk -u admin -p password

# Check disk usage
df -h

# Monitor system resources
top
```

---

## 🔒 Security Best Practices

1. **Change defaults**: Update `ADMIN_USERNAME` and `ADMIN_PASSWORD` in .env
2. **Strong SECRET_KEY**: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
3. **CORS restriction**: Never use `'*'` in production, set to your specific domain(s)
4. **SSL/TLS**: Always use HTTPS, get certificate from Let's Encrypt (free)
5. **Firewall**: Configure UFW to allow only 22 (SSH), 80 (HTTP), 443 (HTTPS)
6. **Backups**: Schedule daily MongoDB backups to S3 or external storage
7. **Updates**: Keep system, Node.js, Python, and dependencies updated
8. **Monitoring**: Set up alerts for high CPU/memory/disk usage

---

## 📈 Scaling Tips

As your user base grows:

1. **Database**: Scale MongoDB (add replicas, sharding)
2. **Backend**: Scale horizontally (multiple server instances + load balancer)
3. **Frontend**: Use CDN (CloudFlare, Akamai) for static assets
4. **Caching**: Add Redis layer for session/rate-limit storage
5. **File Storage**: Move uploads to S3/GCS (configure in backend)

---

## 🆘 Need Help?

- **Logs**: Check `/var/log/encryptalk/` and `journalctl`
- **Health**: Visit `https://yourdomain.com/api/health`
- **Database**: Check MongoDB: `mongo --eval "db.serverStatus()"`
- **Documentation**: See `README.md`, `SECURITY.md`, `DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: Production Ready
