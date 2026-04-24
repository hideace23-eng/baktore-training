-- ============================================================
-- ロール体系 v2 マイグレーション
-- 実行順: 1番目
-- ============================================================

-- 1. role CHECK制約を更新（旧3段階 → 新5段階）
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'teacher', 'student', 'guest'));

-- 2. 既存の admin → super_admin に昇格
UPDATE profiles SET role = 'super_admin' WHERE role = 'admin';

-- 3. get_my_role() を更新（既存関数を上書き）
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 4. 招待テーブル
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  invited_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- super_adminのみ招待を管理可能
CREATE POLICY "Super admins can manage invitations" ON invitations
  FOR ALL USING (get_my_role() = 'super_admin');

-- 招待トークンによる公開読み取り（signup時に検証用）
CREATE POLICY "Anyone can read invitation by token" ON invitations
  FOR SELECT USING (true);

-- 5. チェックリスト管理用RLSポリシー更新
-- 既存ポリシーを削除して再作成（super_admin / admin 対応）
-- categoriesテーブル
DROP POLICY IF EXISTS "Admins and editors can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins and editors can update categories" ON categories;
DROP POLICY IF EXISTS "Admins and editors can delete categories" ON categories;

CREATE POLICY "Checklist editors can insert categories" ON categories FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update categories" ON categories FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete categories" ON categories FOR DELETE
  USING (get_my_role() = 'super_admin');

-- skillsテーブル
DROP POLICY IF EXISTS "Admins and editors can insert skills" ON skills;
DROP POLICY IF EXISTS "Admins and editors can update skills" ON skills;
DROP POLICY IF EXISTS "Admins and editors can delete skills" ON skills;

CREATE POLICY "Checklist editors can insert skills" ON skills FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update skills" ON skills FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete skills" ON skills FOR DELETE
  USING (get_my_role() = 'super_admin');

-- check_itemsテーブル
DROP POLICY IF EXISTS "Admins and editors can insert check_items" ON check_items;
DROP POLICY IF EXISTS "Admins and editors can update check_items" ON check_items;
DROP POLICY IF EXISTS "Admins and editors can delete check_items" ON check_items;

CREATE POLICY "Checklist editors can insert check_items" ON check_items FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update check_items" ON check_items FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete check_items" ON check_items FOR DELETE
  USING (get_my_role() IN ('super_admin', 'admin'));

-- check_sub_itemsテーブル
DROP POLICY IF EXISTS "Admins and editors can insert check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Admins and editors can update check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Admins and editors can delete check_sub_items" ON check_sub_items;

CREATE POLICY "Checklist editors can insert check_sub_items" ON check_sub_items FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update check_sub_items" ON check_sub_items FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete check_sub_items" ON check_sub_items FOR DELETE
  USING (get_my_role() IN ('super_admin', 'admin'));

-- 6. profiles RLSポリシー更新（super_admin対応）
DROP POLICY IF EXISTS "Admins can update can_edit_checklist" ON profiles;
-- 既存ポリシーの"Admins can view all profiles"等もsuper_admin対応に再作成
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Super admins can view all profiles" ON profiles FOR SELECT
  USING (get_my_role() = 'super_admin');
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
  USING (get_my_role() = 'admin');
CREATE POLICY "Teachers can view all profiles" ON profiles FOR SELECT
  USING (get_my_role() = 'teacher');
CREATE POLICY "Super admins can update any profile" ON profiles FOR UPDATE
  USING (get_my_role() = 'super_admin');

-- handle_new_user トリガー更新（新規ユーザーは常にstudent）
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
