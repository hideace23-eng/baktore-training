-- ============================================================
-- Seed: checklist-data.ts の内容をDBに投入
-- ============================================================

-- カテゴリ
INSERT INTO categories (key, name, color, order_index) VALUES
  ('base', '倒立 / Hand Stand', 'base', 0),
  ('back', '後方系 / Back', 'back', 1),
  ('front', '前方系 / Front', 'front', 2),
  ('side', '側方系 / Side', 'side', 3),
  ('special', '特殊技 / Special', 'special', 4)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 技の投入 (DO ブロックで category_id を参照)
-- ============================================================
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

  -- ========== BASE: 倒立 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_base, 'handstand', '倒立', 'b', 'すべての技の土台となる基礎スキル', 'バクトレ全技術の土台。壁倒立から始め、フリー倒立の習得を目指す。倒立の質が全ての技のクオリティを決める。', 0)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'handstand'; END IF;

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

  -- ========== BACK: ブリッジ ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_back, 'bridge', 'ブリッジ', 'b', '後方系の柔軟性基礎', '後方系技術の柔軟性基盤。肩・腰の柔軟性を確認し、後方系技術への土台を作る。', 0)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'bridge'; END IF;

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

  -- ========== BACK: 後転 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_back, 'kouten', '後転', 'b', '後方回転の基礎技', '後方系の基本。勢いと体の使い方を習得し、上位技への道を開く。', 1)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'kouten'; END IF;

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

  -- ========== BACK: バク転 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_back, 'bakuten', 'バク転', 'a', '後方系の代表技・ジャンプ×倒立の組み合わせ', '「ジャンプ」と「倒立姿勢」を後方向に組み合わせた後方系の代表技。倒立の質とジャンプ力の両方が必要。恐怖心の克服も重要。', 2)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'bakuten'; END IF;

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

  -- ========== BACK: バク宙 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_back, 'bakusou', 'バク宙', 'a', '後方宙返り', '空中で後方に1回転する宙返り技。高い跳躍力と回転のタイミングが必要。', 3)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'bakusou'; END IF;

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

  -- ========== BACK: ロンダートバク転 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_back, 'roundoff_bakuten', 'ロンダートバク転', 'a', 'ロンダートと連続バク転の組み合わせ', '助走の勢いをロンダートで後方に変換しそのままバク転に繋げる連続技。試合・発表でよく使われる花形コンビネーション。', 4)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'roundoff_bakuten'; END IF;

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

  -- ========== FRONT: 前転 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_front, 'maeten', '前転', 'b', '前方系の入門技', '前方回転の基礎。丸くなる感覚と首の保護を最初に習得する。', 0)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'maeten'; END IF;

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, 'あごを引いて丸くなれる', '前転 基礎', 0) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '首が床につかず後頭部で回れる', 0), (ci, '背中が丸くなっている', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '勢いよく回れる（止まらない）', '前転 流れ', 1) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '踏み込みに勢いがある', 0), (ci, '回転途中で止まらない', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '起き上がりがスムーズ', '前転 起き上がり', 2) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '立ち上がり動作が流れている', 0);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続前転ができる', '連続前転', 3) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '3回連続でできる', 0);

  -- ========== FRONT: 前宙 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_front, 'maesou', '前宙', 'a', '前方宙返り', '助走から前方に宙返りする技。踏み切りのタイミングと前傾の勢いが重要。', 1)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'maesou'; END IF;

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

  -- ========== SIDE: 側転 ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_side, 'sokuten', '側転', 'b', '側方系の基礎技', '側方向への回転技。手→手→足→足の順番と体の一直線ラインが重要。', 0)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'sokuten'; END IF;

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '手→手→足→足の順番を守れる', '側転 基礎', 0) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '両手を順番につけられる', 0), (ci, '足の着地が順番になっている', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '空中で体が一直線になっている', '側転 空中姿勢', 1) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '腰が落ちていない', 0), (ci, '倒立方向に体が向いている', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '真横の一直線ライン上を回れる', '側転 ライン練習', 2) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'スタートとゴールが一直線上にある', 0);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '足が高く上がっている', '側転 足の高さ確認', 3) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '倒立通過点で足が真上になっている', 0), (ci, '膝が曲がっていない', 1);

  -- ========== SIDE: ロンダート ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_side, 'roundoff', 'ロンダート', 'm', '後方系への接続技として必須', '助走の勢いを後ろ向きに変換する技。バク転・バク宙への接続で使用する最重要の補助技。', 1)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'roundoff'; END IF;

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '助走からの踏み込みが正確', 'ロンダート 踏み込み', 0) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '利き足を前にして入れる', 0), (ci, '斜め前に踏み込んでいる', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '空中で足が揃うタイミングが合っている', 'ロンダート 足揃え', 1) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '倒立通過時に両足が合っている', 0);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地が後ろ向き（後方系に繋げられる方向）', 'ロンダート 着地方向', 2) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '着地後に後方に体重が乗っている', 0), (ci, '前に崩れていない', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '連続してバク転に繋げられる', 'ロンダートバク転 連結', 3) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'ロンダートの着地からすぐバク転に入れる', 0), (ci, 'テンポが一定になっている', 1);

  -- ========== SPECIAL: ヘリコプテイロ ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_special, 'helicopter', 'ヘリコプテイロ', 'a', '縦軸回転系の特殊技', '縦軸で回転しながら跳ぶ特殊技。高い空中感覚と回転コントロールが必要。', 0)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'helicopter'; END IF;

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '縦軸回転の感覚がある', 'ヘリコプテイロ 基礎', 0) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'スピン動作が素早い', 0), (ci, '軸がブレない', 1);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '高さがある状態で回転できる', '跳躍×回転 練習', 1) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '跳躍と回転が同時にできている', 0);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '着地が安定している', '着地コントロール', 2) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '回転を止めて着地できる', 0);

  -- ========== SPECIAL: ゲイナー ==========
  INSERT INTO skills (category_id, skill_key, name, level, hint, description, order_index)
  VALUES (cat_special, 'gainer', 'ゲイナー', 'a', '前方踏み切りの後方宙返り', '前方向に踏み切りながら後方に宙返りする高難度技。', 1)
  ON CONFLICT (skill_key) DO NOTHING
  RETURNING id INTO sk;
  IF sk IS NULL THEN SELECT id INTO sk FROM skills WHERE skill_key = 'gainer'; END IF;

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '前方踏み切りの感覚がある', 'ゲイナー 踏み切り', 0) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '前に踏み込みながら後ろに跳べる', 0);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '後方宙返りが単体でできる', 'バク宙 確認', 1) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, 'バク宙が安定してできている', 0);

  INSERT INTO check_items (skill_id, label, video_url, order_index) VALUES (sk, '補助ありで全体通しができる', '補助ゲイナー', 2) RETURNING id INTO ci;
  INSERT INTO check_sub_items (check_item_id, label, order_index) VALUES (ci, '踏み切り→後方回転→着地が繋がっている', 0);

END $$;
