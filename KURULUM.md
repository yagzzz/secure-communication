# EncrypTalk - Ubuntu Server Kurulum Rehberi

Bu rehber, EncrypTalk'ı Ubuntu 22.04+ sunucusuna nasıl kuracağınızı adım adım anlatır.

## 📋 Sistem Gereksinimleri

- Ubuntu 22.04 LTS veya üzeri
- Minimum 2GB RAM (4GB önerilir)
- Minimum 20GB disk alanı (Veritabanı ve yedekleme için)
- Python 3.12+
- Node.js 18+
- MongoDB 6.0+
- (Opsiyonal) Docker & Docker Compose

## ✨ Özellikler

- ✅ **End-to-End Encryption** - Tüm veriler Fernet şifreli
- ✅ **Data Persistence** - Veriler MongoDB'de kalıcı (restart'ta silinmez)
- ✅ **Backup Sistemi** - Otomatik yedekleme ve export
- ✅ **South Park Karakterleri** - Profil özelleştirmesi
- ✅ **NAS Dosya Sistemi** - Şifreli dosya depolaması
- ✅ **Responsive Design** - Mobil, tablet, desktop uyumlu
- ✅ **Admin Panel** - Branding ve sistem ayarları

## 🔧 Kurulum Adımları

### 1. Sistem Güncellemesi

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Gerekli Paketleri Yükle

```bash
# Python ve pip
sudo apt install -y python3.11 python3.11-venv python3-pip

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
npm install -g yarn

# MongoDB
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Nginx (reverse proxy için)
sudo apt install -y nginx

# Certbot (SSL için)
sudo apt install -y certbot python3-certbot-nginx
```

### 3. MongoDB'yi Başlat ve Güvenli Hale Getir

```bash
# MongoDB'yi başlat
sudo systemctl start mongod
sudo systemctl enable mongod

# MongoDB shell'e bağlan
mongosh

# Admin kullanıcısı oluştur (MongoDB shell içinde)
use admin
db.createUser({
  user: "encryptalk_admin",
  pwd: "GÜÇLÜ_ŞİFRE_BURAYA",
  roles: [{ role: "userAdminAnyDatabase", db: "admin" }]
})

# Veritabanı kullanıcısı oluştur
use encryptalk
db.createUser({
  user: "encryptalk_user",
  pwd: "BAŞKA_GÜÇLÜ_ŞİFRE",
  roles: [{ role: "readWrite", db: "encryptalk" }]
})
exit
```

MongoDB'yi kimlik doğrulamalı çalıştır:

```bash
sudo nano /etc/mongod.conf
```

Şu satırları ekle:
```yaml
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
```

### 4. Uygulama Dosyalarını Kopyala

```bash
# Uygulama dizini oluştur
sudo mkdir -p /opt/encryptalk
sudo chown $USER:$USER /opt/encryptalk

# Dosyaları kopyala (scp veya git clone)
cd /opt/encryptalk
# git clone https://github.com/your-repo/encryptalk.git .
# veya
# scp -r local/path/* user@server:/opt/encryptalk/
```

### 5. Backend Kurulumu

```bash
cd /opt/encryptalk/backend

# Virtual environment oluştur
python3.11 -m venv venv
source venv/bin/activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env dosyasını oluştur
# ÖNEMLİ: SECRET_KEY'i sabitleyin, her restart'ta değişmemeli!
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")

cat > .env << EOF
MONGO_URL="mongodb://encryptalk_user:BAŞKA_GÜÇLÜ_ŞİFRE@localhost:27017/encryptalk"
DB_NAME="encryptalk"
SECRET_KEY="$SECRET_KEY"
CORS_ORIGINS="https://your-domain.com"
EOF

# SECRET_KEY'in doğru kaydedildiğini kontrol et
grep SECRET_KEY .env
```

### 6. Frontend Kurulumu

```bash
cd /opt/encryptalk/frontend

# Bağımlılıkları yükle
yarn install

# .env dosyasını oluştur
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://your-domain.com
EOF

# Production build oluştur
yarn build
```

### 7. Systemd Servisleri Oluştur

Backend servisi:

```bash
sudo nano /etc/systemd/system/encryptalk-backend.service
```

```ini
[Unit]
Description=EncrypTalk Backend
After=network.target mongod.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/encryptalk/backend
Environment="PATH=/opt/encryptalk/backend/venv/bin"
ExecStart=/opt/encryptalk/backend/venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable encryptalk-backend
sudo systemctl start encryptalk-backend
```

### 8. Nginx Konfigürasyonu

```bash
sudo nano /etc/nginx/sites-available/encryptalk
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL (Certbot tarafından otomatik eklenir)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Güvenlik başlıkları
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend (static files)
    root /opt/encryptalk/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        client_max_body_size 100M;
    }

    # Dosya yükleme boyutu
    client_max_body_size 100M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/encryptalk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 9. SSL Sertifikası (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com
```

### 10. Firewall Ayarları

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 11. Admin Kullanıcısı Oluştur

```bash
cd /opt/encryptalk/backend
source venv/bin/activate
python init_admin.py
```

## 🔒 Güvenlik Kontrol Listesi

- [ ] MongoDB kimlik doğrulaması aktif
- [ ] Güçlü SECRET_KEY ayarlandı ve .env dosyasına kaydedildi
- [ ] SSL/TLS aktif
- [ ] Firewall kuralları tanımlandı
- [ ] Admin şifresi değiştirildi
- [ ] Dosya izinleri kontrol edildi

## ⚠️ ÖNEMLİ UYARILAR

### SECRET_KEY Hakkında

**KRİTİK:** `SECRET_KEY` değeri tüm mesajlarınızın şifrelenmesi için kullanılır. Bu değer:

1. ✅ **Sabit kalmalı** - Sunucu her yeniden başlatıldığında aynı değer kullanılmalı
2. ✅ **.env dosyasında** - `backend/.env` dosyasında saklanmalı
3. ❌ **Değişmemeli** - Değiştirilirse eski mesajlar okunamaz hale gelir
4. ❌ **Paylaşılmamalı** - Git'e commit edilmemeli, kimseyle paylaşılmamalı

**SECRET_KEY yoksa veya her seferinde yeniden oluşturulursa:**
- Sunucu her yeniden başladığında eski mesajlar şifreli metin olarak görünür
- Kullanıcılar mesajlarını okuyamaz
- Veri kaybı oluşur

**Kontrol için:**
```bash
cd /opt/encryptalk/backend
cat .env | grep SECRET_KEY
# Boş veya "your-secret-key-here" döndürüyorsa HEMEN düzeltin!
```
- [ ] Yedekleme planı hazır

## 📊 İzleme ve Bakım

### Log Dosyaları

```bash
# Backend logları
sudo journalctl -u encryptalk-backend -f

# Nginx logları
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Yedekleme

```bash
# MongoDB yedekleme
mongodump --uri="mongodb://encryptalk_user:ŞIFRE@localhost:27017/encryptalk" --out=/backup/$(date +%Y%m%d)

# Dosya yedekleme
tar -czvf /backup/uploads_$(date +%Y%m%d).tar.gz /opt/encryptalk/backend/uploads
```

## 🔄 Güncelleme

```bash
cd /opt/encryptalk

# Yeni kodu çek
git pull

# Backend güncelle
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart encryptalk-backend

# Frontend güncelle
cd ../frontend
yarn install
yarn build
```

## ❓ Sorun Giderme

### Backend başlamıyor

```bash
# Logları kontrol et
sudo journalctl -u encryptalk-backend --no-pager -n 50

# MongoDB bağlantısını test et
mongosh "mongodb://encryptalk_user:ŞIFRE@localhost:27017/encryptalk"
```

### 502 Bad Gateway

```bash
# Backend çalışıyor mu?
sudo systemctl status encryptalk-backend

# Port dinleniyor mu?
sudo netstat -tlnp | grep 8001
```

### SSL sorunları

```bash
# Sertifikayı yenile
sudo certbot renew --dry-run
```

## 📞 Destek

Sorun yaşarsanız GitHub Issues üzerinden bildirebilirsiniz.
