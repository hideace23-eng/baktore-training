-- ============================================================
-- バクトレ研修 V3: 動画タイトル + 前提技アンロック
-- ============================================================
-- 実行手順:
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. このファイルの内容を全て貼り付けて Run
-- 3. 冪等設計なので、何度実行しても安全です
-- ============================================================

BEGIN;

-- ============================================================
-- 1. check_items に video_title カラム追加
-- ============================================================
ALTER TABLE check_items ADD COLUMN IF NOT EXISTS video_title TEXT;

-- video_url は既存（念のため）
ALTER TABLE check_items ADD COLUMN IF NOT EXISTS video_url TEXT;

-- ============================================================
-- 2. skill_prerequisites テーブル作成
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  required_check_item_id UUID NOT NULL REFERENCES check_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_id, required_check_item_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_prereq_skill ON skill_prerequisites(skill_id);

-- ============================================================
-- 3. RLS ポリシー
-- ============================================================
ALTER TABLE skill_prerequisites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prereq_select_all" ON skill_prerequisites;
CREATE POLICY "prereq_select_all" ON skill_prerequisites
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "prereq_admin_write" ON skill_prerequisites;
CREATE POLICY "prereq_admin_write" ON skill_prerequisites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

-- ============================================================
-- 4. 前提技 seed データ
-- ============================================================

-- ハンドスプリング (Lv5)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'handspring'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'handstand' AND ci.label = 'フリー倒立で10秒キープ')),
  ((SELECT id FROM skills WHERE skill_key = 'handspring'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bridge' AND ci.label = 'ブリッジ10秒キープ'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- 後方転回 (Lv5)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'kouhoutenkai'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bridge' AND ci.label = 'ブリッジから立ち上がれる')),
  ((SELECT id FROM skills WHERE skill_key = 'kouhoutenkai'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'haitouritsu' AND ci.label = '背倒立5秒キープ'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- バク転 (Lv7)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bridge' AND ci.label = 'ブリッジから立ち上がれる')),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'kouten_touritsu' AND ci.label = 'スムーズに立ち上がれる')),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'kouhoutenkai' AND ci.label = '立った状態から後方転回'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- バク宙 (Lv7)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'kouten' AND ci.label = 'ひざ・つま先を伸ばして後転')),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'handstand' AND ci.label = 'フリー倒立で5秒キープ')),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'kouhoutenkai' AND ci.label = '立った状態から後方転回'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- 前宙 (Lv7)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'maesou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'maeten' AND ci.label = '連続前転2回')),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'handstand' AND ci.label = 'フリー倒立で5秒キープ')),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'handspring' AND ci.label = '助走からの前方転回'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- ロンダート (Lv6)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'sokuten' AND ci.label = 'ひざ・つま先を伸ばして側転')),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'katate_sokuten' AND ci.label = '勢いをつけて片手側転'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- ロンダートバク転 (Lv8)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakuten'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'roundoff' AND ci.label = '美しいロンダート')),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakuten'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bakuten' AND ci.label = '立ってバク転(助走なし)'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- ロンダートバク宙 (Lv8)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakusou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'roundoff' AND ci.label = '美しいロンダート')),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakusou'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bakusou' AND ci.label = '立ってバク宙(助走なし)'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- 連続バク転 (Lv8)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'renzoku_bakuten'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bakuten' AND ci.label = '助走からのバク転'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- 伸身宙返り (Lv9)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'shinmi_tenkai'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bakusou' AND ci.label = '高さとキレのあるバク宙'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- バク宙ひねり (Lv10)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bakusou_hineri'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'shinmi_tenkai' AND ci.label = '高さのある伸身宙返り'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- 前宙ひねり (Lv10)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'maesou_hineri'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'maesou' AND ci.label = '前宙から次の動きへつなげる'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- 側宙(エアリアル) (Lv7)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'sokusou_aerial'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'katate_sokuten' AND ci.label = 'スムーズな片手側転')),
  ((SELECT id FROM skills WHERE skill_key = 'sokusou_aerial'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'roundoff' AND ci.label = '美しいロンダート'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- コーク (Lv7)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'cork'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'bakusou' AND ci.label = '立ってバク宙(助走なし)'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

-- ヘリコプテイロ (Lv7)
INSERT INTO skill_prerequisites (skill_id, required_check_item_id) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'helicopter'),
   (SELECT ci.id FROM check_items ci JOIN skills s ON s.id = ci.skill_id
    WHERE s.skill_key = 'macaco' AND ci.label = '美しいマカコ'))
ON CONFLICT (skill_id, required_check_item_id) DO NOTHING;

COMMIT;
