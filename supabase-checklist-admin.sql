-- ============================================================
-- チェックリスト管理テーブル + profiles 拡張
-- ============================================================

-- 1. profiles に can_edit_checklist カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_edit_checklist BOOLEAN NOT NULL DEFAULT false;

-- 2. カテゴリテーブル
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,          -- "base", "back" etc.
  name TEXT NOT NULL,                -- "倒立 / Hand Stand"
  color TEXT NOT NULL DEFAULT '',    -- "base", "back" etc. (色キー)
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 技テーブル
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  skill_key TEXT NOT NULL UNIQUE,    -- "handstand", "bakuten" etc.
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'b' CHECK (level IN ('b', 'm', 'a')),
  hint TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. チェック項目テーブル
CREATE TABLE IF NOT EXISTS check_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  video_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 詳細チェック項目テーブル
CREATE TABLE IF NOT EXISTS check_sub_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_item_id UUID REFERENCES check_items(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS ポリシー
-- ============================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_sub_items ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Anyone can read check_items" ON check_items FOR SELECT USING (true);
CREATE POLICY "Anyone can read check_sub_items" ON check_sub_items FOR SELECT USING (true);

-- admin または can_edit_checklist=true のユーザーが編集可能
CREATE POLICY "Admins and editors can insert categories" ON categories FOR INSERT
  WITH CHECK (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can update categories" ON categories FOR UPDATE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can delete categories" ON categories FOR DELETE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));

CREATE POLICY "Admins and editors can insert skills" ON skills FOR INSERT
  WITH CHECK (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can update skills" ON skills FOR UPDATE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can delete skills" ON skills FOR DELETE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));

CREATE POLICY "Admins and editors can insert check_items" ON check_items FOR INSERT
  WITH CHECK (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can update check_items" ON check_items FOR UPDATE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can delete check_items" ON check_items FOR DELETE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));

CREATE POLICY "Admins and editors can insert check_sub_items" ON check_sub_items FOR INSERT
  WITH CHECK (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can update check_sub_items" ON check_sub_items FOR UPDATE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Admins and editors can delete check_sub_items" ON check_sub_items FOR DELETE
  USING (get_my_role() = 'admin' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));

-- profiles の can_edit_checklist は admin のみ更新可
CREATE POLICY "Admins can update can_edit_checklist" ON profiles FOR UPDATE
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');
