# Vercel Deployment Rehberi

## 📦 Vercel'de Backend API'yi Deploy Etme

Vercel serverless functions kullanarak API'yi deploy edebilirsiniz. Frontend ve backend aynı projede olacak.

### Adım 1: Vercel CLI'yi Yükleyin (Eğer yoksa)
```bash
npm install -g vercel
```

### Adım 2: Vercel'e Giriş Yapın
```bash
vercel login
```

### Adım 3: Projeyi Deploy Edin
```bash
vercel
```

İlk deploy'da size sorular sorulacak:
- **Set up and deploy?** → `Y`
- **Which scope?** → Hesabınızı seçin
- **Link to existing project?** → `N` (ilk kez deploy ediyorsanız)
- **Project name?** → `resilora-earn` (veya istediğiniz isim)
- **Directory?** → `.` (mevcut dizin)

### Adım 4: Production'a Deploy Edin
```bash
vercel --prod
```

---

## ✅ Otomatik Deploy (GitHub ile)

1. **GitHub'a Push Edin:**
   ```bash
   git add .
   git commit -m "Add Vercel API endpoints"
   git push
   ```

2. **Vercel Dashboard'a Gidin:**
   - https://vercel.com/dashboard
   - "New Project" butonuna tıklayın
   - GitHub repo'nuzu import edin
   - Ayarları kontrol edin ve "Deploy" butonuna tıklayın

3. **Otomatik Deploy:**
   - Her `git push` sonrası otomatik deploy olacak

---

## 🔧 Vercel Yapılandırması

### `vercel.json` Dosyası
Zaten oluşturuldu. Bu dosya API route'larını yapılandırır:
- `/api/leaderboard` → `api/leaderboard.js`
- `/api/user/update` → `api/user-update.js`
- `/api/user/rank` → `api/user-rank.js`

### API Dosyaları
`api/` klasöründeki dosyalar serverless functions olarak çalışır.

---

## 🌐 Domain Ayarları

Deploy sonrası:
1. Vercel size bir domain verecek: `https://your-project.vercel.app`
2. Custom domain eklemek için:
   - Vercel Dashboard > Project > Settings > Domains
   - Domain'inizi ekleyin
   - DNS ayarlarını yapın

---

## 📝 Önemli Notlar

### ✅ Otomatik Yapılandırıldı:
- ✅ CORS headers eklendi
- ✅ API route'ları yapılandırıldı
- ✅ Frontend ve backend aynı domain'de çalışacak
- ✅ `CONFIG.API_URL` otomatik olarak production URL'i kullanacak

### ⚠️ Dikkat:
1. **Veri Depolama:** Vercel serverless functions geçici dosya sistemi kullanır. Veriler silinebilir.
   - **Çözüm:** MongoDB Atlas veya benzeri bir veritabanı kullanın (gelecek güncellemede eklenebilir)

2. **Dosya Limitleri:**
   - Function timeout: 10 saniye (free tier)
   - Function size limiti var

3. **Environment Variables:**
   - Vercel Dashboard > Settings > Environment Variables
   - Gerekirse buradan ekleyebilirsiniz

---

## 🧪 Test Etme

Deploy sonrası:
1. `https://your-project.vercel.app` adresine gidin
2. Frontend çalışmalı
3. API endpoint'lerini test edin:
   - `https://your-project.vercel.app/api/leaderboard`
   - Boş bir JSON response dönmeli: `{"success":true,"top50":[],"currentUser":null}`

---

## 🔄 Güncelleme

Her `git push` sonrası otomatik deploy olur. Manuel deploy için:
```bash
vercel --prod
```

---

## 📊 Monitoring

Vercel Dashboard'da:
- Function logs
- Analytics
- Error tracking

---

## 🆘 Sorun Giderme

**API çalışmıyor:**
- Vercel Dashboard > Functions sekmesinde logları kontrol edin
- `vercel logs` komutuyla logları görün

**CORS hatası:**
- `api/*.js` dosyalarında CORS headers zaten var
- Frontend ve backend aynı domain'de olduğu için sorun olmamalı

**404 hatası:**
- `vercel.json` dosyasını kontrol edin
- API dosyalarının `api/` klasöründe olduğundan emin olun

