# API Test Kontrol Listesi

## 1. API Endpoint'lerini Test Edin

Aşağıdaki URL'leri tarayıcınızda açarak test edin:

### ✅ Leaderboard Endpoint
```
https://earn.resilora.xyz/api/leaderboard
```

**Beklenen Response:**
```json
{
  "success": true,
  "top50": [],
  "currentUser": null
}
```

### ✅ User Rank Endpoint (Test)
```
https://earn.resilora.xyz/api/user/rank?walletAddress=0x1234567890123456789012345678901234567890
```

**Beklenen Response:**
```json
{
  "success": true,
  "rank": null,
  "xp": 0,
  "walletAddress": "0x1234567890123456789012345678901234567890"
}
```

---

## 2. Browser Console'da Test

Tarayıcıda `earn.resilora.xyz` sitesini açın ve F12 ile Console'u açın:

```javascript
// Leaderboard test
fetch('https://earn.resilora.xyz/api/leaderboard')
  .then(res => res.json())
  .then(data => console.log('Leaderboard:', data));

// User update test
fetch('https://earn.resilora.xyz/api/user/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0x1234567890123456789012345678901234567890',
    tasks: [
      { id: 1, status: 'completed' },
      { id: 2, status: 'completed' }
    ]
  })
})
.then(res => res.json())
.then(data => console.log('User updated:', data));
```

---

## 3. Frontend Test

1. ✅ Site açılıyor mu: `https://earn.resilora.xyz`
2. ✅ Cüzdan bağlanabiliyor mu
3. ✅ X hesabı bağlanabiliyor mu
4. ✅ Görev tamamlanabiliyor mu
5. ✅ Liderlik tablosu görünüyor mu
6. ✅ Browser Console'da hata var mı kontrol edin (F12)

---

## 4. Vercel Dashboard Kontrolleri

1. ✅ Vercel Dashboard > Project > **Functions** sekmesine gidin
2. ✅ Şu function'lar görünüyor mu:
   - `/api/leaderboard`
   - `/api/user-update`
   - `/api/user-rank`
3. ✅ Function loglarında hata var mı kontrol edin

---

## 5. Network Tab Kontrolü

1. Browser'da F12 > **Network** sekmesi
2. Siteyi yenileyin
3. Görev tamamladığınızda:
   - `/api/user/update` isteği gitti mi?
   - `/api/leaderboard` isteği gitti mi?
   - Response'lar 200 OK mu?

