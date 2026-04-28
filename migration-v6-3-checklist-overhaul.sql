-- ============================================================
-- バクトレ研修 V6.3: 5技のチェック項目を仕様ベースで完全置き換え
-- ============================================================
-- ⚠️ 破壊的マイグレーション: 対象5技の既存チェック項目と進捗を削除します
-- 実行前に必ずバックアップを取得してください
-- 冪等性: check_items が0件なら INSERT、すでに10件あればスキップ
-- ============================================================

BEGIN;

-- ① バク転 (skill_key = 'bakuten')
DO $$
DECLARE
  skill_uuid UUID;
  item_count INT;
BEGIN
  SELECT id INTO skill_uuid FROM skills WHERE skill_key = 'bakuten';
  IF skill_uuid IS NULL THEN RAISE NOTICE 'bakuten not found, skipping'; RETURN; END IF;

  SELECT COUNT(*) INTO item_count FROM check_items WHERE skill_id = skill_uuid;
  -- 既に新仕様の10項目が入っていればスキップ
  IF item_count = 10 THEN RAISE NOTICE 'bakuten already has 10 items, skipping'; RETURN; END IF;

  -- 既存削除
  DELETE FROM checklist_progress WHERE skill_id = 'bakuten';
  DELETE FROM check_items WHERE skill_id = skill_uuid;

  -- 概要更新
  UPDATE skills SET description = '正式名称「後方倒立回転跳び」。手を床について斜め後ろ45度に跳び、ブリッジ→倒立を経て足から着地する後方系の代表技。' WHERE id = skill_uuid;

  INSERT INTO check_items (skill_id, label, order_index) VALUES
    (skill_uuid, 'ジャンプ力がある（垂直跳びで自分の身長の1/4以上跳べる）', 0),
    (skill_uuid, 'ブリッジが正しい姿勢でできる', 1),
    (skill_uuid, 'ブリッジから起き上がれる', 2),
    (skill_uuid, '倒立30秒キープができる', 3),
    (skill_uuid, '後ろ向きジャンプができる（マットに向かって真上＋斜め後ろへ高く）', 4),
    (skill_uuid, 'アフリ（反動）ができる', 5),
    (skill_uuid, '寝た状態から手を床につく動作ができる', 6),
    (skill_uuid, '腕振り＋足の蹴りのタイミングが合う', 7),
    (skill_uuid, '補助付きでバク転を1本通せる', 8),
    (skill_uuid, '補助なしでバク転を1本通せる', 9);
END $$;

-- ② バク宙 (skill_key = 'bakusou')
DO $$
DECLARE
  skill_uuid UUID;
  item_count INT;
BEGIN
  SELECT id INTO skill_uuid FROM skills WHERE skill_key = 'bakusou';
  IF skill_uuid IS NULL THEN RAISE NOTICE 'bakusou not found, skipping'; RETURN; END IF;

  SELECT COUNT(*) INTO item_count FROM check_items WHERE skill_id = skill_uuid;
  IF item_count = 10 THEN RAISE NOTICE 'bakusou already has 10 items, skipping'; RETURN; END IF;

  DELETE FROM checklist_progress WHERE skill_id = 'bakusou';
  DELETE FROM check_items WHERE skill_id = skill_uuid;

  UPDATE skills SET description = '正式名称「後方宙返り」。手をつかず、空中で1回転して足から着地する。バク転の上位互換だが、ジャンプ力と腹筋の瞬発力が必要なため、人によってはバク宙の方が向いていることもある。' WHERE id = skill_uuid;

  INSERT INTO check_items (skill_id, label, order_index) VALUES
    (skill_uuid, 'バク転ができる', 0),
    (skill_uuid, '垂直跳びが高い（成人男性で50cm以上目安）', 1),
    (skill_uuid, '腹筋の瞬発力がある（V字シットアップが連続でできる）', 2),
    (skill_uuid, '抱え込み倒立（タック姿勢）ができる', 3),
    (skill_uuid, 'ジャンプ→膝抱え込みができる', 4),
    (skill_uuid, '前傾姿勢からつま先重心で跳べる', 5),
    (skill_uuid, '段差を使って後方回転の感覚がある', 6),
    (skill_uuid, '肩甲骨を後ろに倒しつつお尻を上げる連動ができる', 7),
    (skill_uuid, '補助付きでバク宙を1本通せる', 8),
    (skill_uuid, '補助なしでバク宙を1本通せる', 9);
END $$;

-- ③ ハンドスプリング (skill_key = 'handspring')
DO $$
DECLARE
  skill_uuid UUID;
  item_count INT;
BEGIN
  SELECT id INTO skill_uuid FROM skills WHERE skill_key = 'handspring';
  IF skill_uuid IS NULL THEN RAISE NOTICE 'handspring not found, skipping'; RETURN; END IF;

  SELECT COUNT(*) INTO item_count FROM check_items WHERE skill_id = skill_uuid;
  IF item_count = 10 THEN RAISE NOTICE 'handspring already has 10 items, skipping'; RETURN; END IF;

  DELETE FROM checklist_progress WHERE skill_id = 'handspring';
  DELETE FROM check_items WHERE skill_id = skill_uuid;

  UPDATE skills SET description = '正式名称「前方倒立回転跳び」。前方に手をつき、踵から足を振り上げて一回転、両足で着地する前方系技。後方系より恐怖心は少ないが、難易度は実は高い。' WHERE id = skill_uuid;

  INSERT INTO check_items (skill_id, label, order_index) VALUES
    (skill_uuid, '手首・足首の柔軟性がある', 0),
    (skill_uuid, '倒立30秒キープができる', 1),
    (skill_uuid, '壁倒立で片足ずつ振り上げる動作ができる', 2),
    (skill_uuid, 'ブリッジが正しい姿勢でできる', 3),
    (skill_uuid, 'ブリッジから起き上がれる（腰→背中→頭の順）', 4),
    (skill_uuid, '肩で床を押す感覚がある', 5),
    (skill_uuid, '倒立の状態から背中からマットに倒れられる', 6),
    (skill_uuid, '助走→ホップ→踏み切りの一連ができる', 7),
    (skill_uuid, '踵から勢いよく足を振り上げ、両足を素早く閉じられる', 8),
    (skill_uuid, '目線「床→天井→正面」の順で移動しながら、膝を曲げず両足着地できる', 9);
END $$;

-- ④ 側転 (skill_key = 'sokuten')
DO $$
DECLARE
  skill_uuid UUID;
  item_count INT;
BEGIN
  SELECT id INTO skill_uuid FROM skills WHERE skill_key = 'sokuten';
  IF skill_uuid IS NULL THEN RAISE NOTICE 'sokuten not found, skipping'; RETURN; END IF;

  SELECT COUNT(*) INTO item_count FROM check_items WHERE skill_id = skill_uuid;
  IF item_count = 10 THEN RAISE NOTICE 'sokuten already has 10 items, skipping'; RETURN; END IF;

  DELETE FROM checklist_progress WHERE skill_id = 'sokuten';
  DELETE FROM check_items WHERE skill_id = skill_uuid;

  UPDATE skills SET description = '正式名称「側方倒立回転」。横向きに逆立ちしながら一回転する基本技。後の回転技（ロンダート・ハンドスプリングなど）の土台。カギは壁倒立。' WHERE id = skill_uuid;

  INSERT INTO check_items (skill_id, label, order_index) VALUES
    (skill_uuid, '利き手・利き足が判別できている', 0),
    (skill_uuid, '壁倒立で振り上げた足から着地できる', 1),
    (skill_uuid, '壁倒立で前足の踏み込みが強くできる', 2),
    (skill_uuid, '壁倒立で開脚ができる', 3),
    (skill_uuid, 'ひざくらいの段差を手をつきながら飛び越えられる', 4),
    (skill_uuid, '一歩目の軸足で床を強く蹴れる', 5),
    (skill_uuid, '両手の間を見ながら回転できる', 6),
    (skill_uuid, 'ひじ・ひざ・こしを曲げず一直線で回転できる', 7),
    (skill_uuid, '腰くらいの障害物を飛び越えながら側転できる', 8),
    (skill_uuid, '障害物なしで、勢いの遠心力を使って実際に側転できる', 9);
END $$;

-- ⑤ 三点倒立 (skill_key = 'haitouritsu')
DO $$
DECLARE
  skill_uuid UUID;
  item_count INT;
BEGIN
  SELECT id INTO skill_uuid FROM skills WHERE skill_key = 'haitouritsu';
  IF skill_uuid IS NULL THEN RAISE NOTICE 'haitouritsu not found, skipping'; RETURN; END IF;

  SELECT COUNT(*) INTO item_count FROM check_items WHERE skill_id = skill_uuid;
  IF item_count = 10 THEN RAISE NOTICE 'haitouritsu already has 10 items, skipping'; RETURN; END IF;

  DELETE FROM checklist_progress WHERE skill_id = 'haitouritsu';
  DELETE FROM check_items WHERE skill_id = skill_uuid;

  UPDATE skills SET name = '三点倒立', description = '頭と両手の3点で逆さまに体を支える基本技。他の全技の土台。これができていると、側転・バク転・ロンダートの習得スピードが3倍以上変わる。' WHERE id = skill_uuid;

  INSERT INTO check_items (skill_id, label, order_index) VALUES
    (skill_uuid, '練習環境が整っている（周囲に障害物なし、食事後2〜3時間空いている）', 0),
    (skill_uuid, '首・肩のストレッチができている', 1),
    (skill_uuid, '腹筋（V字キープ／プランク）の基礎筋力がある', 2),
    (skill_uuid, '頭のてっぺん（額ではない）を床につけられる', 3),
    (skill_uuid, '両手と頭で正三角形が作れる', 4),
    (skill_uuid, '壁三点倒立ができる', 5),
    (skill_uuid, '膝を抱え込んでお尻を高く上げ、30秒キープできる', 6),
    (skill_uuid, '背中をまっすぐ保ったまま体勢をキープできる', 7),
    (skill_uuid, '腹筋に力を入れたまま足を天井に伸ばせる', 8),
    (skill_uuid, '指先まで天井に向けてピンと伸ばし、三点倒立を30秒以上キープできる', 9);
END $$;

COMMIT;

-- 確認用 SELECT
SELECT s.skill_key, s.name, COUNT(ci.id) AS item_count
FROM skills s
LEFT JOIN check_items ci ON ci.skill_id = s.id
WHERE s.skill_key IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu')
GROUP BY s.skill_key, s.name
ORDER BY s.skill_key;
