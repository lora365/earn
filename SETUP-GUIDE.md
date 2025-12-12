# Resilora Earn - Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. Backend API'yi Kurma ve Başlatma

**Adım 1: Bağımlılıkları Yükle**
```bash
npm install
```

**Adım 2: Backend Sunucusunu Başlat**
```bash
# Development modu (otomatik yeniden başlatma)
npm run dev

# VEYA Production modu
npm start
```

Sunucu `http://localhost:3001` adresinde çalışacak.

**Test Etmek İçin:**
Tarayıcıda `http://localhost:3001/api/leaderboard` adresine gidin. Boş bir JSON response görmelisiniz.

---

### 2. Frontend'de API URL'ini Güncelleme

`script.js` dosyasında **satır 18** civarında `CONFIG` objesini bulun ve API URL'ini güncelleyin:

**Geliştirme için (local):**
```javascript
API_URL: 'http://localhost:3001'
```

**Production için:**
```javascript
API_URL: 'https://api.resilora.xyz'  // Veya kendi API domain'iniz
```

---

### 3. Production Deployment (Seçenekler)

#### Seçenek A: Railway
1. Railway hesabı oluşturun: https://railway.app
2. "New Project" > "Deploy from GitHub repo"
3. Projenizi seçin
4. Otomatik deploy olacak
5. Domain'i kopyalayın ve `CONFIG.API_URL`'e ekleyin

#### Seçenek B: Heroku
```bash
heroku create resilora-earn-api
git push heroku main
```

#### Seçenek C: Vercel
```bash
vercel --prod
```

#### Seçenek D: Kendi Sunucunuz
```bash
# PM2 ile sürekli çalıştırma
npm install -g pm2
pm2 start server.js --name resilora-api
pm2 save
pm2 startup
```

---

### 4. Önemli Notlar

#### ✅ Yapılması Gerekenler:
1. ✅ `npm install` çalıştırın
2. ✅ Backend sunucusunu başlatın (`npm start`)
3. ✅ Frontend'de `CONFIG.API_URL`'i güncelleyin
4. ✅ Production'da HTTPS kullanın
5. ✅ CORS ayarlarını kontrol edin (server.js'de)

#### ⚠️ Production için Dikkat Edilmesi Gerekenler:
1. **Veritabanı:** Şu anda JSON dosyası kullanılıyor. Production için MongoDB/PostgreSQL kullanmanız önerilir.
2. **Güvenlik:** Rate limiting ekleyin (express-rate-limit)
3. **CORS:** Sadece güvenilir domain'lere izin verin
4. **Backup:** Verileri düzenli olarak yedekleyin

---

### 5. Test Senaryoları

1. **Backend Test:**
   - `http://localhost:3001/api/leaderboard` - Boş liste dönmeli
   - `http://localhost:3001/api/user/rank/0x123...` - Rank bilgisi dönmeli

2. **Frontend Test:**
   - Cüzdan bağlayın
   - X hesabı bağlayın
   - Bir görev tamamlayın
   - Liderlik tablosunu kontrol edin
   - 30 saniye bekleyin, otomatik güncellenmeli

---

### 6. Sorun Giderme

**Backend çalışmıyor:**
- Port 3001 kullanımda mı? `netstat -ano | findstr :3001` (Windows)
- Node.js kurulu mu? `node --version`
- Bağımlılıklar yüklü mü? `npm install`

**API'ye bağlanamıyor:**
- CORS hatası alıyorsanız: `server.js`'de CORS ayarlarını kontrol edin
- 404 hatası: API URL'ini kontrol edin
- CORS hatası: Frontend ve backend aynı domain'de olmalı veya CORS yapılandırılmalı

**Liderlik tablosu güncellenmiyor:**
- Browser console'u açın (F12)
- Network sekmesinde API isteklerini kontrol edin
- Hata mesajları var mı bakın

---

### 7. Sonraki Adımlar (Opsiyonel İyileştirmeler)

1. **Veritabanı Entegrasyonu:**
   - MongoDB veya PostgreSQL kullan
   - `server.js`'i veritabanı ile çalışacak şekilde güncelle

2. **Güvenlik:**
   - Rate limiting ekle
   - Input validation ekle
   - API authentication ekle (JWT)

3. **Performans:**
   - Redis cache ekle
   - Database indexing

4. **Monitoring:**
   - Logging sistemi
   - Error tracking (Sentry)
   - Analytics

---

## 📞 Destek

Sorun yaşarsanız:
1. Browser console'u kontrol edin (F12)
2. Backend loglarını kontrol edin
3. Network isteklerini inceleyin
4. GitHub Issues'da soru açın

