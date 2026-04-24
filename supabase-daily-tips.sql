-- ============================================================
-- 毎日のQ&A・豆知識テーブル
-- 実行順: 3番目（ロールv2マイグレーション後）
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_tips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  video_url TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE daily_tips ENABLE ROW LEVEL SECURITY;

-- 全員閲覧可
CREATE POLICY "Anyone can read active tips" ON daily_tips
  FOR SELECT USING (true);

-- super_adminのみ作成・編集・削除
CREATE POLICY "Super admins can insert tips" ON daily_tips
  FOR INSERT WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY "Super admins can update tips" ON daily_tips
  FOR UPDATE USING (get_my_role() = 'super_admin');
CREATE POLICY "Super admins can delete tips" ON daily_tips
  FOR DELETE USING (get_my_role() = 'super_admin');
