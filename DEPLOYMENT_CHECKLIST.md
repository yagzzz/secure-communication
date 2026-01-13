# EncrypTalk Production Deployment Checklist

## Pre-Deployment (Environment Preparation)

### System & Dependencies
- [ ] Ubuntu 22.04 LTS running with updates applied
- [ ] Python 3.11+ installed
- [ ] Node.js 18+ LTS installed
- [ ] MongoDB server installed and running
- [ ] Nginx installed (version 1.20+)
- [ ] SSL certificate ready (Let's Encrypt or commercial)
- [ ] UFW firewall configured
- [ ] SSH key authentication enabled (no password login)

### Repository
- [ ] Git repository cloned to `/opt/encryptalk`
- [ ] Correct branch checked out (main/production)
- [ ] All files present (backend/, frontend/, scripts/)
- [ ] File permissions correct (775 for scripts)
- [ ] .gitignore present (no .env, node_modules, venv committed)

### Backend Preparation
- [ ] Python virtual environment created: `python3.11 -m venv backend/venv`
- [ ] Dependencies installed: `pip install -r requirements_clean.txt`
- [ ] MongoDB URL verified: `MONGO_URL=mongodb://user:pass@host:port/dbname`
- [ ] `.env` file created with production values:
  - [ ] `SECRET_KEY` set (32+ chars, random)
  - [ ] `ADMIN_USERNAME` customized (not "admin")
  - [ ] `ADMIN_PASSWORD` strong (16+ chars)
  - [ ] `ADMIN_PASSPHRASE` set (for encryption key)
  - [ ] `CORS_ORIGINS` restricted (NOT `'*'`)
  - [ ] `ENVIRONMENT` set to "production"
- [ ] Admin user created: `python init_admin.py`
- [ ] Health endpoint accessible: `curl http://localhost:8001/api/health`

### Frontend Preparation
- [ ] Node dependencies installed: `npm ci --legacy-peer-deps`
- [ ] `.env` file created with production values:
  - [ ] `REACT_APP_BACKEND_URL=https://api.yourdomain.com`
  - [ ] `REACT_APP_SOCKETIO_URL=https://api.yourdomain.com` (optional)
- [ ] Build successful: `npm run build` (check build/ directory exists)
- [ ] Build size reasonable (bundle < 500KB gzipped)
- [ ] No console errors in build output
- [ ] Static file serving tested locally

### Security
- [ ] SSL certificate obtained (certbot or manual)
- [ ] HTTPS enforced (HTTP → 301 redirects)
- [ ] HSTS header configured (nginx config)
- [ ] CSP headers configured (nginx config)
- [ ] X-Frame-Options set to SAMEORIGIN
- [ ] X-Content-Type-Options set to nosniff
- [ ] MongoDB authentication enabled (username/password)
- [ ] MongoDB IP whitelist configured (if cloud-hosted)
- [ ] Database backup scheduled (daily, encrypted)
- [ ] SSH keys rotated (new key-pair for deployment user)
- [ ] Fail2Ban configured for brute-force protection
- [ ] API rate limiting tested (100 req/min/IP)

### Monitoring & Logging
- [ ] Systemd service files created and tested
- [ ] Log rotation configured (/etc/logrotate.d/encryptalk)
- [ ] Centralized logging setup (journalctl or ELK)
- [ ] Error tracking service configured (optional: Sentry)
- [ ] Health check endpoint monitored (e.g., UptimeRobot)
- [ ] Disk space alerts configured (>90% full warning)
- [ ] Database size monitoring setup
- [ ] Process monitoring setup (systemd auto-restart)

### Backup & Recovery
- [ ] MongoDB backup script created and tested
- [ ] Backup storage verified (S3, local drive, cloud)
- [ ] Restore procedure documented and tested
- [ ] Upload directory backup included
- [ ] Backup retention policy set (7 days for daily, 4 weeks for weekly)
- [ ] RPO/RTO documented (e.g., RPO=1 day, RTO=1 hour)

---

## Deployment Steps (Run Once)

### 1. Execute Setup Script
```bash
curl -sSL https://yourdomain.com/setup.sh | sudo bash -s yourdomain.com
# OR locally:
chmod +x scripts/setup-ubuntu.sh
sudo scripts/setup-ubuntu.sh yourdomain.com
```

### 2. Post-Install Configuration
```bash
# Edit backend environment
sudo nano /opt/encryptalk/backend/.env

# Edit frontend environment
sudo nano /opt/encryptalk/frontend/.env

# Reload systemd to pick up new .env values
sudo systemctl daemon-reload
```

### 3. SSL Certificate Setup (if not auto-done by script)
```bash
# Obtain Let's Encrypt certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Configure auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 4. Start Services
```bash
sudo systemctl start encryptalk-backend
sudo systemctl start encryptalk-frontend
sudo systemctl restart nginx

# Verify services running
sudo systemctl status encryptalk-backend
sudo systemctl status encryptalk-frontend
sudo systemctl status nginx
```

### 5. Verify Deployment
```bash
# Check backend health
curl https://yourdomain.com/api/health
# Expected: {"status":"healthy","database":"connected","timestamp":"..."}

# Check frontend accessibility
curl -I https://yourdomain.com
# Expected: HTTP/2 200, Content-Type: text/html

# Check real-time (should connect)
curl -i "https://yourdomain.com/socket.io/?EIO=4&transport=polling"

# Check SSL certificate
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | grep -A 3 "Verify return code"
# Expected: Verify return code: 0 (ok)
```

---

## Ongoing Operations

### Daily Tasks
- [ ] Check systemd logs: `sudo journalctl -u encryptalk-backend -u encryptalk-frontend --no-pager | tail -50`
- [ ] Verify health endpoint returns 200: `curl https://yourdomain.com/api/health`
- [ ] Check disk usage: `df -h`
- [ ] Monitor MongoDB size: `mongo yourdomain_db --eval "db.stats()"`

### Weekly Tasks
- [ ] Review error logs: `sudo grep ERROR /var/log/nginx/encryptalk_error.log | head -20`
- [ ] Check MongoDB backup status: `ls -lh /backups/encryptalk-*.tar.gz | tail -7`
- [ ] Review Fail2Ban activity: `sudo fail2ban-client status`
- [ ] Test restore process (monthly): `# simulate backup restore`

### Monthly Tasks
- [ ] Update system packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Rotate logs manually: `sudo logrotate -f /etc/logrotate.d/encryptalk`
- [ ] Security audit: check for deprecated dependencies
- [ ] Performance review: check response times, database query performance
- [ ] Capacity planning: verify disk/memory not approaching limits
- [ ] SSL certificate expiry check (should auto-renew, but verify): `certbot certificates`

### Quarterly Tasks
- [ ] Full security audit (check OWASP Top 10)
- [ ] Penetration testing (optional, recommended)
- [ ] Dependency updates: `pip list --outdated`, `npm outdated`
- [ ] Disaster recovery drill (test full restore from backup)

---

## Troubleshooting

### Backend Service Won't Start
```bash
# Check systemd logs
sudo journalctl -u encryptalk-backend -n 50

# Check .env file exists
ls -la /opt/encryptalk/backend/.env

# Test MongoDB connection manually
python3.11 << 'EOF'
import os
from pymongo import MongoClient
url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
try:
    client = MongoClient(url, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    print("✓ MongoDB connected")
except Exception as e:
    print(f"✗ MongoDB error: {e}")
EOF

# Run in foreground to see errors
cd /opt/encryptalk/backend
source venv/bin/activate
python server.py
```

### Frontend Not Loading
```bash
# Check if build directory exists
ls -la /opt/encryptalk/frontend/build/

# Check nginx error logs
sudo tail -50 /var/log/nginx/encryptalk_error.log

# Test nginx config
sudo nginx -t

# Check frontend service (if using systemd)
sudo journalctl -u encryptalk-frontend -n 50

# Rebuild frontend if needed
cd /opt/encryptalk/frontend
npm ci --legacy-peer-deps
npm run build
```

### Real-time Communication Not Working
```bash
# Check socket.io connectivity
curl -v "https://yourdomain.com/socket.io/?EIO=4&transport=polling"

# Check backend logs for socket errors
sudo journalctl -u encryptalk-backend | grep -i socket

# Verify Nginx config has WebSocket headers
sudo grep -A 5 "socket.io" /etc/nginx/sites-enabled/encryptalk
# Should have: Upgrade, Connection: "Upgrade" headers

# Test WebSocket directly
npm install -g wscat
wscat -c "wss://yourdomain.com/socket.io/?EIO=4&transport=websocket"
```

### Database Connection Issues
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Test connection
mongo "mongodb://user:pass@localhost:27017/encryptalk"

# Check MongoDB logs
sudo tail -50 /var/log/mongodb/mongod.log

# For cloud MongoDB (Atlas):
# 1. Verify IP whitelist includes server IP
# 2. Test connection string: mongo "mongodb+srv://user:pass@cluster.mongodb.net/dbname"
# 3. Check database user has correct role assignments
```

### High CPU/Memory Usage
```bash
# Check Python process
sudo ps aux | grep python

# Check Node.js process (if frontend is Node-based)
sudo ps aux | grep node

# Check memory per process
top -b -n 1 | head -20

# Analyze backend logs for slow queries
sudo journalctl -u encryptalk-backend | grep "duration\|slow"

# MongoDB profiling
mongo --eval "db.setProfilingLevel(1)"
mongo --eval "db.system.profile.find().pretty().limit(3)"
```

### SSL Certificate Issues
```bash
# Check certificate expiry
sudo certbot certificates

# Check certificate in browser
openssl s_client -connect yourdomain.com:443 -showcerts

# Force renewal (if expiring soon)
sudo certbot renew --force-renewal

# Check renewal logs
sudo tail -50 /var/log/letsencrypt/letsencrypt.log
```

---

## Rollback Procedure

### If Something Goes Wrong
```bash
# 1. Revert to previous backend version
cd /opt/encryptalk/backend
git checkout previous-version
source venv/bin/activate
pip install -r requirements_clean.txt
sudo systemctl restart encryptalk-backend

# 2. Revert to previous frontend build
cd /opt/encryptalk/frontend
git checkout previous-version
npm ci --legacy-peer-deps
npm run build
sudo systemctl restart encryptalk-frontend

# 3. Restore from backup (if database corrupted)
# See backup/restore scripts in /opt/encryptalk/scripts/

# 4. Check system health after rollback
curl https://yourdomain.com/api/health
curl -I https://yourdomain.com
```

---

## Monitoring Checklist (Set Alerts For)

| Metric | Alert Threshold | Severity |
|--------|-----------------|----------|
| Backend Uptime | < 99.5% (daily) | HIGH |
| Health Endpoint Response | > 2000ms | MEDIUM |
| Database Query Time | > 5000ms | MEDIUM |
| Disk Usage | > 85% | HIGH |
| Memory Usage | > 90% | HIGH |
| Failed Login Attempts | > 10/hour/IP | MEDIUM |
| SSL Cert Expiry | < 14 days | HIGH |
| Error Rate | > 1% of requests | MEDIUM |
| Response Time (p95) | > 1000ms | MEDIUM |

---

## Security Checklist (Ongoing)

- [ ] Review CORS_ORIGINS weekly (ensure no `'*'`)
- [ ] Monitor failed login attempts (Fail2Ban logs)
- [ ] Check for unauthorized API access (403 errors spike)
- [ ] Audit admin user actions (use audit logs if available)
- [ ] Rotate JWT SECRET_KEY annually
- [ ] Rotate database credentials annually
- [ ] Update password hashing iterations as computing power increases
- [ ] Monitor for new CVEs in dependencies (npm audit, pip audit)
- [ ] Review server access logs for suspicious patterns
- [ ] Test encryption key recovery process (Fernet key backup/restore)

---

## Post-Deployment Success Criteria

- [x] **Availability**: Service up 24/7, downtime < 99.5%
- [x] **Performance**: API response time < 500ms (p95), frontend load < 2s
- [x] **Security**: All HTTPS, CORS restricted, rate-limited, OWASP compliant
- [x] **Scalability**: Can handle 2x user load without degradation
- [x] **Monitoring**: All critical metrics logged and alerted
- [x] **Recovery**: Database backups automated, restore time < 1 hour
- [x] **Maintainability**: Clear documentation, automated updates, easy debugging

---

**Created**: $(date)  
**Last Updated**: $(date)  
**Maintained By**: DevOps Team  
**Emergency Contact**: admin@yourdomain.com
