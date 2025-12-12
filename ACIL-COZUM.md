# 🚨 Acil Çözüm - Veriler Görünmüyor

## Adım 1: SQL ile Kontrol Edin

Supabase SQL Editor'da şunu çalıştırın:

```sql
SELECT * FROM leaderboard_users ORDER BY xp DESC;
```

**Sonuç ne?**
- ✅ Veriler görünüyorsa → RLS/Table Editor sorunu (çözüm aşağıda)
- ❌ Boş dönüyorsa → Veriler yazılmıyor (API sorunu)

## Adım 2: Vercel Function Logs Kontrolü

1. Vercel Dashboard → Functions → `/api/user/update`
2. Logs sekmesinde şunları arayın:
   - `📝 Upserting data to Supabase: {...}`
   - `✅ Upsert successful`
   - `❌ Supabase upsert error`

**Ne görüyorsunuz?**

## Adım 3: Manuel Test

Browser console'da:

```javascript
fetch('https://earn.resilora.xyz/api/user/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0xTEST1234567890123456789012345678901234567890',
    tasks: [{ id: 1, status: 'completed' }]
  })
})
.then(res => res.json())
.then(data => console.log('Response:', data));
```

Sonra Supabase'de:
```sql
SELECT * FROM leaderboard_users WHERE wallet_address = '0xtest1234567890123456789012345678901234567890';
```

## Adım 4: Service Role Key Kullanın

Eğer veriler SQL'de görünüyorsa ama Table Editor'da görünmüyorsa:

1. Vercel → Environment Variables
2. `SUPABASE_SERVICE_ROLE_KEY` ekleyin (Supabase Settings → API → service_role key)
3. Redeploy yapın

Service role key ile yazılan veriler Table Editor'da görünür.

---

## En Hızlı Çözüm

SQL Editor'da:
```sql
-- Tüm verileri göster (admin olarak)
SELECT * FROM leaderboard_users ORDER BY xp DESC;

-- Eğer veriler görünüyorsa, RLS'i kapat
ALTER TABLE leaderboard_users DISABLE ROW LEVEL SECURITY;
```

Sonra Table Editor'da F5 ile yenileyin.

