# Supabase Tablo Kontrol Rehberi

## Veriler Görünmüyor mu? İşte Kontrol Listesi

### 1. Doğru Project'e mi Bakıyorsunuz?

Supabase Dashboard'da:
1. Sağ üst köşede **project switcher** var
2. Doğru project'i seçtiğinizden emin olun: `evclndweefimxvxcdgyer` veya project isminiz
3. Veya URL'de project ref'i var: `https://supabase.com/dashboard/project/evclndweefimxvxcdgyer`

### 2. Table Editor'da Doğru Tabloyu Kontrol Edin

1. Sol menü → **"Table Editor"**
2. **"leaderboard_users"** tablosunu seçin
3. Üstte **filter/search** var mı kontrol edin (verileri gizliyor olabilir)

### 3. RLS (Row Level Security) Kontrolü

RLS açık olabilir ve verileri gizliyor olabilir. Kontrol edin:

1. SQL Editor'a gidin
2. Şu SQL'i çalıştırın:

```sql
-- RLS'i kapat (test için)
ALTER TABLE leaderboard_users DISABLE ROW LEVEL SECURITY;
```

**VEYA** Policy'yi kontrol edin:

```sql
-- Mevcut policy'leri göster
SELECT * FROM pg_policies WHERE tablename = 'leaderboard_users';
```

**VEYA** Yeni bir policy ekleyin:

```sql
-- Mevcut policy'yi sil
DROP POLICY IF EXISTS "Allow all operations" ON leaderboard_users;

-- Yeni policy ekle (daha açık)
CREATE POLICY "Allow all operations" ON leaderboard_users
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
```

### 4. Manuel SQL Query ile Kontrol

SQL Editor'da şunu çalıştırın:

```sql
-- Tüm verileri göster
SELECT * FROM leaderboard_users ORDER BY xp DESC;

-- Kayıt sayısı
SELECT COUNT(*) FROM leaderboard_users;

-- Son eklenen veriler
SELECT * FROM leaderboard_users ORDER BY updated_at DESC LIMIT 10;
```

**Eğer bu query sonuç döndürüyorsa ama Table Editor'da görünmüyorsa:**
- RLS policy sorunu olabilir
- Table Editor cache sorunu olabilir (sayfayı yenileyin)

### 5. API'den Gelen Verileri Kontrol

Browser console'da:

```javascript
fetch('https://earn.resilora.xyz/api/leaderboard')
  .then(res => res.json())
  .then(data => {
    console.log('Leaderboard data:', data);
    console.log('Total users:', data.top50.length);
  });
```

Eğer veri geliyorsa ama Supabase'de görünmüyorsa:
- Farklı database'e yazıyor olabilir
- Veya RLS verileri gizliyor

### 6. API Logs Kontrolü

Vercel Function logs'larında:
- `✅ User updated in Supabase` mesajını görüyor musunuz?
- Hata mesajı var mı?

### 7. Column İsimleri Kontrolü

Supabase'de column isimleri:
- `wallet_address` (snake_case)
- `xp`
- `tasks`
- `updated_at`

Table Editor'da bu column'lar görünüyor mu?

### 8. Veri Ekleme Testi

SQL Editor'da manuel test:

```sql
INSERT INTO leaderboard_users (wallet_address, xp, tasks, updated_at)
VALUES ('0x1234567890123456789012345678901234567890', 100, '[]'::jsonb, NOW())
ON CONFLICT (wallet_address) DO UPDATE SET xp = 100;

-- Kontrol et
SELECT * FROM leaderboard_users;
```

Bu çalışıyorsa, API'den gelen veriler farklı bir yere yazılıyor olabilir.

---

## En Yaygın Çözüm

**RLS Policy'yi güncelleyin:**

```sql
-- Eski policy'yi sil
DROP POLICY IF EXISTS "Allow all operations" ON leaderboard_users;

-- Yeni, daha açık policy
CREATE POLICY "Enable all operations for all users" ON leaderboard_users
FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

Sonra Table Editor'da sayfayı yenileyin.

