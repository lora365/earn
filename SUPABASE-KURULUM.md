# 🗄️ Supabase Kurulum Rehberi

## Adım 1: Supabase Hesabı Oluşturma

1. **Supabase'e gidin:** https://supabase.com
2. **"Start your project"** veya **"Sign In"** butonuna tıklayın
3. GitHub hesabınızla giriş yapın (en kolay yöntem)
4. Eğer ilk kez kullanıyorsanız, **"New Project"** butonuna tıklayın

---

## Adım 2: Yeni Proje Oluşturma

1. **Organization:** İlk kez kullanıyorsanız yeni organization oluşturun
2. **Project Name:** `resilora-earn` (veya istediğiniz isim)
3. **Database Password:** Güçlü bir şifre oluşturun (sakın kaybetmeyin!)
4. **Region:** Size en yakın region'ı seçin (ör: `West US`, `EU West`)
5. **Pricing Plan:** **Free** plan yeterli
6. **"Create new project"** butonuna tıklayın

⏱️ **Bekleyin:** Proje oluşturulması 1-2 dakika sürebilir

---

## Adım 3: Database Tablosu Oluşturma

### Yöntem 1: SQL Editor (Önerilen)

1. Supabase Dashboard'da sol menüden **"SQL Editor"** seçin
2. **"New query"** butonuna tıklayın
3. Aşağıdaki SQL kodunu yapıştırın:

```sql
-- Leaderboard users table
CREATE TABLE IF NOT EXISTS leaderboard_users (
  wallet_address TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard_users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_updated ON leaderboard_users(updated_at DESC);

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE leaderboard_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since we're using API keys)
CREATE POLICY "Allow all operations" ON leaderboard_users
FOR ALL
USING (true)
WITH CHECK (true);
```

4. **"Run"** butonuna tıklayın (veya Ctrl+Enter)
5. **"Success"** mesajını görmelisiniz

### Yöntem 2: Table Editor (Alternatif)

1. Sol menüden **"Table Editor"** seçin
2. **"New table"** butonuna tıklayın
3. Tablo bilgilerini girin:
   - **Name:** `leaderboard_users`
   - **Columns ekleyin:**
     - `wallet_address` (type: text, Primary Key: ✅)
     - `xp` (type: int8, Default: 0)
     - `tasks` (type: jsonb, Default: `[]`)
     - `updated_at` (type: timestamptz, Default: `now()`)
4. **"Save"** butonuna tıklayın

---

## Adım 4: API Keys ve URL'yi Alma

1. Sol menüden **"Settings"** (⚙️) seçin
2. **"API"** sekmesine tıklayın
3. Şu bilgileri kopyalayın:

### 🔑 Gereken Bilgiler:

1. **Project URL:**
   - **"Project URL"** başlığı altında
   - Örnek: `https://xxxxxxxxxxxxx.supabase.co`
   - ⚠️ **Bu URL'yi kopyalayın!**

2. **anon public key:**
   - **"Project API keys"** bölümünde
   - **"anon"** key'i kopyalayın
   - ⚠️ **Bu key'i kopyalayın!**

3. **service_role key:** (Opsiyonel - güvenlik için)
   - Aynı bölümde **"service_role"** key'i var
   - Şimdilik gerekli değil, anon key yeterli

---

## Adım 5: Vercel'de Environment Variables Ekleme

1. **Vercel Dashboard'a gidin:** https://vercel.com/dashboard
2. `earn.resilora.xyz` projenizi açın
3. **"Settings"** sekmesine tıklayın
4. Sol menüden **"Environment Variables"** seçin
5. Şu environment variable'ları ekleyin:

### Variable 1:
- **Name:** `SUPABASE_URL`
- **Value:** Proje URL'niz (Adım 4'ten kopyaladığınız)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development (hepsini seçin)
- **"Add"** butonuna tıklayın

### Variable 2:
- **Name:** `SUPABASE_ANON_KEY`
- **Value:** anon public key (Adım 4'ten kopyaladığınız)
- **Environments:** ✅ Production, ✅ Preview, ✅ Development (hepsini seçin)
- **"Add"** butonuna tıklayın

6. **Önemli:** Environment variable'ları ekledikten sonra **mutlaka redeploy yapın!**
   - Deployments sekmesine gidin
   - En son deployment'ın yanındaki "..." menüsünden **"Redeploy"** seçin

---

## Adım 6: Test

Environment variable'ları ekledikten ve redeploy yaptıktan sonra:

1. `https://earn.resilora.xyz` adresini açın
2. Cüzdan bağlayın
3. X hesabı bağlayın
4. Bir görev tamamlayın
5. Liderlik tablosunu kontrol edin
6. Supabase Dashboard > Table Editor > `leaderboard_users` tablosunda verilerinizi görebilirsiniz

---

## 📝 Önemli Notlar

### Güvenlik:
- `anon` key public key'dir, frontend'de kullanılabilir
- Row Level Security (RLS) açık, ancak policy'de tüm işlemlere izin verdik
- Production için daha sıkı policy'ler ekleyebilirsiniz

### Limits (Free Tier):
- ✅ 500 MB database storage
- ✅ 2 GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

Bu limitler çoğu proje için yeterli.

### Veri Kontrolü:
- Supabase Dashboard > Table Editor'de verilerinizi görebilirsiniz
- SQL Editor'dan query yazabilirsiniz
- Verileri manuel olarak düzenleyebilirsiniz

---

## 🆘 Sorun Giderme

### Tablo oluşturulamadı:
- SQL Editor'da hata mesajını kontrol edin
- Tablo zaten varsa "IF NOT EXISTS" kullanıldığı için sorun olmaz

### API Keys bulunamıyor:
- Settings > API sekmesinde olduğunuzdan emin olun
- Doğru project'i açtığınızı kontrol edin

### Environment variables çalışmıyor:
- Vercel'de redeploy yaptınız mı? (Çok önemli!)
- Variable isimleri doğru mu? (Büyük/küçük harf duyarlı)
- Tüm environment'larda (Production, Preview, Development) ekli mi?

### Veriler görünmüyor:
- Supabase Dashboard > Table Editor'de tabloyu kontrol edin
- Vercel function logs'ları kontrol edin (Dashboard > Functions)
- Browser console'da hata var mı kontrol edin

---

## ✅ Kurulum Tamamlandı!

Artık verileriniz Supabase'de kalıcı olarak saklanacak ve tüm serverless function'lar arasında paylaşılacak!

