-- ################################################################
-- バクトレ研修 - 統合マイグレーション SQL (冪等)
-- 何度実行してもエラーにならない安全設計
-- 前提: supabase-schema.sql / supabase-fix-rls.sql / supabase-checklist.sql 実行済み
-- ################################################################


-- ===== 1. supabase-migration-roles-v2.sql =====

-- 1-1. role CHECK制約を更新（旧3段階 → 新5段階）
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'teacher', 'student', 'guest'));

-- 1-2. 既存の admin → super_admin に昇格
UPDATE profiles SET role = 'super_admin' WHERE role = 'admin';

-- 1-3. get_my_role() を更新
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- 1-4. 招待テーブル
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

DROP POLICY IF EXISTS "Super admins can manage invitations" ON invitations;
CREATE POLICY "Super admins can manage invitations" ON invitations
  FOR ALL USING (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON invitations;
CREATE POLICY "Anyone can read invitation by token" ON invitations
  FOR SELECT USING (true);

-- 1-5〜1-8. チェックリストRLS更新は後方（セクション3の後）に移動済み

-- 1-9. profiles RLS更新
DROP POLICY IF EXISTS "Admins can update can_edit_checklist" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Teachers can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;

CREATE POLICY "Super admins can view all profiles" ON profiles FOR SELECT
  USING (get_my_role() = 'super_admin');
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT
  USING (get_my_role() = 'admin');
CREATE POLICY "Teachers can view all profiles" ON profiles FOR SELECT
  USING (get_my_role() = 'teacher');
CREATE POLICY "Super admins can update any profile" ON profiles FOR UPDATE
  USING (get_my_role() = 'super_admin');

-- 1-10. handle_new_user トリガー関数を更新（常にstudent）
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


-- ===== 2. supabase-stores.sql =====

-- 2-1. 店舗テーブル
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

DROP POLICY IF EXISTS "Anyone can read stores" ON stores;
CREATE POLICY "Anyone can read stores" ON stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can insert stores" ON stores;
CREATE POLICY "Super admins can insert stores" ON stores FOR INSERT WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins can update stores" ON stores;
CREATE POLICY "Super admins can update stores" ON stores FOR UPDATE USING (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins can delete stores" ON stores;
CREATE POLICY "Super admins can delete stores" ON stores FOR DELETE USING (get_my_role() = 'super_admin');

-- 2-2. profiles拡張
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_gold_member BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until DATE;

-- 2-3. 初期店舗データ（nameで重複防止）
INSERT INTO stores (name, address, phone, area)
  SELECT '世田谷店', '東京都世田谷区', '', '東京西部'
  WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = '世田谷店');
INSERT INTO stores (name, address, phone, area)
  SELECT '白金高輪店', '東京都港区白金', '', '東京南部'
  WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = '白金高輪店');
INSERT INTO stores (name, address, phone, area)
  SELECT '城東店', '東京都江東区', '', '東京東部'
  WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = '城東店');
INSERT INTO stores (name, address, phone, area)
  SELECT '練馬店', '東京都練馬区', '', '東京北部'
  WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = '練馬店');
INSERT INTO stores (name, address, phone, area)
  SELECT '練馬本店', '東京都練馬区（本店）', '', '東京北部'
  WHERE NOT EXISTS (SELECT 1 FROM stores WHERE name = '練馬本店');


-- ===== 3. supabase-checklist-admin.sql =====

-- 3-1. profiles に can_edit_checklist カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_edit_checklist BOOLEAN NOT NULL DEFAULT false;

-- 3-2. カテゴリテーブル
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3-3. 技テーブル
CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  skill_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'b' CHECK (level IN ('b', 'm', 'a')),
  hint TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3-4. チェック項目テーブル
CREATE TABLE IF NOT EXISTS check_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  video_url TEXT,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3-5. 詳細チェック項目テーブル
CREATE TABLE IF NOT EXISTS check_sub_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_item_id UUID REFERENCES check_items(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3-6. RLS有効化
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_sub_items ENABLE ROW LEVEL SECURITY;

-- 3-7. 読み取りポリシー（冪等）
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read skills" ON skills;
CREATE POLICY "Anyone can read skills" ON skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read check_items" ON check_items;
CREATE POLICY "Anyone can read check_items" ON check_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read check_sub_items" ON check_sub_items;
CREATE POLICY "Anyone can read check_sub_items" ON check_sub_items FOR SELECT USING (true);

-- 3-8. チェックリスト書き込みポリシー（セクション1から移動: super_admin/admin対応）

-- categories
DROP POLICY IF EXISTS "Admins and editors can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins and editors can update categories" ON categories;
DROP POLICY IF EXISTS "Admins and editors can delete categories" ON categories;
DROP POLICY IF EXISTS "Checklist editors can insert categories" ON categories;
DROP POLICY IF EXISTS "Checklist editors can update categories" ON categories;
DROP POLICY IF EXISTS "Checklist editors can delete categories" ON categories;

CREATE POLICY "Checklist editors can insert categories" ON categories FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update categories" ON categories FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete categories" ON categories FOR DELETE
  USING (get_my_role() = 'super_admin');

-- skills
DROP POLICY IF EXISTS "Admins and editors can insert skills" ON skills;
DROP POLICY IF EXISTS "Admins and editors can update skills" ON skills;
DROP POLICY IF EXISTS "Admins and editors can delete skills" ON skills;
DROP POLICY IF EXISTS "Checklist editors can insert skills" ON skills;
DROP POLICY IF EXISTS "Checklist editors can update skills" ON skills;
DROP POLICY IF EXISTS "Checklist editors can delete skills" ON skills;

CREATE POLICY "Checklist editors can insert skills" ON skills FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update skills" ON skills FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete skills" ON skills FOR DELETE
  USING (get_my_role() = 'super_admin');

-- check_items
DROP POLICY IF EXISTS "Admins and editors can insert check_items" ON check_items;
DROP POLICY IF EXISTS "Admins and editors can update check_items" ON check_items;
DROP POLICY IF EXISTS "Admins and editors can delete check_items" ON check_items;
DROP POLICY IF EXISTS "Checklist editors can insert check_items" ON check_items;
DROP POLICY IF EXISTS "Checklist editors can update check_items" ON check_items;
DROP POLICY IF EXISTS "Checklist editors can delete check_items" ON check_items;

CREATE POLICY "Checklist editors can insert check_items" ON check_items FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update check_items" ON check_items FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete check_items" ON check_items FOR DELETE
  USING (get_my_role() IN ('super_admin', 'admin'));

-- check_sub_items
DROP POLICY IF EXISTS "Admins and editors can insert check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Admins and editors can update check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Admins and editors can delete check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Checklist editors can insert check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Checklist editors can update check_sub_items" ON check_sub_items;
DROP POLICY IF EXISTS "Checklist editors can delete check_sub_items" ON check_sub_items;

CREATE POLICY "Checklist editors can insert check_sub_items" ON check_sub_items FOR INSERT
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can update check_sub_items" ON check_sub_items FOR UPDATE
  USING (get_my_role() IN ('super_admin', 'admin') OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_edit_checklist = true));
CREATE POLICY "Checklist editors can delete check_sub_items" ON check_sub_items FOR DELETE
  USING (get_my_role() IN ('super_admin', 'admin'));


-- ===== 4. supabase-checklist-seed.sql =====

-- カテゴリ
INSERT INTO categories (key, name, color, order_index) VALUES
  ('base', '倒立 / Hand Stand', 'base', 0),
  ('back', '後方系 / Back', 'back', 1),
  ('front', '前方系 / Front', 'front', 2),
  ('side', '側方系 / Side', 'side', 3),
  ('special', '特殊技 / Special', 'special', 4)
ON CONFLICT (key) DO NOTHING;

-- 技・チェック項目・詳細項目の投入
DO $$
DECLARE
  cat_base UUID;
  cat_back UUID;
  cat_front UUID;
  cat_side UUID;
  cat_special UUID;
  sk UUID;
  ci UUID;
BEGIN
  SELECT id INTO cat_base FROM categories WHERE key = 'base';
  SELECT id INTO cat_back FROM categories WHERE key = 'back';
  SELECT id INTO cat_front FROM categories WHERE key = 'front';
  SELECT id INTO cat_side FROM categories WHERE key = 'side';
  SELECT id INTO cat_special FROM categories WHERE key = 'special';

  -- ===== BASE: 倒立 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_base, 'handstand', '倒立', 'b', 'すべての技の土台となる基礎スキル', 'バクトレ全技術の土台。壁倒立から始め、フリー倒立の習得を目指す。倒立の質が全ての技のクオリティを決める。', 0) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'handstand'; END IF;
  -- 既にcheck_itemsがある場合はスキップ
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '壁倒立を3秒以上キープできる', '壁倒立 基礎ドリル', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '手のひら全体で床を押せている', 0), (ci, '肩が耳につくくらい開いている', 1), (ci, '体が一直線になっている', 2), (ci, 'つま先が伸びている', 3), (ci, '手首の角度が正しい', 4);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'キック動作でまっすぐ上がれる', 'キック練習ドリル', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '踏み込み足が真っ直ぐ前に出ている', 0), (ci, '振り上げ足のキックが強い', 1), (ci, '両足が揃うタイミングが合っている', 2), (ci, '目線が手と手の間にある', 3);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '体が一直線になっている（お腹が抜けない）', '体幹ライン確認', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '腹筋に力が入っている', 0), (ci, '背中が反りすぎていない', 1), (ci, 'お尻が締まっている', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'フリー倒立を1秒以上キープできる', 'フリー倒立 バランス練習', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'バランスを指先で微調整できる', 0), (ci, '倒れそうになったとき前転で安全に降りられる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '倒立から安全に降りられる（前転逃げ）', '倒立→前転 安全降り', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '前転の受け身が綺麗にできる', 0), (ci, '頭を抱えて丸くなれる', 1), (ci, '恐怖心なく降りられる', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '手の位置が肩幅になっている', '手の位置チェック', 5) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '広すぎず狭すぎない', 0), (ci, '手首の角度が適切（60〜90度）', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '視線が正しい位置にある（手と手の間）', '視線チェック', 6) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '首が力みすぎていない', 0), (ci, '頭が落ちていない', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助なしで5秒キープできる', 'フリー倒立 5秒チャレンジ', 7) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '壁なしで3秒クリア済み', 0), (ci, '補助者が手を添えるだけでキープできる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '倒立ブリッジ（倒立→ブリッジで降りる）ができる', '倒立ブリッジ ドリル', 8) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'ブリッジ姿勢が綺麗にできる', 0), (ci, '倒立からゆっくり降ろせる', 1), (ci, '腰の柔軟性が十分ある', 2);
  END IF;

  -- ===== BACK: ブリッジ =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_back, 'bridge', 'ブリッジ', 'b', '後方系の柔軟性基礎', '後方系技術の柔軟性基盤。肩・腰の柔軟性を確認し、後方系技術への土台を作る。', 0) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'bridge'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'ブリッジ姿勢を5秒キープできる', 'ブリッジ基礎', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '両手・両足が床についている', 0), (ci, '腰が十分に持ち上がっている', 1), (ci, '肩が開いている', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'ブリッジから立ち上がれる（ブリッジアップ）', 'ブリッジアップ', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '足で床を踏み込んで立てる', 0), (ci, '恐怖なく後ろに体を反らせる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '肩の柔軟性が十分ある', '肩ストレッチ', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '壁に腕をつけてのストレッチができる', 0), (ci, '肩甲骨が動いている感覚がある', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '腰の柔軟性が十分ある', '腰柔軟トレーニング', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '後屈で頭が足に近づく', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '後ろへの恐怖がない（マットで練習済み）', '後ろ倒れ 恐怖克服', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'マットで後ろに倒れる練習ができている', 0), (ci, '補助者の支えで体を反らせる', 1);
  END IF;

  -- ===== BACK: 後転 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_back, 'kouten', '後転', 'b', '後方回転の基礎技', '後方系の基本。勢いと体の使い方を習得し、上位技への道を開く。', 1) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'kouten'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '後ろに安全に転がれる', '後転 安全練習', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'あごを引いて丸くなれる', 0), (ci, '勢いよく後ろに倒れられる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '手を耳の横に正しく構えられる', '後転 手の構え', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '手の向きが正しい（指が後ろ向き）', 0), (ci, '手のひらが上を向いている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '床を手で押して腰が上がる', '床プッシュ練習', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'タイミングよく押せている', 0), (ci, '押す力が十分ある', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '回転の勢いを止めずに立ち上がれる', '後転 通し練習', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '勢いが最後まで続いている', 0), (ci, '立ち上がり動作が流れている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続後転ができる', '連続後転', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '2回連続でできる', 0), (ci, 'リズムが一定', 1);
  END IF;

  -- ===== BACK: バク転 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_back, 'bakuten', 'バク転', 'a', '後方系の代表技・ジャンプ×倒立の組み合わせ', '「ジャンプ」と「倒立姿勢」を後方向に組み合わせた後方系の代表技。倒立の質とジャンプ力の両方が必要。恐怖心の克服も重要。', 2) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'bakuten'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '倒立姿勢が綺麗にできる（壁倒立3秒以上）', '倒立チェック 詳細', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '手のひら全体で床を押せている', 0), (ci, '肩が耳につくくらい開いている', 1), (ci, '体が一直線（腰が落ちていない）', 2), (ci, 'つま先が伸びている', 3), (ci, '手首の角度が正しい（90度程度）', 4);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '真上へのジャンプが力強くできる', 'ジャンプ力強化', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '膝を深く曲げて踏み込めている', 0), (ci, '腕の振り上げと踏み切りが連動している', 1), (ci, '50cm以上の高さが出ている', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '後方への恐怖心がない（補助あり）', '恐怖克服 補助練習', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '補助者の手で後ろに体を倒せる', 0), (ci, '後ろを見られる（頭を後ろに倒せる）', 1), (ci, '目を閉じずに動作できる', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '腕の振り上げ→頭の後傾タイミングが合っている', '腕振り×頭タイミング', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '腕を振り上げながら頭が後ろに倒れている', 0), (ci, 'ぎこちなく止まらずに流れている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助ありでバク転の全体の流れができる', '補助バク転 全体通し', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'ジャンプ→後傾→倒立→着地の流れが出ている', 0), (ci, '補助者が少ない力でサポートできている', 1), (ci, '空中で倒立姿勢が一瞬でも出ている', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地で両足が揃っている', '着地チェック', 5) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '着地時に足がバラバラになっていない', 0), (ci, '膝で衝撃吸収できている', 1), (ci, '着地後に前に崩れていない', 2);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '空中で体が伸びている（コンパクトになっていない）', '空中姿勢 確認', 6) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '膝が胸に引きつけられていない', 0), (ci, '体全体が弧を描いている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助なしで1回できる', '補助なし バク転 初挑戦', 7) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '一人でジャンプと後傾を同時にできる', 0), (ci, '着地まで恐怖なく通せる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続バク転を2回できる', '連続バク転', 8) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '1回目の着地から次のジャンプに入れる', 0), (ci, '勢いが繋がっている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'ロンダートからのバク転ができる', 'ロンダートバク転', 9) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'ロンダートの着地姿勢が後ろ向き', 0), (ci, 'ロンダート→バク転のテンポが合っている', 1), (ci, 'ロンダートの勢いをバク転に使えている', 2);
  END IF;

  -- ===== BACK: バク宙 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_back, 'bakusou', 'バク宙', 'a', '後方宙返り', '空中で後方に1回転する宙返り技。高い跳躍力と回転のタイミングが必要。', 3) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'bakusou'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '高さのある真上ジャンプができる', '跳躍力トレーニング', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '80cm以上の高さが出ている', 0), (ci, '腕の振りが大きい', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '抱え込み姿勢（膝を胸に引きつける）ができる', '抱え込みドリル', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '素早く膝を引きつけられる', 0), (ci, '手でしっかり抱えられる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '後方への恐怖がなく跳べる', 'バク宙 恐怖克服', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '補助ありで後ろに倒れながら跳べる', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助ありで全体の流れができる', '補助バク宙 通し', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '跳躍→抱え込み→開き→着地が繋がっている', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地が安定している', 'バク宙 着地練習', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '両足同時に着地できる', 0), (ci, '前に崩れない', 1);
  END IF;

  -- ===== BACK: ロンダートバク転 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_back, 'roundoff_bakuten', 'ロンダートバク転', 'a', 'ロンダートと連続バク転の組み合わせ', '助走の勢いをロンダートで後方に変換しそのままバク転に繋げる連続技。試合・発表でよく使われる花形コンビネーション。', 4) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'roundoff_bakuten'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'ロンダートが安定してできる', 'ロンダート確認', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '着地が後ろ向きになっている', 0), (ci, '勢いが着地まで続いている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'バク転が補助なしで1回できる', 'バク転確認', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '一人で最後まで通せる', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'ロンダートの着地からすぐバク転に入れる', 'ロンバク 接続練習', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '着地と同時に次のジャンプ準備ができている', 0), (ci, '止まらずにテンポが続いている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '助走→ロンダート→バク転が一つの流れになっている', 'ロンバク 通し練習', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '3つの動作がひとつの流れに見える', 0), (ci, 'スピードが落ちていない', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続2本（ロンバク×2）ができる', '連続ロンバク', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '1本目の着地から2本目に入れる', 0);
  END IF;

  -- ===== FRONT: 前転 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_front, 'maeten', '前転', 'b', '前方系の入門技', '前方回転の基礎。丸くなる感覚と首の保護を最初に習得する。', 0) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'maeten'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'あごを引いて丸くなれる', '前転 基礎', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '首が床につかず後頭部で回れる', 0), (ci, '背中が丸くなっている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '勢いよく回れる（止まらない）', '前転 流れ', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '踏み込みに勢いがある', 0), (ci, '回転途中で止まらない', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '起き上がりがスムーズ', '前転 起き上がり', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '立ち上がり動作が流れている', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続前転ができる', '連続前転', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '3回連続でできる', 0);
  END IF;

  -- ===== FRONT: 前宙 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_front, 'maesou', '前宙', 'a', '前方宙返り', '助走から前方に宙返りする技。踏み切りのタイミングと前傾の勢いが重要。', 1) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'maesou'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '助走からの踏み切りが強い', '踏み切り練習', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '最後の一歩で強く踏み込める', 0), (ci, '踏み切り足が真っ直ぐ前に向いている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '前傾で上に跳べる（前に倒れない）', '前宙 踏み切りタイミング', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '上方向への力が出ている', 0), (ci, '前につんのめらない', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '抱え込み動作が素早い', '前宙 抱え込みドリル', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '跳んだ瞬間に素早く膝が引きつけられる', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助ありで通し練習ができる', '補助前宙', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '踏み切り→抱え込み→開き→着地が繋がっている', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地が安定している', '前宙 着地', 4) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '両足で着地できる', 0), (ci, '後ろに転がらない', 1);
  END IF;

  -- ===== SIDE: 側転 =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_side, 'sokuten', '側転', 'b', '側方系の基礎技', '側方向への回転技。手→手→足→足の順番と体の一直線ラインが重要。', 0) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'sokuten'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '手→手→足→足の順番を守れる', '側転 基礎', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '両手を順番につけられる', 0), (ci, '足の着地が順番になっている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '空中で体が一直線になっている', '側転 空中姿勢', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '腰が落ちていない', 0), (ci, '倒立方向に体が向いている', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '真横の一直線ライン上を回れる', '側転 ライン練習', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'スタートとゴールが一直線上にある', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '足が高く上がっている', '側転 足の高さ確認', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '倒立通過点で足が真上になっている', 0), (ci, '膝が曲がっていない', 1);
  END IF;

  -- ===== SIDE: ロンダート =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_side, 'roundoff', 'ロンダート', 'm', '後方系への接続技として必須', '助走の勢いを後ろ向きに変換する技。バク転・バク宙への接続で使用する最重要の補助技。', 1) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'roundoff'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '助走からの踏み込みが正確', 'ロンダート 踏み込み', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '利き足を前にして入れる', 0), (ci, '斜め前に踏み込んでいる', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '空中で足が揃うタイミングが合っている', 'ロンダート 足揃え', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '倒立通過時に両足が合っている', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地が後ろ向き（後方系に繋げられる方向）', 'ロンダート 着地方向', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '着地後に後方に体重が乗っている', 0), (ci, '前に崩れていない', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続してバク転に繋げられる', 'ロンダートバク転 連結', 3) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'ロンダートの着地からすぐバク転に入れる', 0), (ci, 'テンポが一定になっている', 1);
  END IF;

  -- ===== SPECIAL: ヘリコプテイロ =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_special, 'helicopter', 'ヘリコプテイロ', 'a', '縦軸回転系の特殊技', '縦軸で回転しながら跳ぶ特殊技。高い空中感覚と回転コントロールが必要。', 0) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'helicopter'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '縦軸回転の感覚がある', 'ヘリコプテイロ 基礎', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'スピン動作が素早い', 0), (ci, '軸がブレない', 1);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '高さがある状態で回転できる', '跳躍×回転 練習', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '跳躍と回転が同時にできている', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地が安定している', '着地コントロール', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '回転を止めて着地できる', 0);
  END IF;

  -- ===== SPECIAL: ゲイナー =====
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index) VALUES (cat_special, 'gainer', 'ゲイナー', 'a', '前方踏み切りの後方宙返り', '前方向に踏み切りながら後方に宙返りする高難度技。', 1) ON CONFLICT (skill_key) DO NOTHING RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'gainer'; END IF;
  IF NOT EXISTS (SELECT 1 FROM check_items WHERE skill_id = sk) THEN
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '前方踏み切りの感覚がある', 'ゲイナー 踏み切り', 0) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '前に踏み込みながら後ろに跳べる', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '後方宙返りが単体でできる', 'バク宙 確認', 1) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'バク宙が安定してできている', 0);
    INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助ありで全体通しができる', '補助ゲイナー', 2) RETURNING id INTO ci;
    INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '踏み切り→後方回転→着地が繋がっている', 0);
  END IF;

END $$;


-- ===== 5. supabase-daily-tips.sql =====

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

DROP POLICY IF EXISTS "Anyone can read active tips" ON daily_tips;
CREATE POLICY "Anyone can read active tips" ON daily_tips FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can insert tips" ON daily_tips;
CREATE POLICY "Super admins can insert tips" ON daily_tips FOR INSERT WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins can update tips" ON daily_tips;
CREATE POLICY "Super admins can update tips" ON daily_tips FOR UPDATE USING (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins can delete tips" ON daily_tips;
CREATE POLICY "Super admins can delete tips" ON daily_tips FOR DELETE USING (get_my_role() = 'super_admin');


-- ===== 6. supabase-daily-tips-seed.sql =====

-- titleで重複防止
INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '筋力不足ですか？ - 連動性の重要さ', '「筋力が足りないからバク転ができない」と思っていませんか？実は、バク転に必要なのは筋力よりも「体の連動性」です。腕の振り・膝の曲げ・ジャンプ・後傾、これらを正しいタイミングで連動させることが重要です。

バクトレでは「連動トレーニング」を重視しています。具体的には、壁倒立で肩の開きを作り、ジャンプドリルでタイミングを覚え、マット上の後方倒れ込みで恐怖心を克服します。

筋トレも無駄ではありませんが、体幹トレーニング（プランク・Vシットなど）と柔軟性の改善を優先することで、より早く技を習得できます。「力んで跳ぶ」のではなく「流れるように動く」ことを目指しましょう。週2回の練習で、多くの方が3ヶ月以内に効果を実感しています。', 'training', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '筋力不足ですか？ - 連動性の重要さ');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '何歳から始められる？ - 年齢別アプローチ', 'バクトレ教室では3歳から60代まで幅広い年齢層の方が練習しています。年齢ごとにアプローチは異なりますが、どの年齢でもアクロバットを楽しむことは可能です。

3〜6歳：遊び感覚でマット運動。前転・後転・ブリッジなど基礎動作を体で覚える時期。恐怖心が少なく吸収が早いのが強みです。

7〜12歳：本格的な技の習得期。側転・倒立・バク転など、身体能力の成長とともに急速に上達します。

13〜18歳：筋力がつき、難易度の高い技にチャレンジできます。バク宙やロンダートバク転など組み合わせ技に挑戦する方が多いです。

大人（19歳〜）：柔軟性の改善から始め、段階的に技を習得します。大人は「理解してから動く」ため、フォームが綺麗になりやすいという強みがあります。

シニア（50歳〜）：安全を最優先に、ブリッジや倒立など体幹を鍛える動きから始めます。健康維持と達成感が大きなモチベーションです。', 'faq', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '何歳から始められる？ - 年齢別アプローチ');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT 'バク転は何ヶ月でできる？ - 期間と個人差', '「バク転は何ヶ月で習得できますか？」これは最もよくある質問のひとつです。結論から言うと、平均的に3〜6ヶ月が目安です。ただし、個人差が非常に大きいです。

早い方は1〜2ヶ月で補助なしバク転を達成します。この方たちに共通するのは、①倒立が安定している、②恐怖心が少ない、③週2回以上の練習頻度、の3つです。

一方、6ヶ月以上かかる方もいます。これは決して遅いわけではありません。恐怖心が強い方は、マット上での段階的な練習に時間をかけることで、最終的にはきれいなフォームのバク転を身につけます。

重要なのは「他人と比較しないこと」です。体格・柔軟性・運動経験・練習頻度、すべてが人それぞれ。自分のペースで確実にステップを踏んでいけば、必ずたどり着けます。焦りは怪我のもとです。

バクトレのチェックリストで自分の現在地を確認しながら、一歩一歩進んでいきましょう。', 'faq', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = 'バク転は何ヶ月でできる？ - 期間と個人差');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '怖くて跳べない - 恐怖の克服法', 'バク転の練習で「怖くて後ろに跳べない」と感じるのは完全に正常な反応です。これは体の防衛本能であり、恐怖を感じること自体を恥ずかしく思う必要はまったくありません。

バクトレでは恐怖心を段階的に克服するアプローチを採用しています：

ステップ1：マット上で後ろに倒れる練習。「後ろに体重を預ける」感覚を安全に体験します。

ステップ2：補助者の手を借りて、後方への体の移動を練習。自分で跳ぶのではなく、補助者のサポートで動きを覚えます。

ステップ3：補助量を徐々に減らし、自分の力の割合を増やしていきます。

ステップ4：補助者が「手を添えるだけ」の状態で成功体験を積みます。

ステップ5：補助なしでチャレンジ。ここまでの積み重ねがあれば、体が動き方を覚えています。

恐怖心は練習を重ねることでしか克服できません。しかし、正しいステップを踏めば、確実に小さくなっていきます。一人で無理に克服しようとせず、インストラクターと一緒に進めましょう。', 'mental', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '怖くて跳べない - 恐怖の克服法');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '首を痛めそう… - 正しいフォームの安全性', '「バク転で首を痛めないか心配」という声をよくいただきます。結論から言うと、正しいフォームで行えば首に負担はかかりません。

バク転のメカニズムを理解しましょう。バク転は「後方へのジャンプ＋倒立通過＋着地」です。空中では手が先に地面につき、体は倒立のアーチを描きます。この時、頭は後傾していますが、首に体重がかかることはありません。

首を痛めるケースは、①ジャンプが不十分で体が潰れる、②腕の突き放しが弱い、③頭を地面に向けて突っ込んでしまう、といった場合です。これらはすべて基礎練習の不足が原因です。

バクトレでは以下の順序で安全に習得します：
・壁倒立で肩と腕の強さを確認
・ブリッジで首と背中の柔軟性を確保
・マット上で補助付き練習を反復
・段階的に補助を減らす

適切な指導のもとで段階を踏めば、首の怪我のリスクは極めて低いです。不安な方はインストラクターに遠慮なく相談してください。', 'safety', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '首を痛めそう… - 正しいフォームの安全性');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '家で練習できる？ - 自主練のコツ', 'アクロバット技の練習は基本的にマットのある環境で行うべきですが、家でできる基礎トレーニングはたくさんあります。むしろ、自宅での基礎練習が上達を大きく加速させます。

【家でできる練習メニュー】
①壁倒立（1日3セット×30秒）：肩の開きと体幹の安定性を鍛えます。壁に足をつけて手で歩いて上がるやり方が安全です。

②ブリッジ（1日5回×10秒キープ）：肩と腰の柔軟性を維持・改善します。

③体幹トレーニング：プランク60秒、サイドプランク30秒×左右、Vシット10回。これらが技の安定性に直結します。

④ジャンプドリル：その場ジャンプで膝を胸に引きつける練習。高さと抱え込みのスピードを意識します。

⑤柔軟ストレッチ：肩甲骨まわり、股関節、腰まわりの柔軟性を毎日維持。

【注意事項】
・回転系の技は絶対に家で練習しないでください
・フローリングの上での倒立は手首を傷めやすいので、ヨガマット等を敷きましょう
・痛みを感じたらすぐに中止してください', 'training', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '家で練習できる？ - 自主練のコツ');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '大人でもできる？ - 年齢は言い訳にならない', '「もう大人だから無理でしょう…」これは一番もったいない思い込みです。バクトレ教室では20代〜40代の方がバク転を成功させた例が数多くあります。

大人には子供にない「強み」があります：
①理解力：「なぜこの動きをするのか」を論理的に理解できるため、フォームが綺麗になりやすい。
②集中力：限られた練習時間を有効に使える。
③自己管理：ストレッチや筋トレを計画的に行える。

一方で大人特有の「課題」もあります：
①柔軟性の低下：これは練習で必ず改善できます。最初は硬くても、毎日のストレッチで3ヶ月後には別人のような可動域になります。
②恐怖心が強い：大人は「痛い」「失敗する」を具体的に想像できてしまうため、段階的な克服が特に重要です。
③回復が遅い：無理をせず、週2回のペースで体を慣らしていきます。

年齢よりも大切なのは「続ける根気」です。週2回を3ヶ月続けた方は、年齢に関係なく確実に成長しています。今日が一番若い日です。始めるなら今です。', 'motivation', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '大人でもできる？ - 年齢は言い訳にならない');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '柔軟性は必要？ - 必要な範囲と改善法', 'アクロバットに柔軟性は「ある程度」必要ですが、新体操選手のような柔軟性は必要ありません。重要なのは以下の3つのポイントです。

①肩の柔軟性：倒立やバク転で腕を真上に上げたとき、肩が十分に開く必要があります。壁に背中をつけて腕をバンザイし、腕が壁につけばOKです。

②腰・背中の柔軟性：ブリッジで腰が十分に持ち上がる程度で大丈夫です。後方系の技ではここの柔軟性が着地の安定に繋がります。

③股関節の柔軟性：側転やロンダートで足を大きく開く際に使います。180度開脚は不要ですが、120度程度は目指したいところです。

【柔軟性を改善する方法】
・毎日のストレッチ（10分でOK）を3ヶ月続ける
・お風呂上がりが最も効果的
・痛気持ちいい程度で30秒キープ（無理に伸ばさない）
・肩甲骨まわり→腰→股関節の順に行う

柔軟性は必ず改善できます。「硬いから無理」ではなく「硬いからストレッチする」と考えましょう。バクトレのレッスン前のウォームアップでも柔軟性改善を取り入れています。', 'training', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '柔軟性は必要？ - 必要な範囲と改善法');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '週何回通えばいい？ - 理想の練習頻度', '最も多い質問のひとつ「週何回通えばいいですか？」への答えは、理想は週2回、最低月2回です。

【週2回の効果】
体が動きを「忘れない」頻度です。前回の練習で掴んだ感覚が残っている状態で次の練習に入れるため、上達スピードが最も効率的です。バク転を3〜6ヶ月で習得する方の多くがこの頻度で通っています。

【週1回の効果】
十分に効果があります。ただし、自宅で基礎トレーニング（壁倒立・ブリッジ・体幹）を週2〜3回行うと、週2回通いに近い効果が得られます。

【月2回の効果】
ゆっくりですが確実に前進します。「忙しくて毎週は難しい」という方でも、月2回を半年続ければ大きな変化があります。レッスン以外の日に自主練を組み合わせることを強くおすすめします。

【注意点】
・毎日の練習は逆効果。体の回復期間が必要です
・筋肉痛がある日は軽めのストレッチだけにしましょう
・「行けない週があっても気にしない」心構えが大事。長く続けることが一番の近道です

自分のライフスタイルに合った頻度で、無理なく続けましょう。', 'faq', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '週何回通えばいい？ - 理想の練習頻度');

INSERT INTO daily_tips (title, content, category, is_active)
  SELECT '前転と後転、どっちが先？ - 判断基準', '「前転と後転、どちらから練習すべきですか？」これは意外と人によって答えが変わる質問です。

【前転を先にする場合】
前転は「前に転がる」動きなので、視界に地面が見えている安心感があります。回転運動に慣れていない初心者、特に小さなお子様や恐怖心の強い方には前転から始めることをおすすめします。前転で「丸くなって回る」感覚を身につけてから後転に移行すると、体の使い方の理解がスムーズです。

【後転を先にする場合】
実は後転の方が「上手くやりやすい」という方もいます。前転は首に負荷がかかりやすく、あごを引く意識が難しいのに対し、後転は手で床を押すことで自然に回転できます。また、将来バク転を目指す場合、後方への回転感覚を早く身につけるメリットがあります。

【バクトレのアプローチ】
初回レッスンで両方を試してもらい、その方に合った方から始めます。大切なのは「どちらが先か」ではなく「どちらも安全に練習できるようになること」です。

最終的にはどちらも習得するので、順番にこだわりすぎず、楽しく練習できる方から始めましょう。', 'faq', true
  WHERE NOT EXISTS (SELECT 1 FROM daily_tips WHERE title = '前転と後転、どっちが先？ - 判断基準');


-- ===== 7. supabase-character-system.sql =====

-- 7-1. キャラクター状態テーブル
CREATE TABLE IF NOT EXISTS character_states (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  character_type TEXT NOT NULL CHECK (character_type IN ('acro_kun', 'acro_chan')),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  name VARCHAR(20) NOT NULL DEFAULT 'アクロ',
  last_login_date DATE,
  login_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7-2. XP獲得ログテーブル
CREATE TABLE IF NOT EXISTS xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_gained INTEGER NOT NULL,
  reason TEXT,
  resource_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON xp_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_dedup ON xp_logs (user_id, action_type, resource_id);

-- 7-3. RLS
ALTER TABLE character_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own character" ON character_states;
CREATE POLICY "Users can read own character" ON character_states FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own character" ON character_states;
CREATE POLICY "Users can insert own character" ON character_states FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own character" ON character_states;
CREATE POLICY "Users can update own character" ON character_states FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can read all characters" ON character_states;
CREATE POLICY "Super admins can read all characters" ON character_states FOR SELECT USING (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can read own xp_logs" ON xp_logs;
CREATE POLICY "Users can read own xp_logs" ON xp_logs FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own xp_logs" ON xp_logs;
CREATE POLICY "Users can insert own xp_logs" ON xp_logs FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can read all xp_logs" ON xp_logs;
CREATE POLICY "Super admins can read all xp_logs" ON xp_logs FOR SELECT USING (get_my_role() = 'super_admin');


-- ===== FINAL: super_admin 昇格 =====
UPDATE profiles SET role = 'super_admin' WHERE email = 'hideace23@gmail.com';


-- ################################################################
-- 完了! 何度実行しても安全な冪等マイグレーションです。
-- ################################################################
