-- ============================================================
-- バクトレ研修 V6.2: オンボーディング（初回ヒアリング）
-- ============================================================
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. このファイルの内容を全て貼り付けて Run
-- 3. 冪等設計なので、何度実行しても安全です
-- ============================================================

BEGIN;

-- ============================================================
-- 1. profiles テーブルにオンボーディング用カラムを追加
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_age_group TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_attribute TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_short_term_goals TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_long_term_dream TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_self_image TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_practice_frequency TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_self_reported_skills TEXT[];

COMMIT;

-- ============================================================
-- 2. 確認用 SELECT（追加されたカラムをリスト化）
-- ============================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'onboarding_%'
ORDER BY ordinal_position;
