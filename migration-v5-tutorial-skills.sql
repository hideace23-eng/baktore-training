-- ============================================================
-- バクトレ研修 V5: 必修チュートリアル（柔軟・倒立）+ カテゴリ分類
-- ============================================================
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. このファイルの内容を全て貼り付けて Run
-- 3. 冪等設計なので、何度実行しても安全です
-- ============================================================

BEGIN;

-- ============================================================
-- 1. skills テーブルにカラム追加
-- ============================================================
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_tutorial BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS skill_category TEXT DEFAULT NULL;

-- ============================================================
-- 2. 新規スキル「柔軟」(tutorial)
-- ============================================================
INSERT INTO skills (skill_key, name, level, hint, description, difficulty_level, order_index, is_tutorial, skill_category, category_id)
SELECT
  'flexibility',
  '柔軟',
  'b',
  'すべての技の土台となる柔軟性',
  '全アクロバット技術の土台。肩・腰・股関節・足首の柔軟性を確認し、安全に技に取り組むための準備をする。柔軟が十分な人はケガが少なく上達も早い。',
  0,
  0,
  true,
  'tutorial',
  (SELECT id FROM categories WHERE key = 'base' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE skill_key = 'flexibility');

-- 「柔軟」チェック項目
INSERT INTO check_items (skill_id, label, order_index)
SELECT s.id, ci.label, ci.idx
FROM skills s,
(VALUES
  ('★★★ 長座体前屈で手のひらが足先につく', 0),
  ('★★ 開脚して胸が床につく（胸つき開脚）', 1),
  ('★★★ 仰向けで片足を真上に上げて90度以上', 2),
  ('★★★ ブリッジで腕がまっすぐ立つ（肩が手の真上）', 3),
  ('★★ ブリッジで5秒キープできる', 4),
  ('★★ しゃがんで踵を浮かさず後ろに転ばずキープ', 5),
  ('★★ 立位体前屈で手のひらが床にべったりつく', 6),
  ('★★ 肩入れストレッチで胸が床につきそうになる', 7),
  ('★★ 正座で後ろに倒れて背中が床につく（割座）', 8),
  ('★★ ブリッジで片足キープが5秒できる', 9)
) AS ci(label, idx)
WHERE s.skill_key = 'flexibility'
AND NOT EXISTS (
  SELECT 1 FROM check_items WHERE skill_id = s.id AND label = ci.label
);

-- ============================================================
-- 3. 新規スキル「倒立（チュートリアル）」(tutorial)
-- ============================================================
INSERT INTO skills (skill_key, name, level, hint, description, difficulty_level, order_index, is_tutorial, skill_category, category_id)
SELECT
  'tutorial_handstand',
  '倒立（チュートリアル）',
  'b',
  '逆さまの世界に慣れよう',
  'すべての回転技・倒立系技の土台。壁倒立から始めて、補助なし倒立の習得を目指す。倒立の質がすべての技のクオリティを決める。',
  0,
  1,
  true,
  'tutorial',
  (SELECT id FROM categories WHERE key = 'base' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE skill_key = 'tutorial_handstand');

-- 「倒立（チュートリアル）」チェック項目
INSERT INTO check_items (skill_id, label, order_index)
SELECT s.id, ci.label, ci.idx
FROM skills s,
(VALUES
  ('★★ カエル立ち（クロウポーズ）で3秒キープ', 0),
  ('★★★ 壁倒立で30秒キープ', 1),
  ('★★ 壁倒立で1分キープ', 2),
  ('★★★ 壁倒立で右手・左手を片方ずつ浮かせられる', 3),
  ('★★ 三点倒立で5秒キープ', 4),
  ('★★★ 補助あり倒立（先生が足を持つ）で5秒キープ', 5),
  ('★★★ 補助なし倒立で2秒キープ', 6),
  ('★★ 補助なし倒立で5秒キープ', 7),
  ('★★ 倒立から前転にきれいに降りられる', 8),
  ('★ 倒立で2〜3歩あるける（倒立歩行）', 9)
) AS ci(label, idx)
WHERE s.skill_key = 'tutorial_handstand'
AND NOT EXISTS (
  SELECT 1 FROM check_items WHERE skill_id = s.id AND label = ci.label
);

-- ============================================================
-- 4. 既存スキルの skill_category を設定
-- ============================================================

-- 前方系 (forward)
UPDATE skills SET skill_category = 'forward' WHERE skill_key IN (
  'maeten', 'kaikyaku_maeten', 'tobikomi_maeten', 'touritsu_maeten',
  'touritsu_bridge', 'handspring', 'maesou', 'tensou', 'maesou_hineri'
) AND (skill_category IS NULL OR skill_category != 'forward');

-- 側方系 (side)
UPDATE skills SET skill_category = 'side' WHERE skill_key IN (
  'sokuten', 'katate_sokuten', 'roundoff', 'sokusou_aerial',
  'roundoff_bakuten', 'roundoff_bakusou'
) AND (skill_category IS NULL OR skill_category != 'side');

-- 後方系 (backward)
UPDATE skills SET skill_category = 'backward' WHERE skill_key IN (
  'bridge', 'kouten', 'kaikyaku_kouten', 'wall_handstand',
  'haitouritsu', 'handstand', 'kouten_touritsu', 'kouhoutenkai',
  'bakuten', 'bakusou', 'renzoku_bakuten',
  'shinmi_tenkai', 'bakusou_hineri'
) AND (skill_category IS NULL OR skill_category != 'backward');

-- 特殊技 (special)
UPDATE skills SET skill_category = 'special' WHERE skill_key IN (
  'macaco', 'gainer', 'side_flip', 'helicopter', 'cork'
) AND (skill_category IS NULL OR skill_category != 'special');

-- チュートリアル
UPDATE skills SET skill_category = 'tutorial', is_tutorial = true WHERE skill_key IN (
  'flexibility', 'tutorial_handstand'
) AND (skill_category IS NULL OR skill_category != 'tutorial');

COMMIT;
