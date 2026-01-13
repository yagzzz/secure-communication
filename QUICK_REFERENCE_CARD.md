# ⚡ EncrypTalk - Hızlı Referans Kartı

**Amaç**: Tüm komutları ve yapılandırmaları bir sayfada

---

## 🎯 Hangi Dosyayı Oku?

```
NE İstiyorsun?              → DOSYA
1. Hızlı başlangıç          → QUICK_START.md
2. Kendi senaryom var       → SCENARIO_BASED_GUIDE.md
3. Alan adı / Cloudflare    → DOMAIN_CLOUDFLARE_TECHNICAL_GUIDE.md
4. RPi kurulumu             → RASPBERRY_PI_GUIDE.md
5. Tüm detaylar             → COMPREHENSIVE_DEPLOYMENT_GUIDE.md
6. VPS kurulumu             → DEPLOYMENT_GUIDE.md
7. Güvenlik bilgisi         → AUDIT_REPORT.md
8. Üretim checklist         → DEPLOYMENT_CHECKLIST.md
9. Best practices           → PRODUCTION_README.md
10. Nereden başlayacağım?   → DOCUMENTATION_INDEX.md ← YOU ARE HERE
```

---

## 🚀 Başlangıç Komutları (30 Saniye)

### Lokal Test
```bash
cd secure-communication
./start.sh
# http://localhost:3000 açılır
```

### Raspberry Pi
```bash
ssh pi@192.168.1.100
# Şifre: raspberry
curl -sSL script-url | sudo bash
```

### Cloudflared
```bash
cloudflared login
cloudflared tunnel create my-app
cloudflared tunnel run my-app
# https://unique.trycloudflare.com erişiliyor
```

### VPS
```bash
ssh root@203.0.113.45
curl -sSL script-url | sudo bash your-domain.com
# https://your-domain.com erişiliyor
```

---

## 📋 .env Dosyaları Şablonu

### Backend (.env)

```bash
# CORE
MONGO_URL=mongodb://localhost:27017/encryptalk
SECRET_KEY=openssl-rand-32-sonucu-buraya
CORS_ORIGINS=http://localhost:3000,https://your-domain.com

# ADMIN
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong_password_16_chars
ADMIN_PASSPHRASE=encryption_passphrase

# SERVER
HOST=0.0.0.0
PORT=8001
ENVIRONMENT=production
LOG_LEVEL=info
```

### Frontend (.env)

```bash
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_SOCKETIO_URL=http://localhost:8001
REACT_APP_ENV=production
```

---

## 🔧 Sık Komutlar

### Start/Stop

```bash
./start.sh                  # Hepsi başlat
./start.sh backend          # Backend sadece
./start.sh frontend         # Frontend sadece
./start.sh stop             # Durdur
./start.sh status           # Durum kontrol
./start.sh logs             # Live logs
```

### Systemd (VPS)

```bash
sudo systemctl start encryptalk-backend
sudo systemctl stop encryptalk-backend
sudo systemctl restart encryptalk-backend
sudo systemctl status encryptalk-backend
sudo journalctl -u encryptalk-backend -f
```

### MongoDB

```bash
mongo encryptalk            # Local bağlan
mongo mongodb+srv://...     # Atlas bağlan
db.users.find()             # Kullanıcıları listele
db.conversations.find()     # Konuşmaları listele
```

### Nginx

```bash
sudo nginx -t               # Syntax kontrol
sudo systemctl restart nginx
sudo tail -50 /var/log/nginx/error.log
```

### Cloudflared

```bash
cloudflared login
cloudflared tunnel create name
cloudflared tunnel list
cloudflared config validate
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -f
```

---

## 📊 Port Numaraları

```
3000  → Frontend (React)
8001  → Backend (FastAPI)
27017 → MongoDB
80    → HTTP
443   → HTTPS
```

---

## 🔐 SSL/TLS Sertifikası

### Let's Encrypt (VPS)

```bash
sudo certbot certonly --webroot \
  -w /opt/encryptalk/frontend/build \
  -d your-domain.com \
  -d www.your-domain.com

# Yenileme
sudo certbot renew --force-renewal

# Kontrol
openssl x509 -in cert.pem -noout -dates
```

### Cloudflare (Otomatik)

```
Yapacak birşey yok!
Cloudflare SSL otomatik yönetir
```

---

## 🌐 DNS Ayarları

### A Record

```
Type: A
Name: @
Value: 203.0.113.45 (VPS IP'niz)
TTL: 3600
```

### CNAME Record (www)

```
Type: CNAME
Name: www
Value: your-domain.com
TTL: 3600
```

### Cloudflare Nameserver

```
ns1.yoursite.ns.cloudflare.com
ns2.yoursite.ns.cloudflare.com
(Registrar'da değiştir)
```

---

## 🔍 Kontrol & Test

### Health Check

```bash
curl http://localhost:8001/api/health
# {"status":"healthy","timestamp":"..."}

curl -I https://your-domain.com
# HTTP/2 200 OK
```

### DNS Kontrol

```bash
nslookup your-domain.com
# Dönmeli: 203.0.113.45

nslookup your-domain.com 8.8.8.8
# Google DNS ile kontrol
```

### WebSocket Kontrol

```bash
curl "http://localhost:8001/socket.io/?EIO=4&transport=polling"
# 200 response dönmeli
```

### HTTPS Kontrol

```bash
curl -vI https://your-domain.com 2>&1 | grep subject
# Sertifikaları göster

openssl s_client -connect your-domain.com:443
# Detaylı sertifika bilgisi
```

---

## 🚨 Sorun Giderme (2 Dakika)

### Backend başlamıyor

```bash
sudo journalctl -u encryptalk-backend -n 50
# Logları gör

cat /opt/encryptalk/backend/.env | grep MONGO_URL
# Mongo bağlantısı kontrol

python3 -m py_compile server.py
# Syntax hatası kontrol
```

### Frontend yüklenmez

```bash
ls -la /opt/encryptalk/frontend/build/index.html
# Build var mı?

cd /opt/encryptalk/frontend
npm run build
# Rebuild
```

### Cloudflared bağlantısı kesildi

```bash
sudo systemctl restart cloudflared
sudo journalctl -u cloudflared -n 50
# Logları kontrol
```

### WebSocket çalışmıyor

```bash
curl "http://localhost:8001/socket.io/?EIO=4&transport=polling"
# Backend endpoint test

sudo grep -A 10 "socket.io" /etc/nginx/sites-enabled/*
# Nginx config kontrol
```

### SSL sertifikası sorunu

```bash
curl -vI https://your-domain.com 2>&1 | grep "subject"
# Sertifika kontrol

sudo certbot renew --force-renewal
# Let's Encrypt yenile
```

---

## 📊 Hızlı Kontrol Listesi

### Deployment Öncesi ✅

- [ ] .env dosyaları oluşturuldu
- [ ] MongoDB çalışıyor
- [ ] Backend başlatıldı
- [ ] Frontend build edildi
- [ ] Nginx konfigürasyonu doğru
- [ ] SSL sertifikası var
- [ ] DNS doğru yönlendirildi
- [ ] Firewall açıldı (80, 443)
- [ ] Health check çalışıyor
- [ ] WebSocket bağlantısı var

### Deployment Sonrası ✅

- [ ] https://your-domain.com açılıyor
- [ ] Giriş yapılabiliyor
- [ ] Mesajlar gönderilebiliyor
- [ ] Real-time çalışıyor
- [ ] Dosya upload çalışıyor
- [ ] Mobile responsive
- [ ] SSL çalışıyor (HTTPS)
- [ ] Hata yok (logs temiz)
- [ ] Performance iyi
- [ ] Backup yapıldı

---

## 📱 İlişkili Linkler

**Dokümantasyon**:
- [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) - Tüm dosya rehberi
- [SCENARIO_BASED_GUIDE.md](SCENARIO_BASED_GUIDE.md) - 5 senaryodan seçin
- [COMPREHENSIVE_DEPLOYMENT_GUIDE.md](COMPREHENSIVE_DEPLOYMENT_GUIDE.md) - Tüm detaylar
- [DOMAIN_CLOUDFLARE_TECHNICAL_GUIDE.md](DOMAIN_CLOUDFLARE_TECHNICAL_GUIDE.md) - Alan adı + Cloudflare

**Konfigürasyon Dosyaları**:
- [backend/.env.example](../backend/.env.example)
- [frontend/.env.example](../frontend/.env.example)
- [backend/nginx-config.example](../backend/nginx-config.example)

**Script'ler**:
- [start.sh](../start.sh) - Lokal başlangıç
- [scripts/setup-raspberry-pi.sh](../scripts/setup-raspberry-pi.sh) - RPi setup
- [scripts/setup-ubuntu.sh](../scripts/setup-ubuntu.sh) - Ubuntu setup

---

## 🎓 Öğrenme Yolu

```
1. BURADA OKU (bu dosya)
   ↓
2. SCENARIO_BASED_GUIDE.md (senaryonuzu seçin)
   ↓
3. İLGİLİ DETAYL REHBER (seçtiğiniz senaryoya göre)
   ↓
4. ADIM ADIM İZLE
   ↓
5. ✅ BAŞARILI DEPLOYMENT!
```

---

## 💡 Pro Tips

```
✅ Bitti 1 saat ama test edilmedi?
   → curl http://localhost:8001/api/health

✅ Domain alamadınız?
   → Cloudflared tunnel kullanın (bedava, kolay)

✅ VPS'de hiçbir şey açılmıyor?
   → SSH key doğru mu? Port 22 açık mı?

✅ Raspberry Pi çok yavaş?
   → MongoDB Atlas kullanın (10x hızlı)

✅ WebSocket bağlantısı kesildi?
   → Polling fallback aktif (sabitrx)

✅ Güvenlik açığı endişem var?
   → AUDIT_REPORT.md'yi oku (20 bulgu düzeltildi)

✅ Üretim için hazır mı?
   → DEPLOYMENT_CHECKLIST.md çalıştır

✅ Monitoring istiyorum?
   → PRODUCTION_README.md bölümü var
```

---

## 🎯 Başlangıç

1. **Senaryonu seç**: Lokal? RPi? Cloudflare? VPS?
2. **İlgili rehberi aç**: [SCENARIO_BASED_GUIDE.md](SCENARIO_BASED_GUIDE.md)
3. **Adım adım izle**: Komutları kopyala-yapıştır
4. **Test et**: Health check çalışıyor mu?
5. **Bitirdin!** 🎉

---

**Hızlı Referans Kartı**  
**Versiyon**: 2.0  
**Durum**: ✅ Tüm Komutlar Hazır  
**Son Güncelleme**: 2026
