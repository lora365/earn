-- Supabase Veri Kontrol SQL'leri
-- Bu query'leri tek tek çalıştırın ve sonuçları kontrol edin

-- 1. Tablo var mı kontrol et
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'leaderboard_users';

-- 2. Tablo yapısını kontrol et
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leaderboard_users';

-- 3. Toplam kayıt sayısı (RLS'den bağımsız)
SELECT COUNT(*) as total_count FROM leaderboard_users;

-- 4. Tüm verileri göster (RLS bypass - admin olarak)
SELECT * FROM leaderboard_users ORDER BY xp DESC;

-- 5. Son eklenen 10 kayıt
SELECT * FROM leaderboard_users 
ORDER BY updated_at DESC 
LIMIT 10;

-- 6. Belirli bir wallet address kontrol et
SELECT * FROM leaderboard_users 
WHERE wallet_address = '0xa382b392b0ef1f16a70ff6708363b95f87b915f6';

-- 7. RLS durumunu kontrol et
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'leaderboard_users';

-- 8. Policy'leri listeleyin
SELECT * FROM pg_policies 
WHERE tablename = 'leaderboard_users';

