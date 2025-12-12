# Resilora Earn API - Backend Setup Guide

Bu proje, Resilora Earn XP sisteminin global liderlik tablosu için backend API içerir.

## Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn

### Adımlar

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Sunucuyu başlatın:**
   ```bash
   # Development (nodemon ile otomatik yeniden başlatma)
   npm run dev

   # Production
   npm start
   ```

3. **Sunucu varsayılan olarak `http://localhost:3001` adresinde çalışacak**

## API Endpoints

### GET /api/leaderboard
İlk 50 kullanıcıyı ve opsiyonel olarak mevcut kullanıcının sıralamasını döner.

**Query Parameters:**
- `walletAddress` (opsiyonel): Mevcut kullanıcının wallet adresi

**Response:**
```json
{
  "success": true,
  "top50": [
    {
      "walletAddress": "0x1234...5678",
      "xp": 450,
      "rank": 1,
      "updatedAt": "2025-12-12T10:00:00.000Z"
    }
  ],
  "currentUser": {
    "walletAddress": "0xabcd...efgh",
    "rank": 25,
    "xp": 350
  }
}
```

### POST /api/user/update
Kullanıcının XP bilgilerini günceller.

**Request Body:**
```json
{
  "walletAddress": "0x1234...5678",
  "tasks": [
    {
      "id": 1,
      "status": "completed"
    },
    {
      "id": 2,
      "status": "pending"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "walletAddress": "0x1234...5678",
    "xp": 450,
    "rank": 1
  }
}
```

### GET /api/user/rank/:walletAddress
Belirli bir wallet adresinin sıralamasını döner.

**Response:**
```json
{
  "success": true,
  "rank": 25,
  "xp": 350,
  "walletAddress": "0x1234...5678"
}
```

## Veri Depolama

Liderlik verileri `leaderboard-data.json` dosyasında saklanır. Bu dosya otomatik olarak oluşturulur.

**Production için öneriler:**
- Veritabanı kullanın (MongoDB, PostgreSQL, vb.)
- Verileri yedekleyin
- Rate limiting ekleyin
- CORS ayarlarını yapılandırın

## Frontend Konfigürasyonu

`script.js` dosyasında `CONFIG.API_URL` değerini production API URL'inize göre güncelleyin:

```javascript
API_URL: 'https://api.resilora.xyz', // Production API URL
```

## Liderlik Tablosu Özellikleri

- **İlk 50 kullanıcı:** Tüm bilgileri ile gösterilir
- **50'nin dışındaki kullanıcılar:** Sadece sıralaması gösterilir
- **Otomatik güncelleme:** Her 30 saniyede bir otomatik olarak güncellenir
- **Gerçek zamanlı:** Kullanıcı XP kazandığında anında API'ye gönderilir

## Deployment

### Heroku
```bash
heroku create resilora-earn-api
git push heroku main
```

### Vercel
```bash
vercel --prod
```

### Railway
Projeyi Railway'e bağlayın ve otomatik deploy edin.

## Güvenlik Notları

1. **CORS:** Production'da sadece güvenilir domain'lere izin verin
2. **Rate Limiting:** Spam'i önlemek için rate limiting ekleyin
3. **Validation:** Tüm inputları validate edin
4. **HTTPS:** Production'da mutlaka HTTPS kullanın

