-- ============================================================
-- バクトレ研修 V2 マイグレーション
-- 33技データ + 難易度レベル制 + check_items全刷新
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
ALTER TABLE skills ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS default_expanded BOOLEAN DEFAULT false;

-- CHECK制約を安全に追加
DO $$ BEGIN
  ALTER TABLE skills ADD CONSTRAINT skills_difficulty_level_range
    CHECK (difficulty_level >= 1 AND difficulty_level <= 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. カテゴリ整備: combo 追加、special の order_index をシフト
-- ============================================================
-- 既存 'base' カテゴリを流用（basis は作らない）
-- combo カテゴリを新規追加
INSERT INTO categories (key, name, color, order_index)
VALUES ('combo', '連続技', 'combo', 5)
ON CONFLICT (key) DO NOTHING;

UPDATE categories SET order_index = 6 WHERE key = 'special' AND order_index < 6;

-- ============================================================
-- 3. 既存データのクリア
-- ============================================================
TRUNCATE TABLE checklist_progress CASCADE;
TRUNCATE TABLE xp_logs CASCADE;

UPDATE character_states SET xp = 0, level = 1;

TRUNCATE TABLE check_sub_items CASCADE;
TRUNCATE TABLE check_items CASCADE;
TRUNCATE TABLE skills CASCADE;

-- ============================================================
-- 4. 33技を新規INSERT
-- ============================================================
INSERT INTO skills (skill_key, name, category_id, order_index, difficulty_level, level, default_expanded, hint, description) VALUES
  -- basis (2技)
  ('wall_handstand', '壁倒立',
    (SELECT id FROM categories WHERE key = 'base'), 1, 2, 'b', false,
    '倒立の基礎練習', '壁を使って倒立の感覚を掴む基礎練習。逆さまの世界に慣れよう。'),
  ('handstand', '倒立',
    (SELECT id FROM categories WHERE key = 'base'), 2, 3, 'b', true,
    'すべての技の土台となる基礎スキル', 'バクトレ全技術の土台。壁倒立から始め、フリー倒立の習得を目指す。'),

  -- front (9技)
  ('maeten', '前転',
    (SELECT id FROM categories WHERE key = 'front'), 1, 1, 'b', false,
    '前方系の入門技', '前方回転の基礎。丸くなる感覚と首の保護を最初に習得する。'),
  ('kaikyaku_maeten', '開脚前転・伸膝前転',
    (SELECT id FROM categories WHERE key = 'front'), 2, 2, 'b', false,
    '前転の発展技', '開脚や膝を伸ばした状態での前転。柔軟性と体のコントロールが求められる。'),
  ('tobikomi_maeten', '飛び込み前転',
    (SELECT id FROM categories WHERE key = 'front'), 3, 3, 'b', false,
    '空中からの前転', '跳んでから前転する技。前宙への第一歩。'),
  ('touritsu_maeten', '倒立前転',
    (SELECT id FROM categories WHERE key = 'front'), 4, 3, 'b', false,
    '倒立と前転の組み合わせ', '倒立を経由してから前転する技。倒立力と前転を連結させる。'),
  ('touritsu_bridge', '倒立ブリッジ',
    (SELECT id FROM categories WHERE key = 'front'), 5, 4, 'm', false,
    '倒立からブリッジへ', '倒立からブリッジ姿勢に降りる技。柔軟性と倒立力の両方が必要。'),
  ('handspring', '前方転回(ハンドスプリング)',
    (SELECT id FROM categories WHERE key = 'front'), 6, 5, 'm', true,
    '前方系の代表的な中級技', '助走から手をついて前方に回転する技。前方系の基本技。'),
  ('maesou', '前宙',
    (SELECT id FROM categories WHERE key = 'front'), 7, 7, 'a', true,
    '前方宙返り', '助走から前方に宙返りする技。踏み切りのタイミングと前傾の勢いが重要。'),
  ('tensou', '転宙',
    (SELECT id FROM categories WHERE key = 'front'), 8, 7, 'a', false,
    '手をつかない前方宙返り', '前方倒立回転を手をつかずに行う技。前宙とは異なるアプローチの宙返り。'),
  ('maesou_hineri', '前宙ひねり',
    (SELECT id FROM categories WHERE key = 'front'), 9, 10, 'a', false,
    '前宙にひねりを加えた最高難度技', '前宙にひねりを加えた高難度技。空中感覚と回転・ひねりの同時制御が必要。'),

  -- back (11技)
  ('bridge', 'ブリッジ',
    (SELECT id FROM categories WHERE key = 'back'), 1, 1, 'b', false,
    '後方系の柔軟性基礎', '後方系技術の柔軟性基盤。肩・腰の柔軟性を確認し、後方系技術への土台を作る。'),
  ('kouten', '後転',
    (SELECT id FROM categories WHERE key = 'back'), 2, 1, 'b', false,
    '後方回転の基礎技', '後方系の基本。勢いと体の使い方を習得し、上位技への道を開く。'),
  ('kaikyaku_kouten', '開脚後転・伸膝後転',
    (SELECT id FROM categories WHERE key = 'back'), 3, 2, 'b', false,
    '後転の発展技', '開脚や膝を伸ばした状態での後転。後転の質を高める。'),
  ('haitouritsu', '背倒立',
    (SELECT id FROM categories WHERE key = 'back'), 4, 3, 'b', false,
    '背中で逆さま姿勢をキープ', '背中を床につけて足を天井に伸ばす姿勢。体幹力の基礎。'),
  ('kouten_touritsu', '後転倒立',
    (SELECT id FROM categories WHERE key = 'back'), 5, 4, 'm', false,
    '後転から倒立へ', '後転の勢いを利用して倒立姿勢に入る技。後転力と倒立力の連結。'),
  ('kouhoutenkai', '後方転回',
    (SELECT id FROM categories WHERE key = 'back'), 6, 5, 'm', false,
    '後方系の基本回転技', '後方にブリッジ経由で回転する技。バク転への重要なステップ。'),
  ('bakuten', 'バク転',
    (SELECT id FROM categories WHERE key = 'back'), 7, 7, 'a', true,
    '後方系の代表技', 'ジャンプと倒立姿勢を後方向に組み合わせた後方系の代表技。'),
  ('bakusou', 'バク宙',
    (SELECT id FROM categories WHERE key = 'back'), 8, 7, 'a', true,
    '後方宙返り', '空中で後方に1回転する宙返り技。高い跳躍力と回転のタイミングが必要。'),
  ('renzoku_bakuten', '連続バク転',
    (SELECT id FROM categories WHERE key = 'back'), 9, 8, 'a', false,
    'バク転を連続で実行', 'バク転を2回以上連続で行う技。リズムと体力が求められる。'),
  ('shinmi_tenkai', '伸身宙返り',
    (SELECT id FROM categories WHERE key = 'back'), 10, 9, 'a', false,
    '体を伸ばしたまま宙返り', '抱え込まずに伸身姿勢でバク宙を行う高難度技。'),
  ('bakusou_hineri', 'バク宙ひねり',
    (SELECT id FROM categories WHERE key = 'back'), 11, 10, 'a', false,
    'バク宙にひねりを加えた最高難度技', 'バク宙にひねりを加えた高難度技。3D的な空中感覚が必要。'),

  -- side (4技)
  ('sokuten', '側転',
    (SELECT id FROM categories WHERE key = 'side'), 1, 3, 'b', true,
    '側方系の基礎技', '側方向への回転技。手→手→足→足の順番と体の一直線ラインが重要。'),
  ('katate_sokuten', '片手側転',
    (SELECT id FROM categories WHERE key = 'side'), 2, 4, 'm', false,
    '片手で行う側転', '片手だけで側転する技。バランス力と腕力の強化版。'),
  ('sokusou_aerial', '側宙(エアリアル)',
    (SELECT id FROM categories WHERE key = 'side'), 3, 7, 'a', false,
    '手をつかない側転', '手をつかずに空中で側方回転する高難度技。'),
  ('roundoff', 'ロンダート',
    (SELECT id FROM categories WHERE key = 'side'), 4, 6, 'm', true,
    '後方系への接続技として必須', '助走の勢いを後ろ向きに変換する技。バク転・バク宙への接続で使用する。'),

  -- combo (2技)
  ('roundoff_bakuten', 'ロンダートバク転',
    (SELECT id FROM categories WHERE key = 'combo'), 1, 8, 'a', true,
    'ロンダートとバク転の連続技', 'ロンダートからバク転に繋げる花形コンビネーション。'),
  ('roundoff_bakusou', 'ロンダートバク宙',
    (SELECT id FROM categories WHERE key = 'combo'), 2, 8, 'a', false,
    'ロンダートとバク宙の連続技', 'ロンダートからバク宙に繋げる高難度コンビネーション。'),

  -- special (5技)
  ('macaco', 'マカコ',
    (SELECT id FROM categories WHERE key = 'special'), 1, 5, 'm', true,
    'しゃがみから片手で回る特殊技', 'しゃがんだ状態から片手をついて後方に回る独特の技。'),
  ('gainer', 'ゲイナー',
    (SELECT id FROM categories WHERE key = 'special'), 2, 5, 'm', false,
    '前方踏み切りの後方宙返り', '前方向に踏み切りながら後方に宙返りする技。'),
  ('side_flip', 'サイドフリップ',
    (SELECT id FROM categories WHERE key = 'special'), 3, 6, 'm', false,
    '横方向の宙返り', '横方向に体を投げ出して宙返りする特殊技。'),
  ('helicopter', 'ヘリコプテイロ',
    (SELECT id FROM categories WHERE key = 'special'), 4, 7, 'a', false,
    '縦軸回転系の特殊技', '縦軸で回転しながら跳ぶ特殊技。高い空中感覚と回転コントロールが必要。'),
  ('cork', 'コーク',
    (SELECT id FROM categories WHERE key = 'special'), 5, 7, 'a', false,
    'コークスクリュー回転', '斜め軸で回転するコークスクリュー技。3D感覚が求められる。')
;

-- ============================================================
-- 5. check_items 全INSERT（33技分）
-- ============================================================

-- 壁倒立 (5項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'wall_handstand'), '壁にお腹向きで足上げ', 0),
  ((SELECT id FROM skills WHERE skill_key = 'wall_handstand'), '壁にお腹向きで手を壁に近づけて10秒', 1),
  ((SELECT id FROM skills WHERE skill_key = 'wall_handstand'), '壁に背中向き(キックアップ)で姿勢作る', 2),
  ((SELECT id FROM skills WHERE skill_key = 'wall_handstand'), '壁に背中向きで10秒キープ', 3),
  ((SELECT id FROM skills WHERE skill_key = 'wall_handstand'), '壁に背中向きで30秒キープ', 4);

-- 倒立 (5項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'handstand'), '壁から足を離して1秒バランス', 0),
  ((SELECT id FROM skills WHERE skill_key = 'handstand'), 'フリー倒立で2秒キープ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'handstand'), 'フリー倒立で5秒キープ', 2),
  ((SELECT id FROM skills WHERE skill_key = 'handstand'), 'フリー倒立で10秒キープ', 3),
  ((SELECT id FROM skills WHERE skill_key = 'handstand'), '倒立から前転で降りられる', 4);

-- 前転 (3項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'maeten'), '前転(でんぐり返し)ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'maeten'), 'ひざ・つま先を伸ばして前転', 1),
  ((SELECT id FROM skills WHERE skill_key = 'maeten'), '連続前転2回', 2);

-- 開脚前転・伸膝前転 (3項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'kaikyaku_maeten'), '開脚前転ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'kaikyaku_maeten'), '伸膝前転(ひざ曲げない)ができる', 1),
  ((SELECT id FROM skills WHERE skill_key = 'kaikyaku_maeten'), 'きれいに立ち上がれる', 2);

-- 飛び込み前転 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'tobikomi_maeten'), '軽く跳んでから前転', 0),
  ((SELECT id FROM skills WHERE skill_key = 'tobikomi_maeten'), '遠くに跳んで前転', 1),
  ((SELECT id FROM skills WHERE skill_key = 'tobikomi_maeten'), 'より高く・遠くへ飛び込み前転', 2),
  ((SELECT id FROM skills WHERE skill_key = 'tobikomi_maeten'), '連続飛び込み前転', 3);

-- 倒立前転 (3項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_maeten'), '倒立を経由して前転', 0),
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_maeten'), '倒立で1秒止まってから前転', 1),
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_maeten'), 'スムーズに倒立前転', 2);

-- 倒立ブリッジ (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_bridge'), '倒立からブリッジへ降りる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_bridge'), '倒立から安定してブリッジ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_bridge'), '倒立ブリッジから立ち上がる', 2),
  ((SELECT id FROM skills WHERE skill_key = 'touritsu_bridge'), 'スムーズな一連の動作', 3);

-- 前方転回(ハンドスプリング) (5項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'handspring'), '補助ありで前方転回', 0),
  ((SELECT id FROM skills WHERE skill_key = 'handspring'), '補助なしで前方転回(マット上)', 1),
  ((SELECT id FROM skills WHERE skill_key = 'handspring'), '補助なしで前方転回(床)', 2),
  ((SELECT id FROM skills WHERE skill_key = 'handspring'), '助走からの前方転回', 3),
  ((SELECT id FROM skills WHERE skill_key = 'handspring'), '立ち上がりまできれいに', 4);

-- 前宙 (6項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'maesou'), 'トランポリンで前宙', 0),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'), '補助ありで前宙', 1),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'), '補助なしで前宙', 2),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'), '助走からの前宙', 3),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'), '着地まできれいに', 4),
  ((SELECT id FROM skills WHERE skill_key = 'maesou'), '前宙から次の動きへつなげる', 5);

-- 転宙 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'tensou'), '前方倒立回転を手なしで(補助あり)', 0),
  ((SELECT id FROM skills WHERE skill_key = 'tensou'), '補助なしで転宙', 1),
  ((SELECT id FROM skills WHERE skill_key = 'tensou'), '助走からの転宙', 2),
  ((SELECT id FROM skills WHERE skill_key = 'tensou'), 'きれいな伸身姿勢で転宙', 3);

-- 前宙ひねり (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'maesou_hineri'), '半ひねり(180°)', 0),
  ((SELECT id FROM skills WHERE skill_key = 'maesou_hineri'), '一回ひねり(360°)', 1),
  ((SELECT id FROM skills WHERE skill_key = 'maesou_hineri'), '着地までコントロール', 2),
  ((SELECT id FROM skills WHERE skill_key = 'maesou_hineri'), '連続での前宙ひねり', 3);

-- ブリッジ (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bridge'), '仰向けからブリッジの姿勢になれる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'bridge'), 'ブリッジ5秒キープ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'bridge'), 'ブリッジ10秒キープ', 2),
  ((SELECT id FROM skills WHERE skill_key = 'bridge'), 'ブリッジから立ち上がれる', 3);

-- 後転 (3項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'kouten'), '後転(でんぐり返し後ろ)ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'kouten'), 'ひざ・つま先を伸ばして後転', 1),
  ((SELECT id FROM skills WHERE skill_key = 'kouten'), '連続後転2回', 2);

-- 開脚後転・伸膝後転 (3項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'kaikyaku_kouten'), '開脚後転ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'kaikyaku_kouten'), '伸膝後転(ひざ曲げない)ができる', 1),
  ((SELECT id FROM skills WHERE skill_key = 'kaikyaku_kouten'), 'きれいに立ち上がれる', 2);

-- 背倒立 (3項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'haitouritsu'), '背倒立の姿勢になれる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'haitouritsu'), '背倒立5秒キープ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'haitouritsu'), '足先を天井にまっすぐ伸ばせる', 2);

-- 後転倒立 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'kouten_touritsu'), '後転から倒立の形を経由できる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'kouten_touritsu'), '倒立で一瞬止まれる', 1),
  ((SELECT id FROM skills WHERE skill_key = 'kouten_touritsu'), 'スムーズに立ち上がれる', 2),
  ((SELECT id FROM skills WHERE skill_key = 'kouten_touritsu'), '美しい後転倒立', 3);

-- 後方転回 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'kouhoutenkai'), '補助ありで後方転回', 0),
  ((SELECT id FROM skills WHERE skill_key = 'kouhoutenkai'), 'ブリッジキックアップから後方転回', 1),
  ((SELECT id FROM skills WHERE skill_key = 'kouhoutenkai'), '助走なしで後方転回', 2),
  ((SELECT id FROM skills WHERE skill_key = 'kouhoutenkai'), '立った状態から後方転回', 3);

-- バク転 (6項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'), '補助ありでバク転', 0),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'), '補助なしでバク転(マット上)', 1),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'), '補助なしでバク転(床)', 2),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'), '立ってバク転(助走なし)', 3),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'), '助走からのバク転', 4),
  ((SELECT id FROM skills WHERE skill_key = 'bakuten'), 'バク転から次の動きへつなげる', 5);

-- バク宙 (6項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'), 'トランポリンでバク宙', 0),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'), '補助ありでバク宙', 1),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'), '補助なしでバク宙', 2),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'), '立ってバク宙(助走なし)', 3),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'), 'バク宙から両足立ち着地', 4),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou'), '高さとキレのあるバク宙', 5);

-- 連続バク転 (5項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'renzoku_bakuten'), 'バク転2連続', 0),
  ((SELECT id FROM skills WHERE skill_key = 'renzoku_bakuten'), 'バク転3連続', 1),
  ((SELECT id FROM skills WHERE skill_key = 'renzoku_bakuten'), 'バク転5連続', 2),
  ((SELECT id FROM skills WHERE skill_key = 'renzoku_bakuten'), '一直線に連続バク転', 3),
  ((SELECT id FROM skills WHERE skill_key = 'renzoku_bakuten'), 'スピードのある連続バク転', 4);

-- 伸身宙返り (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'shinmi_tenkai'), '抱え込まず伸身姿勢でバク宙', 0),
  ((SELECT id FROM skills WHERE skill_key = 'shinmi_tenkai'), '助走ありで伸身宙返り', 1),
  ((SELECT id FROM skills WHERE skill_key = 'shinmi_tenkai'), 'きれいな伸身姿勢キープ', 2),
  ((SELECT id FROM skills WHERE skill_key = 'shinmi_tenkai'), '高さのある伸身宙返り', 3);

-- バク宙ひねり (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'bakusou_hineri'), '半ひねり(180°)', 0),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou_hineri'), '一回ひねり(360°)', 1),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou_hineri'), 'きれいに着地', 2),
  ((SELECT id FROM skills WHERE skill_key = 'bakusou_hineri'), '連続バク宙ひねり', 3);

-- 側転 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'sokuten'), '側転の形ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'sokuten'), 'まっすぐラインに沿って側転', 1),
  ((SELECT id FROM skills WHERE skill_key = 'sokuten'), 'ひざ・つま先を伸ばして側転', 2),
  ((SELECT id FROM skills WHERE skill_key = 'sokuten'), '美しい側転', 3);

-- 片手側転 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'katate_sokuten'), '片手側転の形ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'katate_sokuten'), '勢いをつけて片手側転', 1),
  ((SELECT id FROM skills WHERE skill_key = 'katate_sokuten'), 'スムーズな片手側転', 2),
  ((SELECT id FROM skills WHERE skill_key = 'katate_sokuten'), '左右両方の片手側転', 3);

-- 側宙(エアリアル) (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'sokusou_aerial'), '補助ありで側宙', 0),
  ((SELECT id FROM skills WHERE skill_key = 'sokusou_aerial'), '補助なしで側宙', 1),
  ((SELECT id FROM skills WHERE skill_key = 'sokusou_aerial'), '助走からの側宙', 2),
  ((SELECT id FROM skills WHERE skill_key = 'sokusou_aerial'), 'きれいな側宙', 3);

-- ロンダート (5項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'), 'ロンダートの形ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'), '足を揃えて着地', 1),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'), '勢いよくロンダート', 2),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'), 'ロンダートからバク転への助走として使える', 3),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff'), '美しいロンダート', 4);

-- ロンダートバク転 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakuten'), 'ロンダートからバク転をつなげる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakuten'), 'スムーズに連続でつなげる', 1),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakuten'), '勢いが途切れないロンダートバク転', 2),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakuten'), '美しい一連の動作', 3);

-- ロンダートバク宙 (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakusou'), 'ロンダートからバク宙をつなげる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakusou'), 'スムーズに連続でつなげる', 1),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakusou'), '高さのあるロンダートバク宙', 2),
  ((SELECT id FROM skills WHERE skill_key = 'roundoff_bakusou'), '美しい一連の動作', 3);

-- マカコ (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'macaco'), 'しゃがんだ状態から片手をついて回る', 0),
  ((SELECT id FROM skills WHERE skill_key = 'macaco'), 'スムーズなマカコ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'macaco'), '立った状態からマカコ', 2),
  ((SELECT id FROM skills WHERE skill_key = 'macaco'), '美しいマカコ', 3);

-- ゲイナー (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'gainer'), '補助ありでゲイナー', 0),
  ((SELECT id FROM skills WHERE skill_key = 'gainer'), '補助なしでゲイナー', 1),
  ((SELECT id FROM skills WHERE skill_key = 'gainer'), '助走からのゲイナー', 2),
  ((SELECT id FROM skills WHERE skill_key = 'gainer'), 'きれいな着地', 3);

-- サイドフリップ (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'side_flip'), '補助ありでサイドフリップ', 0),
  ((SELECT id FROM skills WHERE skill_key = 'side_flip'), '補助なしでサイドフリップ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'side_flip'), '助走からのサイドフリップ', 2),
  ((SELECT id FROM skills WHERE skill_key = 'side_flip'), 'きれいな着地', 3);

-- ヘリコプテイロ (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'helicopter'), 'ヘリコプテイロの形ができる', 0),
  ((SELECT id FROM skills WHERE skill_key = 'helicopter'), '回転力のあるヘリコプテイロ', 1),
  ((SELECT id FROM skills WHERE skill_key = 'helicopter'), '高さのあるヘリコプテイロ', 2),
  ((SELECT id FROM skills WHERE skill_key = 'helicopter'), '美しいヘリコプテイロ', 3);

-- コーク (4項目)
INSERT INTO check_items (skill_id, label, order_index) VALUES
  ((SELECT id FROM skills WHERE skill_key = 'cork'), '補助ありでコーク(コークスクリュー)', 0),
  ((SELECT id FROM skills WHERE skill_key = 'cork'), '補助なしでコーク', 1),
  ((SELECT id FROM skills WHERE skill_key = 'cork'), '助走からのコーク', 2),
  ((SELECT id FROM skills WHERE skill_key = 'cork'), 'きれいな着地', 3);

COMMIT;
