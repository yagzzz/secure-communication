# EncrypTalk Hızlı Başlangıç Rehberi

## 🚀 Tek Komut Kurulum (Ubuntu 22.04+)

```bash
# Yeni Ubuntu sunucu için:
curl -sSL https://raw.githubusercontent.com/yourusername/secure-communication/main/scripts/setup-ubuntu.sh | sudo bash -s yourdomain.com

# Sonra:
# 1. backend/.env içinde MongoDB bilgilerini düzenle
# 2. https://yourdomain.com adresine git
```

---

## 📋 Ön Gereksinimler

- **OS**: Ubuntu 22.04 LTS veya üzeri
- **RAM**: 2GB minimum (4GB önerilir)
- **Disk**: 10GB boş alan (db, log, upload için)
- **Alan Adı**: Sunucu IP’sine yönlenmiş domain
- **Veritabanı**: MongoDB (kurulum scripti ile) veya cloud MongoDB URL

---

## 🔧 Manuel Kurulum (Adım Adım)

### Adım 1: Repo Klonla
```bash
cd /opt
sudo git clone https://github.com/yourusername/secure-communication.git encryptalk
cd encryptalk
```

### Adım 2: Backend Kurulum
```bash
cd backend

# Python venv oluştur
python3.11 -m venv venv
source venv/bin/activate

# Bağımlılıklar (minimal)
pip install -r requirements_clean.txt

# Ortam değişkenleri
cp .env.example .env
nano .env  # MONGO_URL, SECRET_KEY, CORS_ORIGINS, admin bilgileri

# Admin oluştur
python init_admin.py

# Backend test
python server.py
# Uvicorn 0.0.0.0:8001
```

### Adım 3: Frontend Kurulum (ayrı terminal)
```bash
cd frontend

# Bağımlılıklar
npm ci --legacy-peer-deps

# Ortam değişkenleri
cp .env.example .env
nano .env  # REACT_APP_BACKEND_URL=http://localhost:8001

# Dev server
npm start
# http://localhost:3000
```

### Adım 4: Production Kurulum
```bash
# Upload dizinleri
mkdir -p backend/uploads/{profiles,files,stickers,nas}
chmod 755 backend/uploads/{profiles,files,stickers,nas}

# systemd
sudo cp backend/encryptalk-backend.service /etc/systemd/system/

# nginx config
sudo cp backend/nginx-config.example /etc/nginx/sites-available/encryptalk
sudo nano /etc/nginx/sites-available/encryptalk

# nginx enable
sudo ln -s /etc/nginx/sites-available/encryptalk /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# servisler
sudo systemctl daemon-reload
sudo systemctl start encryptalk-backend
sudo systemctl enable encryptalk-backend
sudo systemctl reload nginx

# doğrula
curl http://localhost:8001/api/health
curl https://yourdomain.com/api/health
```

---

## 🔑 Ortam Değişkenleri

### Backend (.env)
```bash
MONGO_URL=mongodb://user:password@localhost:27017/encryptalk
SECRET_KEY=your-super-secret-key-here-32-chars-min
ADMIN_USERNAME=yourname
ADMIN_PASSWORD=strong-password-16-chars-min
ADMIN_PASSPHRASE=passphrase-for-encryption

CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ENVIRONMENT=production
LOG_LEVEL=info

HOST=0.0.0.0
PORT=8001
MAX_UPLOAD_SIZE=104857600
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://yourdomain.com
REACT_APP_SOCKETIO_URL=https://yourdomain.com
REACT_APP_ENV=production
```

---

## 🐛 Hızlı Sorun Giderme

### Backend başlamıyor
```bash
sudo systemctl status mongod
cat backend/.env | grep MONGO_URL
cd backend && source venv/bin/activate && python server.py
```

### Frontend build olmuyor
```bash
rm -rf node_modules package-lock.json
npm ci --legacy-peer-deps
node --version  # 18+
```

### HTTPS bağlanmıyor
```bash
sudo certbot certificates
sudo nginx -t
cat backend/.env | grep CORS_ORIGINS
```

### Realtime çalışmıyor
```bash
sudo journalctl -u encryptalk-backend -n 20 | grep socket
curl -i "https://yourdomain.com/socket.io/?EIO=4&transport=polling"
```

---

## 📊 Sık Kullanılan Komutlar

```bash
sudo journalctl -u encryptalk-backend -f
sudo journalctl -u encryptalk-frontend -f

sudo systemctl restart encryptalk-backend
sudo systemctl restart encryptalk-frontend
sudo systemctl reload nginx

systemctl status encryptalk-backend
systemctl status encryptalk-frontend
systemctl status mongod
systemctl status nginx

curl https://yourdomain.com/api/health | jq
mongo encryptalk -u admin -p password

df -h
top
```

---

## 🔒 Güvenlik Best Practices

1. Varsayılan admin bilgilerini değiştir
2. Güçlü SECRET_KEY üret
3. CORS için `*` kullanma
4. HTTPS zorunlu
5. UFW ile 22/80/443 dışında kapat
6. Günlük backup
7. Güncellemeleri takip et
8. İzleme alarmları kur

---

## 📈 Ölçekleme

1. MongoDB replika / shard
2. Backend yatay ölçek
3. CDN (Cloudflare)
4. Redis cache
5. Upload için S3/GCS

---

## 🆘 Yardım

- **Dokümantasyon**: [README.md](../README.md), [Güvenlik Mimarisi](./08_GUVENLIK_MIMARISI.md), [Doğrulama Listesi](./06_DOGRULAMA_LISTESI.md)

**Last Updated**: 2024
