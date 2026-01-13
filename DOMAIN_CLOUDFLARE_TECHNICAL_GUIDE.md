# EncrypTalk - Alan Adı & Cloudflared Detaylı Teknik Rehberi

**Amaç**: Alan adı ve Cloudflared tunnel'ın her yönünü detaylı anlatmak

---

## 📋 İçindekiler

1. [Alan Adı Seçimi ve Satın Alma](#alan-adı-seçimi)
2. [DNS Ayarları (Detaylı)](#dns-ayarları)
3. [Cloudflare Entegrasyonu](#cloudflare-entegrasyonu)
4. [Cloudflared Tunnel (Tam Rehber)](#cloudflared-tunnel)
5. [HTTPS/SSL Sertifikaları](#httpssl-sertifikaları)
6. [Subdomainler (api.domain.com vb.)](#subdomainler)
7. [Performans ve Optimizasyon](#performans-optimizasyon)
8. [Sorun Giderme](#sorun-giderme-teknik)

---

# 📝 Alan Adı Seçimi

## Neden Alan Adı Gerekli?

```
IP Address:     203.0.113.45       ❌ Unutkanlıkla açı
Alan Adı:       encryptalk.com     ✅ Kolay, profesyonel, hatırlanır
```

## Alan Adı Seçim Kriterleri

### 1. Uzantı Seçimi

```
.com      → Genel, kolay, $8-12/yıl        ⭐⭐⭐⭐⭐
.io       → Tech, startup, $35-40/yıl      ⭐⭐⭐⭐
.app      → Uygulamalar için, $13-15/yıl   ⭐⭐⭐⭐
.net      → Teknik, $8-12/yıl              ⭐⭐⭐
.org      → Kuruluş, $8-12/yıl             ⭐⭐⭐
.tr       → Türkiye, $30-50/yıl            ⭐⭐⭐
.chat     → Chat uygulamaları, $20-25/yıl  ⭐⭐
.cloud    → Bulut hizmetleri, $15-20/yıl   ⭐⭐
```

### 2. İsim Seçimi

```
✅ İyi:
- encrypt-talk.com         (kısa, açık, SEO)
- secure-msg.io            (profesyonel)
- vault-chat.app           (açıklayıcı)

❌ Kötü:
- e2eencryptioncommunication.com  (çok uzun)
- xyzabc123.com                    (anlamlı değil)
- secure-communication.xyz         (karmaşık)
```

## Alan Adı Nerede Satın Alınır?

### Global Provider'lar

| Sayfa | Fiyat | Destek | SSL | Yorum |
|-------|-------|--------|-----|-------|
| **Namecheap** | $0.88-12 | 24/7 Chat | ✅ Bedava | En iyi başlangıç |
| **GoDaddy** | $2-20 | İyi | ✅ Bedava | Popüler, kolay |
| **Domain.com** | $5-15 | Telefon | ✅ Bedava | ABD vb. |
| **Porkbun** | $3-10 | Email | ✅ Bedava | Ucuz, budgetkay |
| **Google Domains** | $12-60 | Email | ✅ Bedava | Google integration |

### Türkiye Provider'ları

```
nic.tr          → .tr domain, Türkiye
metu.edu.tr     → Akademik domain
itu.edu.tr      → İstanbul Teknik Üniversitesi
turhost.com     → Türkçe destek, hosting
mynet.com.tr    → Alan adı + hosting
```

## Alan Adı Satın Alma Adımları (Namecheap Örneği)

```bash
# 1. https://www.namecheap.com aç
# 2. Search box'a gir: "encryptalk.com"
# 3. Fiyat kontrol et
# 4. "ADD TO CART" tıkla
# 5. "PROCEED TO CHECKOUT" tıkla
# 6. Email ile kayıt yap
# 7. Ödeme yap (Stripe, PayPal)
# 8. Kaydırıldı!
# 9. Email'e doğrulama linki gelecek

# Alan adı = "encryptalk.com"
# Süre = 1 yıl (Auto-renew seçilebilir)
# Fiyat = ~$8.88/yıl
```

---

# 🌐 DNS Ayarları (Detaylı)

## DNS Nedir?

```
DNS = "Domain Name System" = Rehber gibi

Kullanıcı: encryptalk.com
DNS: "O ip adresi 203.0.113.45"
Browser: 203.0.113.45'e bağlan
Server: Hoşgeldin!
```

## DNS Record Tipleri

### A Record (En Sık)

```dns
Adı:      @  veya  encryptalk.com
Tipi:     A
Değeri:   203.0.113.45  (IPv4 - sunucunuzun IP'si)
TTL:      3600  (dakika cinsinden - 1 saat = 3600 saniye)

Sonuç: encryptalk.com → 203.0.113.45
```

### AAAA Record (IPv6 - Optional)

```dns
Adı:      @
Tipi:     AAAA
Değeri:   2001:db8::1  (IPv6 - yüksek teknoloji sunucuları için)
TTL:      3600

Sonuç: IPv6 üzerinden erişim mümkün
```

### CNAME Record (Alias - Önemli!)

```dns
Adı:      www
Tipi:     CNAME
Değeri:   encryptalk.com
TTL:      3600

Sonuç: www.encryptalk.com → encryptalk.com → 203.0.113.45
```

### MX Record (Email - İsteğe Bağlı)

```dns
Adı:      @
Tipi:     MX
Değeri:   mail.encryptalk.com
Öncelik:  10
TTL:      3600

Sonuç: Email alabilirsiniz (email server kurulursa)
```

### TXT Record (Doğrulama)

```dns
Adı:      @
Tipi:     TXT
Değeri:   "v=spf1 include:mailgun.org ~all"
TTL:      3600

Sonuç: Email doğrulaması, SSL doğrulaması
```

## DNS Değişiklik Yapmak (Adım Adım)

### Adım 1: Registrar Dashboard'a Gir

**Namecheap Örneği:**
```
1. https://www.namecheap.com aç
2. Sağ üst: "Account"
3. "Dashboard" tıkla
4. Domain listesinde alan adınızı bul
5. "MANAGE" tıkla
```

### Adım 2: DNS Management'e Git

**Namecheap:**
```
Dashboard → Alan Adı → "MANAGE" 
  → "Advanced DNS" sekmesi tıkla
```

**GoDaddy:**
```
Ürünlerim → Alan Adları → Alan adınız
  → "DNS Yönet" tıkla
```

### Adım 3: A Record Ekle/Düzenle

```
1. "Add New Record" tıkla
2. Tipi: A
3. Adı: @  (root domain)
4. Value: 203.0.113.45  (VPS IP'niz)
5. TTL: 3600
6. Save tıkla
```

### Adım 4: CNAME (www) Ekle

```
1. "Add New Record" tıkla
2. Tipi: CNAME
3. Adı: www
4. Value: encryptalk.com
5. TTL: 3600
6. Save tıkla
```

### Adım 5: Yayılma Bekle

```
DNS yayılım süresi: 5 dakika - 48 saat

İleri: Kontrol et
nslookup encryptalk.com 8.8.8.8
# Dönmeli: 203.0.113.45

Veya online araç: https://mxtoolbox.com/mxlookup.aspx
```

---

# ☁️ Cloudflare Entegrasyonu

## Cloudflare Nedir?

```
DNS Hizmeti + DDoS Koruması + SSL + CDN

Avantajları:
✅ Bedava tier (sınırlı ama yeterli)
✅ DNS yönetimi kolay
✅ HTTPS/SSL bedava ve otomatik
✅ DDoS koruması
✅ CDN (hız artışı)
✅ Analytics ve logging
✅ Workers (serverless - gelişmiş)
```

## Cloudflare Kurulum (Detaylı)

### 1. Cloudflare Kaydı

```bash
# Tarayıcıda
# https://www.cloudflare.com
# "Sign Up" tıkla
# Email: your@email.com
# Password: strong_password_16_chars
# "Create account" tıkla

# Doğrulama emaili gelecek, tıkla
# Cloudflare dashboard açılacak
```

### 2. Site Ekle

```bash
# Cloudflare Dashboard
# Sağ üst: "+ Create account" veya "Create site" tıkla
# Domain: encryptalk.com gir
# "Add site" tıkla
# Plan seç: "Free" (bedava) seç
# "Continue" tıkla
```

### 3. Nameserver Değiştir (ÖNEMLİ!)

```
Cloudflare sana 2 nameserver verecek:
- ns1.yoursite.ns.cloudflare.com
- ns2.yoursite.ns.cloudflare.com

Registrar'ya git (Namecheap):
1. Dashboard > Alan adı > MANAGE
2. "Nameservers" sekmesi
3. "Custom DNS" seç
4. Eski nameserver'ları sil
5. Cloudflare nameserver'ları ekle
6. Save

NOT: Değişiklik 5 dakika - 48 saat alabilir!
```

### 4. DNS Record'u Ekle (Cloudflare'de)

```
Cloudflare Dashboard:
1. DNS sekmesi tıkla
2. "Create record" tıkla

A Record:
- Type: A
- Name: @  (veya encryptalk.com)
- IPv4 address: 203.0.113.45
- Proxy status: "Proxied" (🟠 turuncu)
  veya "DNS only" (🔶 gri - daha hızlı)
- TTL: Auto
- "Save" tıkla

Sonuç:
✅ Cloudflare Alan Adını Yönetiyorsun
✅ HTTPS Otomatik (SSL)
✅ DDoS Koruması Aktif
```

### 5. SSL/TLS Ayarı

```
Cloudflare Dashboard:
1. "SSL/TLS" sekmesi tıkla
2. "Overview" sub-sekmesi
3. "Your SSL/TLS encryption mode"

Seçenekler:
- "Off" → HTTPS yok (❌ kullanma)
- "Flexible" → Cloudflare-server HTTP (⚠️ risky)
- "Full" → Server SSL gerek (✅ önerilen)
- "Full Strict" → Server valid SSL gerek (✅⭐ en güvenli)

Önerimiz: "Full" seç

Çünkü: Nginx'te kendi SSL kurulacak
```

### 6. HSTS Etkinleştir

```
SSL/TLS > HSTS sekmesi
- Status: ON
- Max Age: 12 months
- Include Subdomains: ON
- Preload: ON

Sonuç: Tarayıcı her zaman HTTPS kullanır
```

---

# 🚀 Cloudflared Tunnel (Tam Rehber)

## Cloudflared Tunnel Nedir?

```
Evdeki/Ofisdeki bilgisayar → Cloudflare → İnternet

Avantajları:
✅ Kimsenin IP'sini açmaz (gizli)
✅ Alan adı olmasa da çalışır
✅ HTTPS otomatik (Cloudflare sağlıyor)
✅ Port forwarding yok
✅ DDoS koruması (Cloudflare)
✅ Uptime monitoring

Dezavantajları:
❌ Cloudflare kesilirse bağlantı kesilir
❌ Biraz yavaş olabilir (tunnel overhead)
```

## Kurulum (Raspberry Pi Örneği)

### 1. Cloudflare Kaydı

```bash
# https://www.cloudflare.com
# Kaydol (yukarıda anlatıldığı gibi)
```

### 2. Cloudflared İndir

```bash
# Raspberry Pi (ARM64 - 64-bit)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared-linux-arm64.deb

# Kontrol
cloudflared --version
# Dönmeli: cloudflared version X.X.X
```

### 3. Giriş Yap (Authentikasyon)

```bash
# Terminal'de
cloudflared login

# Çıktı:
# Please visit the following URL to authenticate: https://dash.cloudflare.com/...
# Opening in browser, if available...

# Browser açılacak, Cloudflare giriş yap
# "Authorize" tıkla
# Terminal'de sertifikat indirilecek
# ~/.cloudflared/cert.pem kaydedilecek
```

### 4. Config Dosyası Oluştur

```bash
# Config klasörü
mkdir -p ~/.cloudflared

# Config dosyası (nano editörü ile)
nano ~/.cloudflared/config.yml

# Aşağıdakileri kopyala-yapıştır:
```

```yaml
# Cloudflared Tunnel Config
# EncrypTalk için

tunnel: encryptalk-tunnel  # Benzersiz tunnel adı
credentials-file: ~/.cloudflared/encryptalk-tunnel.json

# Ingress = Yönlendirme kuralları
ingress:
  # Frontend (root domain)
  - hostname: encryptalk.com
    service: http://localhost:3000
  
  # www subdomain
  - hostname: www.encryptalk.com
    service: http://localhost:3000
  
  # API subdomain
  - hostname: api.encryptalk.com
    service: http://localhost:8001
  
  # Wildcard (*.encryptalk.com)
  - hostname: "*.encryptalk.com"
    service: http://localhost:8001
  
  # Default (anything else)
  - service: http://localhost:3000

# Transport (WebSocket desteği)
transport:
  metrics:
    enabled: true
    bindAddress: 127.0.0.1:0
  
  tcp:
    keepalive: 30s
    dialDuration: 30s
    tlsHandshakeTimeout: 10s
    tcpKeepAlive: 30s

# Logging
logfile: /var/log/cloudflared.log
loglevel: info
```

```bash
# Dosyayı kaydet: Ctrl+O, Enter, Ctrl+X
```

### 5. Tunnel Oluştur

```bash
# Terminal'de
cloudflared tunnel create encryptalk-tunnel

# Çıktı:
# Created tunnel encryptalk-tunnel with ID: abc123xyz...
# Credentials file: ~/.cloudflared/encryptalk-tunnel.json
```

### 6. DNS Kaydı Ekle (Cloudflare'de)

```bash
# Cloudflare Dashboard:
# 1. Alan adı seç: encryptalk.com
# 2. DNS sekmesi
# 3. "Create record" tıkla

CNAME Record 1 (Root):
- Type: CNAME
- Name: @  (veya encryptalk.com)
- Target: encryptalk-tunnel.cfargotunnel.com
- Proxy status: Proxied
- Save

CNAME Record 2 (API):
- Type: CNAME
- Name: api
- Target: encryptalk-tunnel.cfargotunnel.com
- Proxy status: Proxied
- Save

CNAME Record 3 (www):
- Type: CNAME
- Name: www
- Target: encryptalk-tunnel.cfargotunnel.com
- Proxy status: Proxied
- Save
```

### 7. Tunnel'ı Test Et

```bash
# Terminal'de
cloudflared tunnel run encryptalk-tunnel

# Çıktı:
# Tunnel running at https://encryptalk-tunnel.cfargotunnel.com
# INFO    Connection registered  colo=YYZ
# 
# Tarayıcıda test et:
# https://encryptalk-tunnel.cfargotunnel.com     (bedava public)
# https://encryptalk.com                          (kendi domainle)
# https://api.encryptalk.com                      (API endpoint)

# Kontrol Et:
# curl https://encryptalk.com
# Dönmeli: HTML (frontend başlık)

# curl https://api.encryptalk.com/api/health
# Dönmeli: {"status":"healthy"}
```

### 8. Arka Planda (Systemd) Çalıştır

```bash
# Systemd servisi oluştur
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << 'EOF'
[Unit]
Description=Cloudflare Tunnel for EncrypTalk
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi  # Pi üzerinde çalışıyor
ExecStart=/usr/bin/cloudflared tunnel run encryptalk-tunnel
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared

# Limits
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# Servis aktifleştir
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Status kontrol
sudo systemctl status cloudflared

# Loglar canlı izle
sudo journalctl -u cloudflared -f
```

### 9. Başarıyla Çalışıyor!

```
İnternette erişim:
https://encryptalk.com            ✅ Frontend
https://api.encryptalk.com        ✅ Backend API
https://encryptalk-tunnel.cfargotunnel.com    ✅ Bedava public

Lokal ağdan:
http://192.168.1.100:3000         ✅ Frontend (hızlı)
http://192.168.1.100:8001         ✅ Backend (hızlı)
```

---

# 🔐 HTTPS/SSL Sertifikaları

## Cloudflare SSL (Otomatik)

Eğer Cloudflare kullanıyorsan, SSL otomatik! Yapacak birşey yok.

```bash
# Kontrol
curl -I https://encryptalk.com
# Dönmeli: HTTP/2 200
#          Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

## Let's Encrypt SSL (VPS İçin)

Eğer Cloudflare kullanmıyorsan, Let's Encrypt gerekli.

```bash
# VPS'de kurulum
sudo apt install -y certbot python3-certbot-nginx

# Sertifika al
sudo certbot certonly --webroot \
  -w /opt/encryptalk/frontend/build \
  -d encryptalk.com \
  -d www.encryptalk.com \
  -d api.encryptalk.com \
  -m admin@encryptalk.com \
  --agree-tos \
  --no-eff-email

# Sertifikalar kaydedildi:
# /etc/letsencrypt/live/encryptalk.com/
#   - fullchain.pem (sertifika zinciri)
#   - privkey.pem (private key - SAKLı TUT!)
```

## Sertifika Yenileme (Otomatik)

```bash
# Let's Encrypt sertifika 90 gün geçerli
# Otomatik yenileme kuruluyor

sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Kontrol
sudo systemctl list-timers certbot

# Manual yenileme
sudo certbot renew --force-renewal

# Loglar
sudo tail -30 /var/log/letsencrypt/letsencrypt.log
```

---

# 🔗 Subdomainler (api.domain.com vb.)

## Subdomainler Nedir?

```
Ana domain:   encryptalk.com
Subdomain:    api.encryptalk.com
Subdomain:    admin.encryptalk.com
Subdomain:    cdn.encryptalk.com
```

## Subdomain Ekleme (Cloudflare)

### api.encryptalk.com (Backend API)

```bash
# Cloudflare Dashboard
# DNS sekmesi > Create record

Type: CNAME
Name: api
Target: encryptalk-tunnel.cfargotunnel.com
Proxy status: Proxied
TTL: Auto
Save

# Erişim:
# https://api.encryptalk.com/api/health
# https://api.encryptalk.com/api/conversations
```

### app.encryptalk.com (Frontend Alternatifi)

```bash
# Same as above but:
Name: app
```

### admin.encryptalk.com (Admin Dashboard)

```bash
Name: admin
Target: encryptalk-tunnel.cfargotunnel.com

# config.yml'ye ekle:
- hostname: admin.encryptalk.com
  service: http://localhost:3000  # veya ayrı port
```

## nginx'te Subdomain Yönetimi

```nginx
# /etc/nginx/sites-available/encryptalk

# Frontend (encryptalk.com, www)
server {
    listen 443 ssl http2;
    server_name encryptalk.com www.encryptalk.com app.encryptalk.com;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}

# API Backend (api.encryptalk.com)
server {
    listen 443 ssl http2;
    server_name api.encryptalk.com;
    
    location / {
        proxy_pass http://127.0.0.1:8001;
    }
}

# Admin Dashboard (admin.encryptalk.com)
server {
    listen 443 ssl http2;
    server_name admin.encryptalk.com;
    
    location / {
        proxy_pass http://127.0.0.1:3001;  # Ayrı React app
    }
}
```

---

# ⚡ Performans Optimizasyon

## Cloudflare Caching

```
Cloudflare Dashboard > Caching:

1. Cache Level:
   - Cache Level: Standard (önerilen)
   
2. Browser Cache TTL:
   - 4 hours (statik dosyalar için)
   
3. Cache Tags:
   - Farklı türler: /api, /static

4. Page Rules (Advanced):
   - /api/* → Cache Level: Bypass
   - /static/* → Cache Level: Cache Everything
```

## Compression (Gzip)

```
Cloudflare > Speed > Optimization:

- Brotli: ON (modern tarayıcılar)
- Minify:
  - JavaScript: ON
  - CSS: ON
  - HTML: ON
```

## Performance Monitoring

```bash
# Lokal test
curl -w "@curl-format.txt" -o /dev/null -s https://encryptalk.com

# Çıktı:
# Total time:       0.456 seconds
# DNS lookup:       0.012s
# TCP handshake:    0.045s
# HTTPS handshake:  0.123s
# Time to first byte: 0.156s
# Download time:    0.120s
```

---

# 🔧 Sorun Giderme (Teknik)

## DNS Çalışmıyor

```bash
# 1. DNS Propagation Kontrol
nslookup encryptalk.com 8.8.8.8
# Dönmeli: 203.0.113.45 (VPS IP'si) veya Cloudflare IP'si

# 2. Nameserver kontrol
nslookup -query=NS encryptalk.com

# 3. MX Records
nslookup -query=MX encryptalk.com

# 4. Online araç
# https://mxtoolbox.com/mxlookup.aspx
```

## Cloudflared Bağlantısı Kesildi

```bash
# 1. Status
sudo systemctl status cloudflared

# 2. Loglar
sudo journalctl -u cloudflared -n 50

# 3. Restart
sudo systemctl restart cloudflared

# 4. Credentials kontrol
ls -la ~/.cloudflared/

# 5. Config validation
cloudflared config validate

# 6. Tunnel çalıştığını kontrol
cloudflared tunnel list
```

## HTTPS Sertifikası Sorunu

```bash
# Sertifika geçerlilik
openssl x509 -in /etc/letsencrypt/live/encryptalk.com/fullchain.pem \
  -text -noout | grep -A 2 "Not"

# Sertifika tarih
openssl x509 -in cert.pem -noout -dates

# Online kontrol
curl -vI https://encryptalk.com 2>&1 | grep subject
```

## WebSocket Sorunları (Realtime)

```bash
# 1. Socket.IO polling test
curl -v "https://api.encryptalk.com/socket.io/?EIO=4&transport=polling"

# 2. Nginx config
sudo grep -A 10 "socket.io" /etc/nginx/sites-enabled/*

# 3. Headers kontrol
# Gerekli:
# Upgrade: websocket
# Connection: Upgrade

# 4. Firewall
sudo ufw allow 443
sudo ufw allow 80
```

## CORS Hatası

```bash
# Hata: "Access to XMLHttpRequest from origin ... blocked by CORS"

# 1. Backend .env kontrol
grep CORS_ORIGINS /opt/encryptalk/backend/.env

# 2. Backend restart
sudo systemctl restart encryptalk-backend

# 3. Test et
curl -H "Origin: https://encryptalk.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -X OPTIONS https://api.encryptalk.com/api/conversations -v
```

---

## 🎯 Kontrol Listesi

### Cloudflare Tunnel Kurulumu
- [ ] Cloudflare kaydı var
- [ ] cloudflared kurulu (`cloudflared --version`)
- [ ] `cloudflared login` yapıldı
- [ ] `~/.cloudflared/config.yml` oluşturuldu
- [ ] `cloudflared tunnel create` çalıştırıldı
- [ ] DNS CNAME records eklendi
- [ ] `cloudflared tunnel run` başlatıldı
- [ ] https://domain.com erişiliyor
- [ ] Systemd servisi kurulu
- [ ] `sudo systemctl status cloudflared` aktif

### Domain DNS Ayarları
- [ ] Domain satın alındı
- [ ] Nameserver değiştirildi (Cloudflare)
- [ ] A Record eklendi
- [ ] CNAME (www) eklendi
- [ ] DNS propagation tamamlandı
- [ ] `nslookup domain.com` çalışıyor
- [ ] SSL aktif (HTTPS çalışıyor)
- [ ] HSTS header var

---

**Versiyon**: 2.0 - Teknik Rehber  
**Durum**: ✅ Tüm Detaylar Anlatıldı  
**Son Güncelleme**: 2026
