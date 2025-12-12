# Vercel'de Mevcut Deployment Güncelleme

## 🎯 Durumunuz

- ✅ Domain: `earn.resilora.xyz` zaten aktif
- ✅ Vercel'de proje yayında
- ✅ GitHub'a yeni dosyalar push edildi

---

## 📋 Yapmanız Gerekenler

### Seçenek 1: Otomatik Deploy (Eğer GitHub Entegrasyonu Varsa)

**Adım 1: Kontrol Edin**
1. Vercel Dashboard'a gidin: https://vercel.com/dashboard
2. `earn.resilora.xyz` projesini açın
3. **Settings** > **Git** sekmesine gidin
4. GitHub repository bağlı mı kontrol edin

**Adım 2: Bekleyin**
- GitHub'a push yaptığınız için otomatik deploy başlamış olmalı
- Dashboard'da **Deployments** sekmesinde yeni bir deploy görmelisiniz
- Deploy işlemi 1-2 dakika sürebilir

**Adım 3: Deploy Kontrolü**
- Deployments sekmesinde son deployment'ın yanında **"Ready"** yazıyor mu?
- Eğer **"Building"** yazıyorsa bekleyin
- Eğer **"Error"** yazıyorsa logları kontrol edin

---

### Seçenek 2: Manuel Redeploy

Eğer otomatik deploy olmadıysa:

**Adım 1: Vercel Dashboard**
1. https://vercel.com/dashboard
2. `earn.resilora.xyz` projesini açın

**Adım 2: Redeploy**
1. Üst menüden **Deployments** sekmesine tıklayın
2. En üstteki (en yeni) deployment'ın yanında **"..."** (üç nokta) menüsüne tıklayın
3. **"Redeploy"** seçeneğine tıklayın
4. Onaylayın

**Adım 3: Bekleyin**
- Deploy işlemi başlayacak
- 1-2 dakika içinde tamamlanacak

---

## ✅ Kontrol Listesi

Deploy tamamlandıktan sonra:

### 1. API Endpoint Kontrolü

Tarayıcınızda şu URL'i açın:
```
https://earn.resilora.xyz/api/leaderboard
```

**Beklenen:** JSON response görmelisiniz
```json
{
  "success": true,
  "top50": [],
  "currentUser": null
}
```

**Eğer 404 hatası alıyorsanız:**
- `vercel.json` dosyasının deploy edildiğinden emin olun
- Vercel Dashboard > Functions sekmesinde function'lar görünüyor mu kontrol edin

### 2. Frontend Kontrolü

1. **Site açılıyor mu?**
   - https://earn.resilora.xyz

2. **Browser Console kontrolü:**
   - F12 tuşuna basın
   - Console sekmesine gidin
   - Hata var mı kontrol edin

3. **Network kontrolü:**
   - F12 > Network sekmesi
   - Siteyi yenileyin
   - API istekleri görünüyor mu?

### 3. Liderlik Tablosu Kontrolü

1. Cüzdan bağlayın
2. X hesabı bağlayın
3. Bir görev tamamlayın
4. Liderlik tablosu görünüyor mu?
5. 30 saniye bekleyin, otomatik güncelleniyor mu?

---

## 🔧 Sorun Giderme

### Sorun 1: API 404 Hatası

**Kontrol:**
1. Vercel Dashboard > Functions sekmesi
2. `/api/leaderboard` function'ı var mı?

**Çözüm:**
- `api/` klasöründeki dosyalar deploy edilmiş mi kontrol edin
- `vercel.json` dosyası doğru mu kontrol edin
- Redeploy yapın

### Sorun 2: CORS Hatası

**Kontrol:**
- Browser Console'da hata mesajı var mı?

**Çözüm:**
- `api/*.js` dosyalarında CORS headers zaten var
- Frontend ve backend aynı domain'de (`earn.resilora.xyz`) olduğu için sorun olmamalı
- Eğer hala sorun varsa, API URL'inin doğru olduğundan emin olun

### Sorun 3: Liderlik Tablosu Görünmüyor

**Kontrol:**
1. Browser Console'da hata var mı?
2. Network sekmesinde `/api/leaderboard` isteği gidiyor mu?
3. Response ne dönüyor?

**Çözüm:**
- API endpoint'inin çalıştığından emin olun
- Browser Console'daki hata mesajlarını kontrol edin

---

## 📝 Önemli Notlar

1. **API URL:** `script.js` dosyasında zaten `window.location.origin` olarak ayarlı
   - Bu, `earn.resilora.xyz` için otomatik olarak `https://earn.resilora.xyz` kullanacak
   - Değişiklik yapmanıza gerek yok

2. **Otomatik Güncelleme:**
   - Her `git push` sonrası otomatik deploy olmalı (eğer GitHub entegrasyonu varsa)
   - Deployments sekmesinden takip edebilirsiniz

3. **Function Logs:**
   - Vercel Dashboard > Functions > Her function için logları görebilirsiniz
   - Hata varsa buradan görebilirsiniz

---

## 🎉 Başarı Kriterleri

Deploy başarılı sayılır eğer:

- ✅ Site açılıyor: https://earn.resilora.xyz
- ✅ API çalışıyor: `/api/leaderboard` response dönüyor
- ✅ Cüzdan bağlanabiliyor
- ✅ Görevler tamamlanabiliyor
- ✅ Liderlik tablosu görünüyor
- ✅ API'ye veri kaydediliyor (Network tab'ında görülebilir)

---

## 📞 Sonraki Adımlar

Deploy başarılı olduktan sonra:

1. Siteyi test edin
2. Birkaç görev tamamlayın
3. Liderlik tablosunun güncellendiğini kontrol edin
4. API endpoint'lerini test edin (TEST-API.md dosyasına bakın)

