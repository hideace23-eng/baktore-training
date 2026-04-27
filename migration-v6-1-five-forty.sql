-- ============================================================
-- バクトレ研修 V6.1: 540（ファイブフォーティー）追加
-- ============================================================
-- 実行手順:
-- 1. まず migration-v5-tutorial-skills.sql を適用済みであること
-- 2. Supabase Dashboard → SQL Editor を開く
-- 3. このファイルの内容を全て貼り付けて Run
-- 4. 冪等設計なので、何度実行しても安全です
-- ============================================================

BEGIN;

-- ============================================================
-- 1. スキル「540」を追加
-- ============================================================
-- category_id は既存の 'special' カテゴリから取得
-- order_index = 6 (既存 special は 1〜5)
INSERT INTO skills (
  skill_key, name, level, hint, description,
  difficulty_level, order_index, is_tutorial, skill_category, category_id
)
SELECT
  'five_forty',
  '540',
  'm',
  'ジャンプして空中で1.5回転（540度）するキック技。トリッキング系の代表的な技。',
  '助走から踏み切り、空中で1.5回転（540度）して着地する高難度のキック技。チアダンスやトリッキングのパフォーマンスでよく見られる。回転力と踏み切りのタイミングが鍵。',
  6,
  6,
  false,
  'special',
  (SELECT id FROM categories WHERE key = 'special' LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE skill_key = 'five_forty');

-- ============================================================
-- 2. チェック項目（540）
-- ============================================================
INSERT INTO check_items (skill_id, label, order_index)
SELECT s.id, ci.label, ci.idx
FROM skills s,
(VALUES
  ('助走からのセットアップ（構え）が安定している', 0),
  ('踏み切り足でしっかり床を蹴れている', 1),
  ('上半身のリード（腕の振り）が回転を生んでいる', 2),
  ('空中で膝を引き上げて回転を加速できる', 3),
  ('270度（半回転＋α）の時点で着地足が見えている', 4),
  ('540度回りきって安定して着地できる', 5),
  ('着地後にバランスを崩さずポーズが取れる', 6),
  ('連続して2本以上安定して成功する', 7)
) AS ci(label, idx)
WHERE s.skill_key = 'five_forty'
AND NOT EXISTS (
  SELECT 1 FROM check_items WHERE skill_id = s.id AND label = ci.label
);

COMMIT;
