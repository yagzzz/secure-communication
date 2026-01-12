# EncrypTalk - PRD (Product Requirements Document)

## Problem Statement
Signal'dan ilham alınmış yüksek güvenlikli, uçtan uca şifreli mesajlaşma uygulaması geliştirmek. Kullanıcılar arası güvenli iletişim, dosya paylaşımı, görüntülü/sesli arama ve admin yönetimi sağlamak.

## User Personas
1. **Güvenlik Odaklı Kullanıcı**: Gizlilik ve güvenliğe önem veren, şifreli iletişim arayan kullanıcılar
2. **Admin**: Sistem yöneticisi, kullanıcı oluşturma ve yönetme yetkisine sahip

## Core Requirements

### Authentication & Security (P0) ✅
- [x] Kullanıcı girişi (username/password)
- [x] JWT tabanlı authentication
- [x] Bcrypt ile şifre hashleme (14 round)
- [x] Rate limiting (100 req/min per IP)
- [x] Security headers (X-Frame-Options, CSP, etc.)
- [x] KURD***** benzersiz kullanıcı kodları
- [x] Güvenlik kelimesi ile kullanıcı doğrulama

### Messaging (P0) ✅
- [x] Metin mesaj gönderme/alma
- [x] Fernet (AES) şifreleme ile E2E encryption
- [x] HTTP polling ile gerçek zamanlı mesajlaşma
- [x] Mesaj sabitleme (pin)
- [x] Mesaj yanıtlama (reply)
- [x] Emoji tepkileri

### File Sharing (P1) ✅
- [x] Resim yükleme ve görüntüleme
- [x] Video yükleme ve oynatma
- [x] Dosya yükleme ve indirme
- [x] Sesli mesaj kayıt ve gönderme
- [x] Konum paylaşımı
- [x] SHA-256 dosya bütünlük kontrolü

### Video/Audio Calling (P1) ✅
- [x] WebRTC tabanlı görüntülü arama
- [x] HTTP signaling (WebSocket alternatifi)
- [x] Sesli arama
- [x] Gelen arama bildirimi

### Admin Panel (P1) ✅
- [x] Kullanıcı oluşturma
- [x] Kullanıcı silme
- [x] Konuşma metadata görüntüleme
- [x] NAS dosya yönetimi
- [x] Sistem istatistikleri

### Mobile UI (P0) ✅
- [x] Responsive tasarım
- [x] 3-nokta menü ile mobil aksiyonlar
- [x] Touch-friendly arayüz
- [x] Auto-scroll to latest message

---

## Implementation Status

### Completed Features (2025-01-12)
- ✅ Full authentication system with JWT
- ✅ Fernet encryption for all messages
- ✅ Mobile-responsive chat interface
- ✅ 3-dot menu for mobile actions
- ✅ HTTP-based WebRTC calling
- ✅ File upload/download with hash verification
- ✅ Admin panel with user management
- ✅ NAS file sharing
- ✅ Sticker support
- ✅ Rate limiting and security middleware
- ✅ Ubuntu deployment guide (KURULUM.md)

### Known Limitations
- WebSocket blocked by Kubernetes Ingress (using HTTP polling)
- Old encrypted messages unreadable after SECRET_KEY change (expected behavior)

---

## Technical Architecture

### Backend
- FastAPI (Python 3.11)
- MongoDB with Motor async driver
- Fernet symmetric encryption
- PBKDF2 key derivation (480k iterations)

### Frontend
- React 18
- TailwindCSS
- Framer Motion
- Shadcn/UI components

### Security Layers
1. Transport: HTTPS/TLS
2. Authentication: JWT with bcrypt
3. Message encryption: Fernet (AES-128-CBC)
4. Rate limiting: 100 req/min per IP
5. Input sanitization: XSS protection
6. Security headers: CSP, X-Frame-Options, etc.

---

## P0/P1/P2 Remaining Tasks

### P0 (Critical) - All Complete ✅
- None remaining

### P1 (Important)
- [ ] Okundu bildirimleri (read receipts) UI entegrasyonu
- [ ] localStorage ile bildirim izni kaydetme
- [ ] Grup sohbet gizlilik iyileştirmesi (KURD kodu ile kullanıcı arama)

### P2 (Nice to Have)
- [ ] Kürdistan bayrağı sticker paketi
- [ ] Anonim chatbot entegrasyonu
- [ ] Profil fotoğrafı yükleme UI iyileştirmesi
- [ ] Mesaj düzenleme UI

### P3 (Future)
- [ ] End-to-end video/audio encryption
- [ ] Message self-destruct (disappearing messages)
- [ ] Multi-device sync

---

## Test Credentials
- Admin: `admin` / `admin123`
- Test User: `testuser` / `test123`

## Deployment
See `/app/KURULUM.md` for Ubuntu server deployment guide.
