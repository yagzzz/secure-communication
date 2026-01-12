# EncrypTalk - Güvenli Şifreli Mesajlaşma Uygulaması

Yüksek güvenlikli, uçtan uca şifreli mesajlaşma platformu. Signal'dan ilham alınmıştır.

## 🔐 Güvenlik Özellikleri

### Şifreleme
- **Fernet Simetrik Şifreleme**: Tüm mesajlar AES-128-CBC ile şifrelenir
- **PBKDF2 Anahtar Türetme**: 480.000 iterasyon ile güçlü anahtar üretimi
- **Bcrypt Şifre Hashleme**: 14 round ile şifre koruması
- **SHA-256 Dosya Bütünlüğü**: Yüklenen dosyaların hash kontrolü

### Güvenlik Katmanları
- **Rate Limiting**: IP başına dakikada 100 istek limiti
- **XSS Koruması**: Tüm girdiler sanitize edilir
- **CSRF Koruması**: JWT tabanlı kimlik doğrulama
- **Güvenlik Başlıkları**:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security
  - Content-Security-Policy
  - Referrer-Policy

### Kullanıcı Güvenliği
- **Benzersiz KURD Kodları**: Her kullanıcıya `KURD*****` formatında benzersiz ID
- **Güvenlik Kelimesi**: İletişim başlatmak için güvenlik doğrulaması
- **Oturum Yönetimi**: 7 günlük JWT token süresi

## 🚀 Özellikler

- ✅ Uçtan uca şifreli mesajlaşma
- ✅ Resim, video, dosya paylaşımı
- ✅ Sesli mesaj kayıt ve gönderme
- ✅ Konum paylaşımı
- ✅ Görüntülü ve sesli arama (WebRTC)
- ✅ Mesaj sabitleme ve yanıtlama
- ✅ Emoji tepkileri
- ✅ Admin paneli
- ✅ NAS dosya yönetimi
- ✅ Sticker paketleri
- ✅ Bildirimler

## 📱 Mobil Uyumluluk

- Responsive tasarım
- 3-nokta menü ile mobil aksiyonlar
- Touch-friendly arayüz

## 🛠 Teknoloji

- **Backend**: FastAPI, Motor (MongoDB), Python 3.11+
- **Frontend**: React 18, TailwindCSS, Framer Motion
- **Veritabanı**: MongoDB
- **Gerçek Zamanlı**: HTTP Polling (WebSocket alternatifi)
- **Arama**: WebRTC + HTTP signaling

## 📦 Kurulum

Detaylı kurulum için [KURULUM.md](./KURULUM.md) dosyasına bakın.

### Hızlı Başlangıç

```bash
# 1. Repository'yi klonla
git clone https://github.com/your-repo/encryptalk.git
cd encryptalk

# 2. Backend bağımlılıklarını yükle
cd backend
pip install -r requirements.txt

# 3. Frontend bağımlılıklarını yükle
cd ../frontend
yarn install

# 4. Ortam değişkenlerini ayarla
# backend/.env ve frontend/.env dosyalarını düzenle

# 5. MongoDB'yi başlat
mongod --dbpath /data/db

# 6. Servisleri başlat
# Terminal 1: Backend
cd backend && uvicorn server:app --host 0.0.0.0 --port 8001

# Terminal 2: Frontend
cd frontend && yarn start
```

## 👤 Varsayılan Admin

- **Kullanıcı Adı**: admin
- **Şifre**: admin123

⚠️ **ÖNEMLİ**: Production'da admin şifresini hemen değiştirin!

## 📄 Lisans

MIT License

## 🔒 Güvenlik Bildirimi

Güvenlik açığı bulduysanız lütfen gizli olarak bildirin.
