# 🔍 Sorun Giderme - Liderlik Tablosu Boş

## 1. Browser Console Kontrolü

Browser'da F12 → Console sekmesinde şunları kontrol edin:

### Başarılı olmalı:
- `✅ User successfully updated on server: {...}`
- `✅ Leaderboard data received: {...}`

### Hata varsa:
- `❌ Error updating user on server: ...`
- `❌ Error fetching leaderboard: ...`
- `Supabase not configured` hatası

## 2. Supabase Tablo Kontrolü

1. Supabase Dashboard'a gidin
2. Sol menü → **"Table Editor"**
3. **"leaderboard_users"** tablosu görünüyor mu?
4. Tabloda veriler var mı?

**Eğer tablo yoksa:**
- SQL Editor'a gidin
- Aşağıdaki SQL'i çalıştırın:

```sql
CREATE TABLE IF NOT EXISTS leaderboard_users (
  wallet_address TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  tasks JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_xp ON leaderboard_users(xp DESC);

ALTER TABLE leaderboard_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations" ON leaderboard_users
FOR ALL USING (true) WITH CHECK (true);
```

## 3. Vercel Environment Variables Kontrolü

1. Vercel Dashboard → Settings → Environment Variables
2. Şu iki variable var mı kontrol edin:
   - `SUPABASE_URL` = `https://evclndweefimxvxcdgyer.supabase.co`
   - `SUPABASE_ANON_KEY` = (anon key)

**Eğer yoksa veya yanlışsa:**
- Ekleyin/düzeltin
- **MUTLAKA redeploy yapın**

## 4. Vercel Function Logs Kontrolü

1. Vercel Dashboard → Project → **"Functions"** sekmesi
2. `/api/user/update` function'ına tıklayın
3. Logları kontrol edin

**Hata görüyorsanız:**
- "Supabase not configured" → Environment variables eklenmemiş
- "Database error" → Supabase bağlantı sorunu
- "Table doesn't exist" → Tablo oluşturulmamış

## 5. Manual API Test

Browser console'da şunu çalıştırın:

```javascript
// Test API
fetch('https://earn.resilora.xyz/api/user/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0x1234567890123456789012345678901234567890',
    tasks: [
      { id: 1, status: 'completed' }
    ]
  })
})
.then(res => res.json())
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));
```

**Beklenen:**
```json
{
  "success": true,
  "user": {
    "walletAddress": "...",
    "xp": 100,
    "rank": 1
  }
}
```

**Hata varsa:**
- Response'u paylaşın

## 6. Leaderboard API Test

```javascript
fetch('https://earn.resilora.xyz/api/leaderboard')
.then(res => res.json())
.then(data => console.log('Leaderboard:', data))
.catch(err => console.error('Error:', err));
```

**Beklenen:**
```json
{
  "success": true,
  "top50": [
    {
      "walletAddress": "...",
      "xp": 100,
      "rank": 1
    }
  ],
  "currentUser": null
}
```

---

## En Yaygın Sorunlar ve Çözümleri

### Sorun 1: "Supabase not configured"
**Çözüm:** Environment variables ekleyin ve redeploy yapın

### Sorun 2: Tablo yok
**Çözüm:** SQL Editor'da tabloyu oluşturun

### Sorun 3: RLS Policy hatası
**Çözüm:** Policy oluşturulduğundan emin olun

### Sorun 4: Environment variables redeploy edilmemiş
**Çözüm:** Deployments → Redeploy yapın

---

## Debug Adımları

1. ✅ Browser console'u kontrol edin
2. ✅ Supabase Table Editor'da tablo var mı?
3. ✅ Supabase'de veri var mı?
4. ✅ Vercel Environment Variables doğru mu?
5. ✅ Redeploy yapıldı mı?
6. ✅ Vercel Function logs'ları kontrol edin
7. ✅ Manual API test yapın

