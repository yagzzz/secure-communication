# VDS DEPLOYMENT REHBERİ

## 🖥️ SUNUCU GEREKsİNİMLERİ

### Minimum:
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **Disk**: 40GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: 100Mbps

### Önerilen (100-500 kullanıcı):
- **CPU**: 4 vCPU
- **RAM**: 8GB
- **Disk**: 80GB SSD
- **OS**: Ubuntu 22.04 LTS
- **Network**: 1Gbps

---

## 🚀 KURULUM ADIMLARI

### 1. **Sunucu Hazırlığı**

```bash
# Sistem güncelleme
sudo apt update && sudo apt upgrade -y

# Gerekli paketler
sudo apt install -y git curl wget nginx certbot python3-certbot-nginx \
    python3.11 python3.11-venv python3-pip nodejs npm mongodb-server \
    supervisor ufw fail2ban

# Node.js ve Yarn
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn pm2
```

---

### 2. **MongoDB Kurulumu**

```bash
# MongoDB başlat
sudo systemctl start mongod
sudo systemctl enable mongod

# Veritabanı ve kullanıcı oluştur
mongo
> use securecomms_db
> db.createUser({
    user: "securecomms_user",
    pwd: "<STRONG_PASSWORD>",
    roles: [{ role: "readWrite", db: "securecomms_db" }]
  })
> exit

# MongoDB authentication aktif et
sudo nano /etc/mongod.conf
# Aşağıdaki satırı ekle:
security:
  authorization: enabled

sudo systemctl restart mongod
```

---

### 3. **Uygulama Kurulumu**

```bash
# Proje klasörü
sudo mkdir -p /var/www/securecomms
cd /var/www/securecomms

# Git'ten çek (veya manuel upload)
git clone <YOUR_REPO_URL> .

# Backend kurulum
cd /var/www/securecomms/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# .env dosyası oluştur
cat > .env << EOF
MONGO_URL="mongodb://securecomms_user:<STRONG_PASSWORD>@localhost:27017"
DB_NAME="securecomms_db"
SECRET_KEY="<256-BIT-RANDOM-KEY>"  # openssl rand -hex 32
CORS_ORIGINS="https://yourdomain.com"
EOF

# Admin kullanıcı oluştur
python init_admin.py

# Frontend kurulum
cd /var/www/securecomms/frontend
yarn install

# .env dosyası
cat > .env << EOF
REACT_APP_BACKEND_URL=https://api.yourdomain.com
EOF

# Build
yarn build
```

---

### 4. **Nginx Yapılandırması**

```bash
# Backend konfig
sudo nano /etc/nginx/sites-available/securecomms-backend
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
# Frontend konfig
sudo nano /etc/nginx/sites-available/securecomms-frontend
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/securecomms/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Konfigüre et
sudo ln -s /etc/nginx/sites-available/securecomms-backend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/securecomms-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### 5. **SSL Sertifikası (Let's Encrypt)**

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Otomatik yenileme
sudo systemctl enable certbot.timer
```

---

### 6. **Supervisor Konfigürasyon**

```bash
sudo nano /etc/supervisor/conf.d/securecomms.conf
```

```ini
[program:securecomms-backend]
command=/var/www/securecomms/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
directory=/var/www/securecomms/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/securecomms/backend.err.log
stdout_logfile=/var/log/securecomms/backend.out.log
user=www-data
environment=PATH="/var/www/securecomms/backend/venv/bin"
```

```bash
# Log klasörü
sudo mkdir -p /var/log/securecomms
sudo chown -R www-data:www-data /var/log/securecomms

# Başlat
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start securecomms-backend
```

---

### 7. **Firewall (UFW)**

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

---

### 8. **Fail2Ban (Brute Force Koruması)**

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
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
```

```bash
sudo systemctl restart fail2ban
```

---

## 📊 OPTIMİZASYON

### 1. **PM2 ile Frontend Serving (Opsiyonel)**

```bash
cd /var/www/securecomms/frontend
pm2 serve build 3000 --spa --name securecomms-frontend
pm2 save
pm2 startup
```

### 2. **MongoDB Optimizasyonu**

```bash
mongo securecomms_db
> db.messages.createIndex({ "conversation_id": 1, "timestamp": -1 })
> db.users.createIndex({ "username": 1 }, { unique: true })
> db.conversations.createIndex({ "participants": 1 })
```

### 3. **Nginx Caching**

```nginx
# /etc/nginx/nginx.conf içinde
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. **Gzip Sıkıştırma**

```nginx
# /etc/nginx/nginx.conf
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml application/json application/javascript;
```

---

## 🔍 MONITORING

### 1. **Log Takibi**

```bash
# Backend logları
sudo tail -f /var/log/securecomms/backend.out.log
sudo tail -f /var/log/securecomms/backend.err.log

# Nginx logları
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB logları
sudo tail -f /var/log/mongodb/mongod.log
```

### 2. **Sistem Kaynakları**

```bash
# Sistem durumu
htop
iotop
netstat -tulpn

# Disk kullanımı
df -h
du -sh /var/www/securecomms/*

# MongoDB durumu
mongo --eval "db.serverStatus()"
```

### 3. **Prometheus + Grafana (Gelişmiş)**

```bash
# Prometheus kurulum
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
./prometheus --config.file=prometheus.yml

# Grafana kurulum
sudo apt install -y grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
# http://yourdomain.com:3000 (admin/admin)
```

---

## 🔄 BACKUP STRATEJİSİ

### 1. **MongoDB Backup**

```bash
#!/bin/bash
# /usr/local/bin/mongo-backup.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://securecomms_user:<PASSWORD>@localhost:27017/securecomms_db" --out=$BACKUP_DIR/$DATE

# 7 günden eski backupları sil
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

# S3'e yükle (opsiyonel)
aws s3 sync $BACKUP_DIR s3://your-bucket/mongodb-backups/
```

```bash
# Crontab ekle (her gün 02:00)
crontab -e
0 2 * * * /usr/local/bin/mongo-backup.sh
```

### 2. **Dosya Backup**

```bash
#!/bin/bash
# /usr/local/bin/files-backup.sh

BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz /var/www/securecomms/backend/uploads/

# 30 günden eski backupları sil
find $BACKUP_DIR -type f -mtime +30 -delete
```

---

## 🐞 SORUN GİDERME

### Backend başlamıyor:
```bash
sudo supervisorctl status
sudo supervisorctl tail securecomms-backend stderr
```

### MongoDB bağlanamıyor:
```bash
mongo --eval "db.adminCommand('ping')"
sudo systemctl status mongod
```

### Nginx 502 Bad Gateway:
```bash
sudo nginx -t
sudo systemctl status nginx
sudo netstat -tulpn | grep 8001
```

### Disk dolu:
```bash
du -sh /var/log/* | sort -h
sudo journalctl --vacuum-size=100M
```

---

## 🎯 PRODUCTION CHECKLIST

- [ ] MongoDB authentication aktif
- [ ] SSL sertifikası kurulu
- [ ] Firewall yapılandırılmış
- [ ] Fail2Ban aktif
- [ ] Supervisor başlatılmış
- [ ] Backup cronjob kurulu
- [ ] Monitoring kurulu
- [ ] .env dosyaları güvenli
- [ ] Admin şifreleri güçlü
- [ ] DNS kayıtları yapılmış
- [ ] CORS origins doğru
- [ ] Rate limiting aktif
- [ ] Log rotation yapılandırılmış

---

## 💬 DESTEK

Sorular için:
- GitHub Issues
- support@yourdomain.com
- Discord: discord.gg/yourserver
