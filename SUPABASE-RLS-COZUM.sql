-- Supabase RLS (Row Level Security) Çözümü
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- 1. Önce mevcut verileri kontrol edin
SELECT * FROM leaderboard_users ORDER BY xp DESC;

-- 2. Eğer veriler SQL'de görünüyorsa ama Table Editor'da görünmüyorsa:

-- Mevcut policy'leri göster
SELECT * FROM pg_policies WHERE tablename = 'leaderboard_users';

-- 3. Tüm policy'leri sil
DROP POLICY IF EXISTS "Allow all operations" ON leaderboard_users;
DROP POLICY IF EXISTS "Enable all operations for all users" ON leaderboard_users;
DROP POLICY IF EXISTS "Public access" ON leaderboard_users;

-- 4. RLS'i geçici olarak kapat (test için)
ALTER TABLE leaderboard_users DISABLE ROW LEVEL SECURITY;

-- VEYA (Tercih edilen): Yeni, açık bir policy ekle
ALTER TABLE leaderboard_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read and write access" ON leaderboard_users
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- 5. Tekrar kontrol edin
SELECT * FROM leaderboard_users ORDER BY xp DESC;

-- 6. Table Editor'da sayfayı yenileyin (F5 veya refresh)

