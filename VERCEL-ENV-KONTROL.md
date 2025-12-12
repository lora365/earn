# 🔍 Vercel Environment Variables Kontrolü

## Hızlı Test

Deploy sonrası şu URL'yi açın:
```
https://earn.resilora.xyz/api/test-supabase
```

Bu sayfa size şunları gösterecek:
- ✅ Supabase URL var mı?
- ✅ Service Role Key var mı?
- ✅ Anon Key var mı?
- ✅ Supabase bağlantısı çalışıyor mu?

---

## Vercel Dashboard'da Kontrol Edin

1. **Vercel Dashboard** → **earn** projesi → **Settings** → **Environment Variables**

2. Şu variable'ların **HEPSİNİN** olması gerekiyor:
   - `SUPABASE_URL` → `https://evclndweefimxvxcdgyer.supabase.co`
   - `SUPABASE_ANON_KEY` → `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` → `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (service_role key)

3. **ÖNEMLİ:** Her variable'ın yanında **Environment** seçimi olmalı:
   - ✅ **Production** (işaretli olmalı)
   - ✅ **Preview** (opsiyonel)
   - ✅ **Development** (opsiyonel)

---

## Eksik Variable Varsa

1. **Supabase Dashboard** → **Settings** → **API**
2. Şunları kopyalayın:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **ÖNEMLİ: Bu secret key, paylaşmayın!**

3. **Vercel** → **Environment Variables** → **Add New**
   - Her birini ekleyin
   - **Production** environment'ı seçin
   - **Save**

4. **Redeploy** yapın:
   - **Deployments** → En son deployment → **...** → **Redeploy**

---

## Deploy Sonrası

1. `/api/test-supabase` endpoint'ini test edin
2. Browser console'da bir görev tamamlayın
3. Vercel Function logs'unda hata var mı kontrol edin

