# EncrypTalk - Kapsamlı Kurulum Rehberi
## Alan Adı, Cloudflared Tunnel, Lokal Çalışma

**Sürüm**: 2.0 | **Tarih**: 2026 | **Dil**: Türkçe | **Durum**: ✅ Tam Detay

---

## 📖 İçindekiler

1. [Lokal Çalışma (Geliştirme)](#lokal-çalışma)
2. [Alan Adı Kurulumu](#alan-adı-kurulumu)
3. [Cloudflared Tunnel ile Üretim](#cloudflared-tunnel)
4. [Geleneksel VPS/Sunucu (Ubuntu)](#geleneksel-vps)
5. [Raspberry Pi Kurulumu](#raspberry-pi-kurulumu)
6. [SSL/TLS Sertifikaları](#ssltls-sertifikaları)
7. [Tüm Yapılandırmalar](#tüm-yapılandırmalar)
8. [Sorun Giderme](#sorun-giderme)

---

# 🏠 Lokal Çalışma (Geliştirme)

## En Kolay Yol: start.sh Script

```bash
# 1. Repository'ye git
cd /path/to/secure-communication

# 2. Başlat
./start.sh

# Otomatik olarak yapıyor:
# ✅ Python venv oluşturur (yoksa)
# ✅ npm install yapar (yoksa)
# ✅ Backend başlatır (http://localhost:8001)
# ✅ Frontend başlatır (http://localhost:3000)
```

**Erişim**:
- 🎨 **Frontend**: http://localhost:3000
- ⚙️ **Backend API**: http://localhost:8001
- 🏥 **Health Check**: http://localhost:8001/api/health

### start.sh Komutları

```bash
./start.sh              # Tüm servisleri başlat
./start.sh backend      # Sadece backend
./start.sh frontend     # Sadece frontend
./start.sh stop         # Durdur
./start.sh status       # Durum kontrol
./start.sh logs         # Live loglar izle

# Lokal kurulum tamamlandıysa:
./start.sh restart all  # Yeniden başlat
```

## Manuel Lokal Kurulum

### Backend Kurulumu

```bash
cd backend

# 1. Virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
venv\Scripts\activate     # Windows

# 2. Bağımlılıklar
pip install -r requirements_clean.txt

# 3. Konfigürasyon
cp .env.example .env
nano .env

# İçerik (.env):
MONGO_URL=mongodb://localhost:27017/encryptalk
SECRET_KEY=your-secret-key-32-chars-random
CORS_ORIGINS=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
ADMIN_PASSPHRASE=admin-passphrase
ENVIRONMENT=development
LOG_LEVEL=debug

# 4. Database kurulumu
python init_admin.py

# 5. Başlat
python server.py

# Çıktı görmeli:
# INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Frontend Kurulumu

```bash
cd frontend

# 1. Bağımlılıklar
npm ci --legacy-peer-deps

# 2. Konfigürasyon
cp .env.example .env

# İçerik (.env):
REACT_APP_BACKEND_URL=http://localhost:8001

# 3. Geliştirme sunucusu başlat
npm start

# Otomatik açılacak: http://localhost:3000
```

### MongoDB Lokal Kurulum

```bash
# Kurulum
sudo apt install -y mongodb-server  # Ubuntu/Debian
brew install mongodb-community      # Mac
# veya Docker
docker run -d -p 27017:27017 mongo:latest

# Başlat
sudo systemctl start mongod
# veya
docker start mongo

# Kontrol
mongo --eval "db.adminCommand('ping')"
# Çıktı: { ok: 1 }
```

---

# 🌐 Alan Adı Kurulumu

## 1. Alan Adı Satın Alma

### Nerede Satın Alınır?
- **Namecheap**: https://www.namecheap.com (Türkiye destekleniyor)
- **GoDaddy**: https://www.godaddy.com
- **Domain.com**: https://www.domain.com
- **Porkbun**: https://porkbun.com (Ucuz)
- **Türkiye**: https://www.nic.tr, https://www.metu.edu.tr

### Fiyatlar (Yıllık)
- `.com`: $8-12
- `.net`, `.org`: $8-12
- `.io`: $35-40
- `.app`: $13-15
- `.tr`: $30-50

## 2. DNS Ayarları

Satın aldıktan sonra DNS'i sunucunuza yöneltmelisiniz.

### Senaryo A: IP Adresi Doğrudan (Geleneksel)

Sunucu IP'niz: `203.0.113.45` olsun.

```dns
Domain Dashboard > DNS Management

A Record:
Name: @
Value: 203.0.113.45
TTL: 3600

A Record (www):
Name: www
Value: 203.0.113.45
TTL: 3600
```

**10 dakika sonra çalışır**: `your-domain.com` → `203.0.113.45`

### Senaryo B: Cloudflare ile (Önerilen)

**Avantajları:**
- ✅ DDoS koruması
- ✅ SSL otomatik
- ✅ CDN (hız)
- ✅ DNS yönetimi kolay
- ✅ Bedava tier var

#### Cloudflare Kurulumu

```bash
# 1. Kaydol
# https://www.cloudflare.com

# 2. Site ekle
# Dashboard > + Bir site ekle
# Domain gir: example.com

# 3. Nameserver değiştir (Registrar'da)
# Registrar Dashboard > DNS Settings
# Nameserver sil:
#   - ns1.registrar.com
#   - ns2.registrar.com
# Ekle (Cloudflare'den al):
#   - ns1.yoursite.ns.cloudflare.com
#   - ns2.yoursite.ns.cloudflare.com

# 4. Cloudflare > DNS > A Record ekle
A Record:
Name: example.com
IPv4 address: 203.0.113.45  (sunucu IP'niz)
Proxy status: Proxied (DNS only de olabilir)
TTL: Auto

# 5. SSL/TLS Ayarı
# SSL/TLS > Overview > Your SSL/TLS encryption mode
# "Full" seç (veya "Full Strict" ise kendi sertifika lazım)
```

**Avantajlar:**
- 🔒 Otomatik SSL (Cloudflare sağlıyor)
- ⚡ CDN ile hızlanma
- 🛡️ DDoS koruması

---

# 🚀 Cloudflared Tunnel ile Üretim

## Nedir Cloudflared Tunnel?

**Cloudflared Tunnel = Evdeki/Ofisdeki PC'yi internete açmak (public URL)**

### Avantajları

✅ **Alan adı yok**: `https://unique-id.trycloudflare.com` bedava  
✅ **IP yok**: Evden herkese açılabilir  
✅ **Port forwarding yok**: Router ayarına gerek yok  
✅ **DDoS koruması**: Cloudflare koruyor  
✅ **SSL sertifikası**: Bedava, otomatik  
✅ **Kendi domainle de çalışır**: `https://example.com`

### Dezavantajları

❌ İnternet kesilirse hizmet kesilir  
❌ Hız biraz daha yavaş (tunnel üzerinden)  
❌ Bedava tier sınırlı

## Kurulum Adımları

### 1. Cloudflare Kaydı

```bash
# https://www.cloudflare.com
# Email: your@email.com
# Password: strong-password
# Kaydol
```

### 2. Cloudflared İndir & Kurulu

```bash
# Linux (Ubuntu/Debian)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
cloudflared --version

# Mac
brew install cloudflare/cloudflare/cloudflared

# Windows
# Indir: https://github.com/cloudflare/cloudflared/releases
# cloudflared-windows-amd64.exe kullan
```

### 3. Cloudflare'de Tunnel Oluştur

```bash
# Terminal/Komut İsteminde
cloudflared login

# Tarayıcı açılacak, giriş yap
# Otomatik olarak sertifikat indirilecek
```

### 4. Tunnel Yapılandır

```bash
# 1. Config dosyası oluştur
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml

# İçerik:
```

```yaml
tunnel: my-app-tunnel  # Benzersiz isim
credentials-file: /home/user/.cloudflared/my-app-tunnel.json

ingress:
  # Frontend
  - hostname: example.com
    service: http://localhost:3000
  
  - hostname: www.example.com
    service: http://localhost:3000
  
  # Backend API
  - hostname: api.example.com
    service: http://localhost:8001
  
  # Wildcard (hepsi)
  - hostname: "*.example.com"
    service: http://localhost:8001
  
  # Varsayılan (frontend)
  - service: http://localhost:3000
```

```bash
# 2. Tunnel oluştur
cloudflared tunnel create my-app-tunnel

# Çıktı: 
# Created tunnel my-app-tunnel with ID: xxx
# Credentials file: /home/user/.cloudflared/my-app-tunnel.json

# 3. DNS records ekle (Cloudflare Dashboard)
# DNS > Create CNAME record
# Name: api
# Target: my-app-tunnel.cfargotunnel.com
# Proxy status: Proxied
```

### 5. Tunnel'ı Başlat

```bash
# Ön test
cloudflared tunnel run my-app-tunnel

# Görmen gereken çıktı:
# Connected to LAX
# ...
# Applied CNAME routes

# Artık erişim:
# https://example.com (frontend)
# https://api.example.com (backend)
# https://my-app-tunnel.trycloudflare.com (bedava public)
```

### 6. Daemonize (Arka Planda Çalışsın)

```bash
# Ubuntu/Linux

# 1. Systemd servisi
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
Wants=network-online.target

[Service]
User=cloudflared
ExecStart=/usr/bin/cloudflared tunnel run my-app-tunnel
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 2. Activate
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# 3. Kontrol
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -f  # Loglar
```

### 7. Kendi Domainle Tunnel

Eğer `example.com` satın aldıysanız:

```bash
# Cloudflare Dashboard
# DNS > Create CNAME record
Name: @  (veya example.com)
Target: my-app-tunnel.cfargotunnel.com
Proxy status: Proxied
TTL: Auto

# config.yml güncelle
ingress:
  - hostname: example.com
    service: http://localhost:3000
  - hostname: api.example.com
    service: http://localhost:8001
  - service: http://localhost:3000
```

---

# 🖥️ Geleneksel VPS/Sunucu (Ubuntu)

## 1. VPS Satın Alma

### Seçenekler

| Provider | Fiyat | Özellik |
|----------|-------|---------|
| **Linode** | $5-6/ay | ⭐ Kolay, 24/7 support |
| **DigitalOcean** | $4-6/ay | ⭐ Basit, türkçe docs |
| **Vultr** | $2.50/ay | Ucuz, iyi performans |
| **AWS** | Bedava 1 yıl | Karmaşık ama güçlü |
| **Hetzner** | €2.99/ay | Uygun, Avrupa |
| **Sunucu.io** | TL fiyat | Türkiye, Türkçe destek |

### Önerilen Specs

- **CPU**: 2 core (1 core yetebilir)
- **RAM**: 2GB (4GB+ tercih)
- **Disk**: 20GB+ (SSD)
- **OS**: Ubuntu 22.04 LTS 64-bit

## 2. VPS'ye Bağlan

```bash
# Terminal/Putty ile
ssh root@203.0.113.45

# SSH key kullan (daha güvenli)
ssh -i ~/.ssh/id_rsa root@203.0.113.45
```

## 3. Temel Güvenlik

```bash
# Kök şifre değiştir
passwd

# Yeni kullanıcı oluştur (root kullanma!)
adduser deploy
usermod -aG sudo deploy

# SSH key authentication
su - deploy
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Public key yapıştır (bilgisayarından ssh-keygen gen et)

# SSH ayarları
sudo nano /etc/ssh/sshd_config
# Düzenle:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

sudo systemctl restart ssh
```

## 4. Alan Adını Yönelt

```bash
# Registrar'da (GoDaddy, Namecheap vs.)
# DNS Settings > A Record
Name: @
Value: 203.0.113.45  (VPS IP'niz)
TTL: 3600
```

## 5. Otomatik Kurulum

```bash
# VPS'de
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-ubuntu.sh | \
    sudo bash -s your-domain.com

# Otomatik yapıyor:
# ✅ Python 3.11, Node.js, MongoDB
# ✅ Backend kurulumu
# ✅ Frontend build
# ✅ Nginx reverse proxy
# ✅ Systemd servisleri
# ✅ Certbot SSL
```

## 6. Konfigürasyon

```bash
# SSH ile bağlan
ssh deploy@your-domain.com

# .env dosyası düzenle
sudo nano /opt/encryptalk/backend/.env

# Ayarla:
MONGO_URL=mongodb://localhost:27017/encryptalk
SECRET_KEY=generate-with-openssl-rand-32
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
ADMIN_USERNAME=choose_username
ADMIN_PASSWORD=strong_password_16_chars_min
ADMIN_PASSPHRASE=encryption_passphrase

# Kaydet (Ctrl+O, Enter, Ctrl+X)
```

## 7. Servisler Başlat

```bash
# Backend
sudo systemctl start encryptalk-backend
sudo systemctl enable encryptalk-backend

# Kontrol
curl https://your-domain.com/api/health
# Dönmeli: {"status":"healthy",...}

# Loglar
sudo journalctl -u encryptalk-backend -f
```

## 8. SSL Sertifikası (Otomatik Kuruldu)

```bash
# Kontrol
sudo certbot certificates

# Yenileme (otomatik ama manual de yapabilirsin)
sudo certbot renew --dry-run

# HTTPS çalışıyor: https://your-domain.com
```

---

# 🍓 Raspberry Pi Kurulumu

## 1. Raspberry Pi OS Kurma

```bash
# Bilgisayarında
# 1. Indir: https://www.raspberrypi.com/software/
# 2. microSD yazma programı (Balena Etcher vs)
# 3. "Raspberry Pi OS Lite 64-bit" seç
# 4. microSD'ye yazıldı, Pi'ye tak

# Pi'de boot ver
```

## 2. SSH ile Bağlan

```bash
# Masaüstünden
ssh pi@192.168.1.100  # RPi lokal ağ IP'si
# Şifre: raspberry

# SSH key kurmak için bkz: Güvenlik section
```

## 3. Hızlı Kurulum

```bash
# Pi'de
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-raspberry-pi.sh | \
    sudo bash -s encryptalk.local

# Yapıyor:
# ✅ Python 3.11, Node.js
# ✅ Backend + Frontend
# ✅ Supervisor (auto-restart)
# ✅ Firewall
```

## 4. Lokal Ağda Erişim

```bash
# Aynı WiFi'deysen
http://encryptalk.local:3000
http://encryptalk.local:8001/api/health

# Veya
http://192.168.1.100:3000
```

## 5. İnternetten Erişim

**Option 1: Cloudflared Tunnel (KOLAY)**
```bash
# Pi'de
cloudflared tunnel run my-rpi-tunnel

# Erişim: https://unique.trycloudflare.com
```

**Option 2: Port Forwarding (Manuel)**
```bash
# Router ayarlarında:
# Port 80 > 192.168.1.100:3000
# Port 8001 > 192.168.1.100:8001

# Public IP'yi bul
curl https://ifconfig.me

# Erişim: http://YOUR_PUBLIC_IP:3000
```

## 6. MongoDB - İki Seçenek

```bash
# A) Local MongoDB (yavaş)
sudo apt install -y mongodb-server
sudo systemctl start mongod

# B) MongoDB Atlas (ÖNERILEN)
# https://www.mongodb.com/cloud/atlas
# Bedava 512MB, çok hızlı
# .env koydu: MONGO_URL=mongodb+srv://user:pass@cluster...
```

---

# 🔐 SSL/TLS Sertifikaları

## Senaryo 1: Cloudflare (Otomatik) ✅

```bash
# Yapıyor:
# ✅ SSL oluştur (Let's Encrypt)
# ✅ Otomatik yenile
# ✅ HTTPS redirect

# İşlem yok, Cloudflare hallediyor!
```

## Senaryo 2: Let's Encrypt (Manuel)

```bash
# Kurulum
sudo apt install -y certbot python3-certbot-nginx

# Sertifika al
sudo certbot certonly --standalone \
  -d example.com \
  -d www.example.com \
  -d api.example.com \
  -m admin@example.com \
  --agree-tos

# Nereye kaydedildi:
# /etc/letsencrypt/live/example.com/
# - cert.pem (sertifika)
# - privkey.pem (private key)
# - fullchain.pem (chain)

# Auto-renew
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Senaryo 3: Self-Signed (Lokal Testleme)

```bash
# 30 gün geçerli
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30

# Nginx'te kullan
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

---

# ⚙️ Tüm Yapılandırmalar

## .env - Backend (backend/.env)

```bash
# ============================================================
# CORE CONFIGURATION
# ============================================================

# Database
MONGO_URL=mongodb://localhost:27017/encryptalk
# Veya Atlas:
# MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/encryptalk?retryWrites=true&w=majority

DB_NAME=encryptalk

# Security
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-32
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password-16-chars-min
ADMIN_PASSPHRASE=your-encryption-passphrase

# CORS - ÇOOK ÖNEMLİ! (tırnak işaretine dikkat)
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com,http://localhost:3000

# API
HOST=0.0.0.0
PORT=8001
WORKERS=4

# Environment
ENVIRONMENT=production  # production / development / staging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# File Upload
MAX_UPLOAD_SIZE=104857600  # 100MB bytes cinsinden

# Optional: Email (gelecekte)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
```

## .env - Frontend (frontend/.env)

```bash
# Backend URL (ÇOOK ÖNEMLİ!)
REACT_APP_BACKEND_URL=https://api.your-domain.com
# Veya:
# REACT_APP_BACKEND_URL=http://localhost:8001

# Socket.IO (opsiyonel, backend URL'den türetilir)
REACT_APP_SOCKETIO_URL=https://api.your-domain.com
# REACT_APP_SOCKETIO_URL=http://localhost:8001

# Environment
REACT_APP_ENV=production  # production / development

# Feature Flags
REACT_APP_ENABLE_HEALTH_CHECK=true
REACT_APP_ENABLE_VISUAL_EDITS=false
```

## Nginx Config (Tam - /etc/nginx/sites-available/encryptalk)

```nginx
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com api.your-domain.com;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Ana Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Sertifikaları
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Ayarları
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    
    # File Upload Size
    client_max_body_size 100M;
    
    # Frontend (React SPA)
    location / {
        root /opt/encryptalk/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Cache busting
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # HTML (no cache)
        location ~* \.html$ {
            expires 5m;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # Health Check (Monitoring)
    location /health {
        proxy_pass http://127.0.0.1:8001/api/health;
        access_log off;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }
    
    # Socket.IO WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8001/socket.io/;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Deny Access
    location ~ /\.ht {
        deny all;
    }
    
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Backend API Server (api.your-domain.com)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```

## Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  # Backend
  backend:
    build: ./backend
    container_name: encryptalk-backend
    ports:
      - "8001:8001"
    environment:
      MONGO_URL: mongodb://mongo:27017/encryptalk
      SECRET_KEY: your-secret-key
      CORS_ORIGINS: http://localhost:3000,http://localhost
    depends_on:
      - mongo
    volumes:
      - ./backend/uploads:/app/uploads
    restart: unless-stopped

  # Frontend
  frontend:
    build: ./frontend
    container_name: encryptalk-frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_BACKEND_URL: http://localhost:8001
    depends_on:
      - backend
    restart: unless-stopped

  # MongoDB
  mongo:
    image: mongo:latest
    container_name: encryptalk-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: encryptalk-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-config.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/build:/usr/share/nginx/html:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  mongo-data:
  mongo-config:
```

---

# 🔧 Sorun Giderme

## Backend Başlamıyor

```bash
# 1. Logları kontrol et
sudo journalctl -u encryptalk-backend -n 50

# 2. .env dosyasını kontrol et
cat /opt/encryptalk/backend/.env | grep -E "MONGO_URL|SECRET_KEY"

# 3. MongoDB'ye bağlanabilir mi?
mongo "mongodb://localhost:27017/encryptalk"
# Veya MongoDB Atlas'tan
mongo "mongodb+srv://user:pass@cluster..."

# 4. Port meşgul mi?
lsof -i :8001

# 5. Python syntaxı kontrol et
python3 -m py_compile server.py

# 6. Manual başlat
cd /opt/encryptalk/backend
source venv/bin/activate
python server.py  # Hata görsün
```

## Frontend Yüklenmez

```bash
# 1. Build'i kontrol et
ls -la /opt/encryptalk/frontend/build/index.html

# 2. Rebuild
cd /opt/encryptalk/frontend
npm run build

# 3. Nginx logları
sudo tail -50 /var/log/nginx/encryptalk_error.log

# 4. Nginx config syntax
sudo nginx -t

# 5. Nginx restart
sudo systemctl restart nginx
```

## WebSocket (Real-time) Çalışmıyor

```bash
# 1. Backend logları
sudo journalctl -u encryptalk-backend | grep -i socket

# 2. Test et
curl -i "http://localhost:8001/socket.io/?EIO=4&transport=polling"

# 3. Nginx config kontrol
# Location /socket.io/ var mı?
sudo grep -A 10 "socket.io" /etc/nginx/sites-enabled/encryptalk

# 4. WebSocket upgrade headers
# Upgrade: websocket
# Connection: Upgrade
```

## SSL Sorunu

```bash
# Sertifika kontrol
sudo certbot certificates

# Yenile
sudo certbot renew --force-renewal

# Let's Encrypt logları
sudo tail -30 /var/log/letsencrypt/letsencrypt.log

# Sertifika detayı
openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout
```

## MongoDB Sorunu

```bash
# Local MongoDB durumu
sudo systemctl status mongod
sudo systemctl restart mongod

# Bağlantı testi
mongo --eval "db.adminCommand('ping')"

# Atlas bağlantısı
mongo "mongodb+srv://user:pass@cluster.mongodb.net/encryptalk?retryWrites=true&w=majority"

# Collection'ları listele
mongo encryptalk --eval "db.getCollectionNames()"
```

## Cloudflared Tunnel Sorunu

```bash
# Status kontrol
systemctl status cloudflared
journalctl -u cloudflared -f

# Manual çalıştır (debug mode)
cloudflared tunnel run my-app-tunnel --verbose

# Tunnel durumu
cloudflared tunnel info my-app-tunnel

# Config syntax
cloudflared config validate
```

---

## 📊 Özet Tablosu

| Senaryo | Setup Zamanı | Zorluk | Maliyeti | SSL | Dış URL |
|---------|---|---|---|---|---|
| **Lokal** | 5 min | ⭐ Kolay | Bedava | Hayır | localhost |
| **Cloudflared** | 15 min | ⭐ Kolay | Bedava | ✅ | bedava `.trycloudflare.com` |
| **VPS + Alan Adı** | 30 min | ⭐⭐ Orta | $5-20 | ✅ | Kendi domain |
| **Raspberry Pi** | 20 min | ⭐⭐ Orta | $50-80 (Pi) | ✅ | Tunnel veya PF |

---

**Hazırlayan**: DevOps Team  
**Sürüm**: 2.0 - Kapsamlı  
**Durum**: ✅ Tüm Senaryoları Kapsıyor
