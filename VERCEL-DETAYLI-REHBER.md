# 🚀 Vercel Deployment - Detaylı Rehber

Bu rehber, Resilora Earn projenizi Vercel'de nasıl host edeceğinizi adım adım anlatır.

---

## 📋 İçindekiler

1. [Vercel Hesabı Oluşturma](#1-vercel-hesabı-oluşturma)
2. [GitHub Repository Bağlama](#2-github-repository-bağlama)
3. [Proje Ayarları](#3-proje-ayarları)
4. [Deploy İşlemi](#4-deploy-işlemi)
5. [Domain Ayarları](#5-domain-ayarları)
6. [API Test Etme](#6-api-test-etme)
7. [Sorun Giderme](#7-sorun-giderme)

---

## 1. Vercel Hesabı Oluşturma

### Adım 1.1: Vercel'e Giriş
1. Tarayıcınızda https://vercel.com adresine gidin
2. Sağ üst köşede **"Sign Up"** veya **"Log In"** butonuna tıklayın

### Adım 1.2: GitHub ile Giriş (Önerilen)
1. **"Continue with GitHub"** butonuna tıklayın
2. GitHub hesabınızla giriş yapın
3. Vercel'in GitHub'a erişim izni isteyecek → **"Authorize"** butonuna tıklayın

**Neden GitHub ile?**
- Otomatik deploy için gerekli
- Her `git push` sonrası otomatik güncelleme
- Daha kolay yönetim

---

## 2. GitHub Repository Bağlama

### Adım 2.1: Yeni Proje Oluşturma
1. Vercel Dashboard'a giriş yaptıktan sonra
2. Ana sayfada **"Add New..."** butonuna tıklayın
3. Açılan menüden **"Project"** seçin

### Adım 2.2: Repository Seçme
1. **"Import Git Repository"** ekranında GitHub hesabınız görünecek
2. **"lora365/earn"** repository'sini bulun (veya arama kutusuna "earn" yazın)
3. Repository'nin yanındaki **"Import"** butonuna tıklayın

**Eğer repository görünmüyorsa:**
- GitHub'da repository'nin **Public** olduğundan emin olun
- Veya Vercel'e özel erişim izni verin (Settings > Applications)

---

## 3. Proje Ayarları

### Adım 3.1: Project Configuration
Import sonrası ayar ekranı açılacak:

#### Framework Preset
- **"Other"** veya **"Vite"** seçin (otomatik algılanabilir)
- Vercel genellikle otomatik algılar, değiştirmenize gerek yok

#### Root Directory
- **"."** (nokta) bırakın (proje root'unda)

#### Build Command
- **Boş bırakın** veya silin (frontend build gerektirmiyor)

#### Output Directory
- **Boş bırakın** veya silin

#### Install Command
- **`npm install`** (varsayılan, değiştirmeyin)

### Adım 3.2: Environment Variables (Şimdilik Gerekli Değil)
- Bu aşamada environment variable eklemenize gerek yok
- İleride gerekirse ekleyebilirsiniz

### Adım 3.3: Project Name
- **Project Name:** `resilora-earn` (veya istediğiniz isim)
- Bu isim URL'de görünecek: `resilora-earn.vercel.app`

---

## 4. Deploy İşlemi

### Adım 4.1: İlk Deploy
1. Tüm ayarları kontrol edin
2. **"Deploy"** butonuna tıklayın
3. Deploy işlemi başlayacak (1-2 dakika sürebilir)

### Adım 4.2: Deploy Süreci
Deploy sırasında şunlar olacak:
- ✅ Dependencies yüklenecek (`npm install`)
- ✅ Build işlemi (varsa)
- ✅ Serverless functions oluşturulacak (`api/` klasöründeki dosyalar)
- ✅ Static files deploy edilecek

### Adım 4.3: Deploy Tamamlandı
Deploy tamamlandığında:
- ✅ **"Success"** mesajı göreceksiniz
- ✅ Bir URL verilecek: `https://resilora-earn.vercel.app`
- ✅ **"Visit"** butonuna tıklayarak siteyi açabilirsiniz

---

## 5. Domain Ayarları

### Adım 5.1: Custom Domain Ekleme (Opsiyonel)
Eğer kendi domain'inizi kullanmak istiyorsanız:

1. Vercel Dashboard'da projenize gidin
2. **"Settings"** sekmesine tıklayın
3. Sol menüden **"Domains"** seçin
4. **"Add Domain"** butonuna tıklayın
5. Domain'inizi yazın (örn: `earn.resilora.xyz`)
6. Vercel size DNS ayarlarını gösterecek

### Adım 5.2: DNS Ayarları
Vercel'in verdiği DNS kayıtlarını domain sağlayıcınızda ekleyin:

**A Record:**
```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME Record:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Not:** DNS değişiklikleri 24-48 saat sürebilir.

---

## 6. API Test Etme

### Adım 6.1: API Endpoint'lerini Test Edin

Deploy sonrası şu URL'leri test edin:

#### 6.1.1: Leaderboard Endpoint
```
https://resilora-earn.vercel.app/api/leaderboard
```

**Beklenen Response:**
```json
{
  "success": true,
  "top50": [],
  "currentUser": null
}
```

#### 6.1.2: User Update Endpoint (Test için)
Tarayıcı console'unda veya Postman'de:
```javascript
fetch('https://resilora-earn.vercel.app/api/user/update', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    walletAddress: '0x1234567890123456789012345678901234567890',
    tasks: [
      { id: 1, status: 'completed' },
      { id: 2, status: 'completed' }
    ]
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### Adım 6.2: Frontend Test
1. Deploy edilen siteyi açın: `https://resilora-earn.vercel.app`
2. Cüzdan bağlayın
3. X hesabı bağlayın
4. Bir görev tamamlayın
5. Liderlik tablosunu kontrol edin
6. Browser console'u açın (F12) → Network sekmesinde API isteklerini görebilirsiniz

---

## 7. Sorun Giderme

### Sorun 1: "Build Failed"
**Çözüm:**
- Vercel Dashboard > Project > Deployments > Failed deployment'a tıklayın
- Logları kontrol edin
- Genellikle `package.json` veya dependency sorunlarıdır

### Sorun 2: "API 404 Not Found"
**Çözüm:**
- `vercel.json` dosyasının root'ta olduğundan emin olun
- `api/` klasöründeki dosyaların doğru olduğunu kontrol edin
- Vercel Dashboard > Functions sekmesinde function'ları kontrol edin

### Sorun 3: "CORS Error"
**Çözüm:**
- `api/*.js` dosyalarında CORS headers zaten var
- Frontend ve backend aynı domain'de olduğu için sorun olmamalı
- Eğer hala sorun varsa, browser console'da hata mesajını kontrol edin

### Sorun 4: "Function Timeout"
**Çözüm:**
- Vercel free tier'da 10 saniye timeout var
- Büyük veri işlemleri için timeout artırın veya optimize edin
- Pro plan'da daha uzun timeout'lar var

### Sorun 5: "Data Not Persisting"
**Çözüm:**
- Vercel serverless functions geçici dosya sistemi kullanır
- Veriler silinebilir (cold start)
- **Çözüm:** MongoDB Atlas veya benzeri bir veritabanı kullanın
- Şimdilik test için çalışır, production için veritabanı eklenmeli

---

## 8. Otomatik Deploy (GitHub Integration)

### Adım 8.1: Otomatik Deploy Zaten Aktif
GitHub ile bağladıysanız, otomatik deploy zaten aktif:
- Her `git push` sonrası otomatik deploy olur
- Production branch (main/master) için otomatik deploy
- Preview deployments için pull request'lerde otomatik deploy

### Adım 8.2: Deploy Ayarları
Vercel Dashboard > Settings > Git:
- **Production Branch:** `main` (veya `master`)
- **Auto-deploy:** ✅ Aktif
- **Preview Deployments:** ✅ Aktif

---

## 9. Monitoring ve Logs

### Adım 9.1: Function Logs
1. Vercel Dashboard > Project
2. **"Functions"** sekmesine tıklayın
3. Her function için logları görebilirsiniz
4. Hata varsa buradan görebilirsiniz

### Adım 9.2: Analytics
1. Vercel Dashboard > Project
2. **"Analytics"** sekmesi (Pro plan gerekli)
3. Traffic, performance metrikleri

---

## 10. Production Checklist

Deploy öncesi kontrol listesi:

- [ ] `vercel.json` dosyası var mı?
- [ ] `api/` klasöründeki dosyalar doğru mu?
- [ ] `package.json` dosyası var mı?
- [ ] `script.js`'de `API_URL` otomatik olarak ayarlanmış mı?
- [ ] GitHub'a push edildi mi?
- [ ] Vercel'de proje oluşturuldu mu?
- [ ] İlk deploy başarılı mı?
- [ ] API endpoint'leri test edildi mi?
- [ ] Frontend çalışıyor mu?
- [ ] Liderlik tablosu görünüyor mu?

---

## 11. Sonraki Adımlar (Opsiyonel)

### 11.1: Veritabanı Entegrasyonu
Şu anda JSON dosyası kullanılıyor. Production için:
- MongoDB Atlas (ücretsiz tier var)
- Vercel'de environment variables ile bağlantı
- `api/*.js` dosyalarını güncelleyin

### 11.2: Environment Variables
Gerekirse:
1. Vercel Dashboard > Settings > Environment Variables
2. Key-Value çiftleri ekleyin
3. Production, Preview, Development için ayrı ayrı

### 11.3: Custom Domain SSL
- Vercel otomatik SSL sertifikası sağlar
- Custom domain eklediğinizde otomatik aktif olur
- HTTPS zorunlu değil, otomatik

---

## 📞 Yardım ve Destek

### Vercel Dokümantasyonu
- https://vercel.com/docs

### Vercel Community
- https://github.com/vercel/vercel/discussions

### Vercel Support
- Dashboard > Help > Contact Support

---

## ✅ Başarı Kriterleri

Deploy başarılı sayılır eğer:
1. ✅ Site açılıyor: `https://resilora-earn.vercel.app`
2. ✅ API çalışıyor: `/api/leaderboard` response dönüyor
3. ✅ Frontend çalışıyor: Cüzdan bağlanabiliyor
4. ✅ Liderlik tablosu görünüyor
5. ✅ Görev tamamlandığında API'ye kaydediliyor

---

## 🎉 Tebrikler!

Artık projeniz canlıda! Her `git push` sonrası otomatik güncellenecek.

**Önemli Notlar:**
- İlk deploy 1-2 dakika sürebilir
- Sonraki deploy'lar daha hızlı (sadece değişen dosyalar)
- Preview deployments PR'lerde otomatik oluşur
- Production deploy sadece main branch'e push'ta olur

