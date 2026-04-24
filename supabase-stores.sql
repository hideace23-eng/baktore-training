-- ============================================================
-- 店舗管理テーブル + profiles拡張
-- 実行順: 2番目（ロールv2マイグレーション後）
-- ============================================================

-- 1. 店舗テーブル
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- 全員閲覧可
CREATE POLICY "Anyone can read stores" ON stores FOR SELECT USING (true);

-- super_adminのみ管理
CREATE POLICY "Super admins can insert stores" ON stores FOR INSERT WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY "Super admins can update stores" ON stores FOR UPDATE USING (get_my_role() = 'super_admin');
CREATE POLICY "Super admins can delete stores" ON stores FOR DELETE USING (get_my_role() = 'super_admin');

-- 2. profiles拡張
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_gold_member BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until DATE; -- 将来の課金機能用

-- 3. 初期店舗データ
INSERT INTO stores (name, address, phone, area) VALUES
  ('世田谷店', '東京都世田谷区', '', '東京西部'),
  ('白金高輪店', '東京都港区白金', '', '東京南部'),
  ('城東店', '東京都江東区', '', '東京東部'),
  ('練馬店', '東京都練馬区', '', '東京北部'),
  ('練馬本店', '東京都練馬区（本店）', '', '東京北部')
ON CONFLICT DO NOTHING;
