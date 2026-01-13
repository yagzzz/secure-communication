# EncrypTalk - Senaryo Tabanlı Kurulum Rehberi

**Hedef**: Hangi ortamda kurulum yaparsan yap, adım adım kılavuz

---

## 🎯 Senaryonuzu Seçin

### Senaryo 1️⃣: Lokal Geliştirme (Bilgisayarımda Test Etmek)

**Kim için**: Geliştirici, test, katkı sağlayacak kişiler  
**Süre**: 5-10 dakika  
**Koşul**: Bilgisayarda Python, Node.js, Git  
**Erişim**: http://localhost:3000 (sadece bilgisayardan)

#### Adım 1: Repository Klonla

```bash
# Terminal aç
cd ~/Projects
git clone https://github.com/YOUR-USERNAME/secure-communication.git
cd secure-communication
```

#### Adım 2: Başlat

**Hızlı yol:**
```bash
./start.sh
# 1 dakika içinde tüm hazır + http://localhost:3000 aç
```

**Detaylı yol:**

```bash
# Backend
cd backend
python3.11 -m venv venv
source venv/bin/activate

cp .env.example .env
# .env'i düzenle: MONGO_URL ve SECRET_KEY

pip install -r requirements_clean.txt
python init_admin.py
python server.py &  # Arka planda çalış

# Yeni terminal açarak Frontend
cd frontend
npm ci --legacy-peer-deps
cp .env.example .env
npm start
# Otomatik http://localhost:3000 açılır
```

#### Adım 3: Test Et

**Giriş:**
```
admin  / admin123456  (varsayılan)
```

**API Health:**
```bash
curl http://localhost:8001/api/health
# Dönmeli: {"status":"healthy","timestamp":"..."}
```

---

### Senaryo 2️⃣: Raspberry Pi Lokal Ağda (Evde Router Üzerinden)

**Kim için**: Evde, ofiste router üzerinden erişmek isteyenler  
**Süre**: 20-30 dakika  
**Koşul**: Raspberry Pi OS Lite 64-bit, Wi-Fi veya Ethernet  
**Erişim**: http://encryptalk.local:3000 (aynı ağdan), http://192.168.1.100:3000

#### Adım 1: Raspberry Pi OS Kurulumu

```bash
# Bilgisayarında:
# 1. İndir: https://www.raspberrypi.com/software/
# 2. Balena Etcher aç
# 3. "Raspberry Pi OS Lite 64-bit" seç
# 4. microSD seç, yazıldı

# Pi'ye microSD tak, güç ver
# 1-2 dakika boot olur
```

#### Adım 2: SSH ile Bağlan

```bash
# Aynı Wi-Fi'ye bağlı bilgisayardan
ssh pi@raspberrypi.local
# Şifre: raspberry

# Veya IP ile (router'da bak)
ssh pi@192.168.1.100
```

#### Adım 3: Otomatik Kurulum

```bash
# Pi'de
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-raspberry-pi.sh | sudo bash

# Sorular soracak:
# ? MongoDB: Atlas (bedava) veya Local? → Atlas seç
# ? Nginx? → Y
# ? Supervisor? → Y

# 10-15 dakika kurulum yapıyor...
# Bitince komutları gösterecek
```

#### Adım 4: Başlat

```bash
# Pi'de başlat
sudo systemctl start encryptalk-backend
sudo systemctl start encryptalk-frontend

# Kontrol
sudo systemctl status encryptalk-backend

# Loglar
sudo journalctl -u encryptalk-backend -f
```

#### Adım 5: Erişim

**Aynı ağdan:**
```
http://encryptalk.local:3000
# veya
http://192.168.1.100:3000
```

**Kontrol:**
```bash
curl http://192.168.1.100:8001/api/health
```

---

### Senaryo 3️⃣: Cloudflared Tunnel (En Kolay Halka Açma)

**Kim için**: Alan adı yok ama internetten erişmek isteyen  
**Süre**: 15-20 dakika  
**Koşul**: Cloudflare hesabı (bedava), bilgisayar veya Pi  
**Erişim**: https://unique.trycloudflare.com (bedava), https://yourdomain.com (kendi domainle)

#### Adım 1: Cloudflare Kaydı

```bash
# https://www.cloudflare.com
# E-mail ile kaydol
# Confirm e-mail
```

#### Adım 2: Cloudflared Kur

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Ubuntu/Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Windows
# İndir: https://github.com/cloudflare/cloudflared/releases/download/.../cloudflared-windows-amd64.exe
```

#### Adım 3: Giriş Yap

```bash
cloudflared login
# Tarayıcı açılacak, giriş yap
# Sertifikat otomatik indirilecek
```

#### Adım 4: Config Oluştur

```bash
# Config klasörü
mkdir -p ~/.cloudflared

# Config dosyası
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: my-app
credentials-file: ~/.cloudflared/my-app.json

ingress:
  - hostname: my-app.example.com
    service: http://localhost:3000
  - hostname: api.example.com
    service: http://localhost:8001
  - service: http://localhost:3000
EOF
```

#### Adım 5: Tunnel Oluştur & DNS

```bash
# Tunnel oluştur
cloudflared tunnel create my-app

# DNS kaydı ekle (Cloudflare Dashboard)
# DNS > CNAME Record:
# Name: my-app
# Target: my-app.cfargotunnel.com
# Proxy status: Proxied
```

#### Adım 6: Çalıştır

```bash
# Test modunda
cloudflared tunnel run my-app

# Görmen gereken
# Tunnel açıldı: https://my-app.trycloudflare.com

# Arka planda (systemd)
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
[Service]
User=$USER
ExecStart=/usr/bin/cloudflared tunnel run my-app
Restart=always
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

#### Adım 7: Erişim

```
https://my-app.trycloudflare.com  (bedava public)
https://my-app.example.com        (kendi domainle)
https://api.example.com           (backend)
```

**WebSocket Sorun Varsa:**
```bash
# config.yml'ye ekle
transport:
  tcp: true
  udp: true
```

---

### Senaryo 4️⃣: Ubuntu VPS + Alan Adı (Profesyonel)

**Kim için**: Uzun süreli, güvenilir, profesyonel kurulum  
**Süre**: 30-45 dakika  
**Koşul**: VPS (Linode, DigitalOcean, vb.), Alan adı  
**Erişim**: https://yourdomain.com (HTTPS, SSL)

#### Adım 1: VPS Satın Al

**Tavsiye edilen:**
- Linode: $5-6/ay (en kolay)
- DigitalOcean: $4-6/ay
- Hetzner: €2.99/ay (uygun)

**Spec:**
- Ubuntu 22.04 LTS 64-bit
- 1-2 GB RAM
- 20GB SSD

#### Adım 2: SSH ile Bağlan

```bash
# Bilgisayarında
ssh root@203.0.113.45  # VPS IP'nizi koyun

# SSH key ile güvenli (önerilen)
ssh -i ~/.ssh/my-key root@203.0.113.45
```

#### Adım 3: Güvenlik Ayarları

```bash
# VPS'de

# 1. Kök şifre değiştir
passwd

# 2. Yeni user (root olmayacak)
adduser deploy
usermod -aG sudo deploy

# 3. SSH key
mkdir -p /home/deploy/.ssh
cat > /home/deploy/.ssh/authorized_keys << 'EOF'
your-public-key-here (ssh-keygen ile oluştur bilgisayarında)
EOF
chmod 600 /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh -R

# 4. SSH config
sudo nano /etc/ssh/sshd_config
# Değiştir:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

sudo systemctl restart ssh

# 5. Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Adım 4: Otomatik Kurulum

```bash
# VPS'de
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-ubuntu.sh | \
    sudo bash -s your-domain.com

# Otomatik yapıyor:
# ✅ Sistem update
# ✅ Python 3.11, Node.js 18, MongoDB
# ✅ Backend & Frontend kur
# ✅ Nginx reverse proxy
# ✅ SSL (Certbot)
# ✅ Systemd services

# 15-20 dakika takes
```

#### Adım 5: Alan Adını DNS'ye Yönelt

```bash
# Registrar'da (GoDaddy, Namecheap vs.):

A Record:
Name: @  (veya example.com)
Value: 203.0.113.45  (VPS IP'niz)
TTL: 3600

A Record:
Name: www
Value: 203.0.113.45
TTL: 3600

# 10-30 dakika sonra yayılır
```

#### Adım 6: .env Yapılandır

```bash
# VPS'de
sudo nano /opt/encryptalk/backend/.env

# İçerik:
MONGO_URL=mongodb://localhost:27017/encryptalk
SECRET_KEY=generate-openssl-rand-32
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong-password
ADMIN_PASSPHRASE=encryption-passphrase
ENVIRONMENT=production
LOG_LEVEL=info

# Kaydet: Ctrl+O, Enter, Ctrl+X
```

#### Adım 7: Servisler Başlat

```bash
# VPS'de
sudo systemctl start encryptalk-backend
sudo systemctl start encryptalk-frontend
sudo systemctl start nginx

# Kontrol
sudo systemctl status encryptalk-backend
curl https://your-domain.com/api/health
```

#### Adım 8: HTTPS Çalışıyor

```bash
# Otomatik Let's Encrypt SSL kuruldu
# https://your-domain.com açın
```

---

### Senaryo 5️⃣: Raspberry Pi + Cloudflared (Hybrid)

**Kim için**: Pi'de çalış, internetten erişilsin, alan adı yok  
**Süre**: 25-35 dakika  
**Koşul**: Raspberry Pi, Cloudflare hesabı  
**Erişim**: https://unique.trycloudflare.com

#### Adım 1-3: Raspberry Pi'yi Kur

(Senaryo 2'yi takip et)

#### Adım 4: Pi'de Cloudflared Kur

```bash
# Pi'de
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

cloudflared login
```

#### Adım 5: Config

```bash
# Pi'de
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: my-rpi-app
credentials-file: ~/.cloudflared/my-rpi-app.json

ingress:
  - service: http://localhost:3000
EOF
```

#### Adım 6: Tunnel Oluştur

```bash
cloudflared tunnel create my-rpi-app
```

#### Adım 7: Systemd

```bash
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel (Raspberry Pi)
After=network-online.target
[Service]
User=pi
ExecStart=/usr/bin/cloudflared tunnel run my-rpi-app
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

#### Adım 8: Erişim

```
https://unique.trycloudflare.com
```

---

## 🔗 Hızlı Referans

### Komutlar

```bash
# Start
./start.sh              # Lokal (hepsi)
./start.sh backend      # Sadece backend
./start.sh frontend     # Sadece frontend

# Stop
./start.sh stop
pkill -f "python server.py"
pkill -f "npm start"

# Status
./start.sh status
ps aux | grep -E "server.py|npm"

# Logs
./start.sh logs
tail -f backend.log
tail -f frontend.log

# Restart Systemd (VPS)
sudo systemctl restart encryptalk-backend
sudo systemctl restart encryptalk-frontend
sudo systemctl restart nginx

# Restart Supervisor (Pi)
sudo supervisorctl restart all
```

### Port Numaraları

```
Frontend:  3000  (React dev server)
Backend:   8001  (FastAPI + Socket.io)
MongoDB:   27017 (Veritabanı)
Nginx:     80, 443 (HTTP/HTTPS)
```

### Dosya Konumları

**Lokal:**
```
./backend/
./frontend/
./start.sh
```

**VPS (Ubuntu):**
```
/opt/encryptalk/backend/
/opt/encryptalk/frontend/
/etc/systemd/system/encryptalk-*.service
/etc/nginx/sites-enabled/encryptalk
/var/log/encryptalk/
```

**Pi:**
```
/home/pi/encryptalk/backend/
/home/pi/encryptalk/frontend/
/etc/supervisor/conf.d/encryptalk.conf
/var/log/encryptalk/
```

### Yapılandırma Dosyaları

```
.env                    (backend konfigürasyonu)
frontend/.env           (frontend konfigürasyonu)
nginx-config.conf       (ters proxy)
docker-compose.yml      (container setup)
cloudflared/config.yml  (tunnel konfigürasyonu)
```

---

## 🚨 Sık Sorunlar ve Çözümleri

### "Cannot GET /"

```
Frontend build'i eksik veya yanlış yol
→ cd frontend && npm run build
```

### "Connection refused localhost:8001"

```
Backend çalışmıyor
→ ./start.sh backend
→ Logları kontrol et: tail -f backend.log
```

### "MongoDB connection failed"

```
MongoDB çalışmıyor
→ Lokal: sudo systemctl start mongod
→ Atlas: .env'de MONGO_URL kontrol et
```

### "WebSocket connection failed"

```
Nginx config eksik
→ /socket.io/ location var mı?
→ Upgrade headers var mı?
→ sudo nginx -t && sudo systemctl restart nginx
```

### "CORS error"

```
CORS_ORIGINS yanlış
→ .env'de CORS_ORIGINS kontrol et
→ Backend restart: sudo systemctl restart encryptalk-backend
```

---

## ✅ Kontrol Listesi

### Lokal Kurulum
- [ ] Repository klonlandı
- [ ] Python 3.11+ yüklü
- [ ] Node.js 18+ yüklü
- [ ] ./start.sh başlatıldı
- [ ] http://localhost:3000 açılıyor
- [ ] Giriş yapılabiliyor (admin/admin123456)

### Raspberry Pi
- [ ] Raspberry Pi OS Lite 64-bit kurulu
- [ ] SSH bağlantısı çalışıyor
- [ ] setup-raspberry-pi.sh çalıştırıldı
- [ ] http://192.168.1.100:3000 erişiliyor
- [ ] MongoDB Atlas bağlantısı var

### VPS + Alan Adı
- [ ] VPS Ubuntu 22.04'te
- [ ] SSH root erişimi var
- [ ] setup-ubuntu.sh çalıştırıldı
- [ ] Alan adı DNS'ye yöneltildi
- [ ] https://your-domain.com açılıyor
- [ ] SSL çalışıyor

### Cloudflared Tunnel
- [ ] Cloudflare kaydı var
- [ ] cloudflared kurulu
- [ ] config.yml oluşturuldu
- [ ] Tunnel oluşturuldu
- [ ] https://unique.trycloudflare.com erişiliyor

---

**Versiyon**: 2.0  
**Güncelleme**: 2026  
**Destek**: Tüm senaryoları kapsar
