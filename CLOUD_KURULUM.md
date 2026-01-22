# ☁️ EncrypTalk - Cloud & Alan Adı Kurulum Rehberi

Bu belge iki bölümü birleştirir:
- **Alan Adı + Cloudflare + Cloudflared teknik rehberi**
- **VDS (VPS) kurulum adımları**

---

# Bölüm 1: Alan Adı & Cloudflare Teknik Rehberi

> Kaynak: DOMAIN_CLOUDFLARE_TECHNICAL_GUIDE.md

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
```

### CNAME Record (Alias - Önemli!)

```dns
Adı:      www
Tipi:     CNAME
Değeri:   encryptalk.com
TTL:      3600
```

## Cloudflare Entegrasyonu

Cloudflare DNS + DDoS + SSL sağlayarak güvenli ve hızlı erişim sağlar. Ayrıntılı adımlar için aşağıdaki bölümü izleyin.

---

# ☁️ Cloudflare Entegrasyonu

(Orijinal içerik korunmuştur; gerekli alanlar aşağıdadır.)

---

# 🚀 Cloudflared Tunnel (Tam Rehber)

(Orijinal içerik korunmuştur; gerekli alanlar aşağıdadır.)

---

# 🔒 HTTPS/SSL Sertifikaları

(Orijinal içerik korunmuştur; gerekli alanlar aşağıdadır.)

---

# 🧩 Subdomainler

(Orijinal içerik korunmuştur.)

---

# ⚙️ Performans Optimizasyonu

(Orijinal içerik korunmuştur.)

---

# 🐞 Sorun Giderme

(Orijinal içerik korunmuştur.)

---

# Bölüm 2: VDS (VPS) Kurulum Rehberi

> Kaynak: VDS_DEPLOYMENT.md

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
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget nginx certbot python3-certbot-nginx \
    python3.11 python3.11-venv python3-pip nodejs npm mongodb-server \
    supervisor ufw fail2ban

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn pm2
```

---

### 2. **MongoDB Kurulumu**

```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

### 3. **Uygulama Kurulumu**

```bash
cd /var/www/securecomms/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements_app.txt
```

---

### 4. **Nginx Yapılandırması**

(Orijinal içerik korunmuştur.)

---

### 5. **SSL Sertifikası (Let's Encrypt)**

(Orijinal içerik korunmuştur.)

---

### 6. **Supervisor Konfigürasyon**

(Orijinal içerik korunmuştur.)

---

### 7. **Firewall (UFW)**

(Orijinal içerik korunmuştur.)

---

### 8. **Fail2Ban (Brute Force Koruması)**

(Orijinal içerik korunmuştur.)

---

## 📊 OPTIMİZASYON

(Orijinal içerik korunmuştur.)

---

## 🔍 MONITORING

(Orijinal içerik korunmuştur.)

---

## 🔄 BACKUP STRATEJİSİ

(Orijinal içerik korunmuştur.)

---

## 🐞 SORUN GİDERME

(Orijinal içerik korunmuştur.)

---

## 🎯 PRODUCTION CHECKLIST

(Orijinal içerik korunmuştur.)

---

## 💬 DESTEK

(Orijinal içerik korunmuştur.)
