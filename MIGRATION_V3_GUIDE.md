# migration-v3-features.sql 適用ガイド

このドキュメントは `migration-v3-features.sql` を Supabase に適用するための手順書です。

このマイグレーションは以下を行います:
- `check_items` テーブルに `video_title` と `video_url` カラムを追加
- `skill_prerequisites` テーブルを作成（RLS ポリシー付き）
- 14 技・合計 20 以上の前提技関係を seed データとして投入

---

## 1. 事前チェック

マイグレーション適用前に、以下の SQL を Supabase SQL Editor で実行し、現在の DB 状態を確認してください。

### check_items テーブルの存在確認

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'check_items'
ORDER BY ordinal_position;
```

`check_items` テーブルが存在し、`skill_id`, `label` などのカラムがあることを確認します。
テーブルが存在しない場合は、先に `combined-all.sql` または `migration-v2-full.sql` を適用してください。

### skill_prerequisites テーブルが既に存在するか確認

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'skill_prerequisites'
);
```

`true` が返った場合、既に適用済みの可能性があります。再適用しても冪等設計のため安全ですが、状況を把握しておきましょう。

### seed データで参照される skills の存在確認

```sql
SELECT skill_key, name FROM skills
WHERE skill_key IN (
  'handstand', 'bridge', 'handspring', 'kouhoutenkai', 'haitouritsu',
  'bakuten', 'kouten_touritsu', 'kouten', 'bakusou', 'maesou', 'maeten',
  'sokuten', 'katate_sokuten', 'roundoff', 'roundoff_bakuten',
  'roundoff_bakusou', 'renzoku_bakuten', 'shinmi_tenkai',
  'bakusou_hineri', 'maesou_hineri', 'sokusou_aerial', 'cork',
  'helicopter', 'macaco'
)
ORDER BY skill_key;
```

上記すべての `skill_key` が結果に含まれていることを確認してください。欠けている場合、そのスキルに関する seed INSERT が失敗します。

### seed データで参照される check_items の label 確認

```sql
SELECT s.skill_key, ci.label
FROM check_items ci
JOIN skills s ON s.id = ci.skill_id
WHERE (s.skill_key, ci.label) IN (
  ('handstand', 'フリー倒立で10秒キープ'),
  ('handstand', 'フリー倒立で5秒キープ'),
  ('bridge', 'ブリッジ10秒キープ'),
  ('bridge', 'ブリッジから立ち上がれる'),
  ('haitouritsu', '背倒立5秒キープ'),
  ('kouten_touritsu', 'スムーズに立ち上がれる'),
  ('kouhoutenkai', '立った状態から後方転回'),
  ('kouten', 'ひざ・つま先を伸ばして後転'),
  ('maeten', '連続前転2回'),
  ('handspring', '助走からの前方転回'),
  ('sokuten', 'ひざ・つま先を伸ばして側転'),
  ('katate_sokuten', '勢いをつけて片手側転'),
  ('katate_sokuten', 'スムーズな片手側転'),
  ('roundoff', '美しいロンダート'),
  ('bakuten', '立ってバク転(助走なし)'),
  ('bakuten', '助走からのバク転'),
  ('bakusou', '立ってバク宙(助走なし)'),
  ('bakusou', '高さとキレのあるバク宙'),
  ('shinmi_tenkai', '高さのある伸身宙返り'),
  ('maesou', '前宙から次の動きへつなげる'),
  ('macaco', '美しいマカコ')
)
ORDER BY s.skill_key, ci.label;
```

上記すべての組み合わせが結果に含まれていることを確認してください。ラベルは**完全一致**が必要です。

---

## 2. バックアップ手順

マイグレーション適用前に必ずバックアップを取ってください。

### 方法 A: Supabase Dashboard からバックアップ

1. Supabase Dashboard にログイン
2. 対象プロジェクトを開く
3. **Project Settings** → **Database** → **Backups** を開く
4. 最新のバックアップがあることを確認（または手動でバックアップを作成）

### 方法 B: pg_dump コマンド（CLI が使える場合）

```bash
pg_dump -h <SUPABASE_HOST> -U postgres -d postgres -F c -f backup_before_v3.dump
```

接続情報は Supabase Dashboard の **Project Settings** → **Database** → **Connection string** から取得できます。

### 方法 C: Supabase Dashboard からテーブルデータをエクスポート

1. **Table Editor** を開く
2. `check_items` テーブルを選択
3. 右上の **Export** ボタンから CSV でエクスポート
4. `skills` テーブルも同様にエクスポート

---

## 3. 適用手順

### ステップ 1: SQL Editor を開く

Supabase Dashboard → 対象プロジェクト → **SQL Editor** を開きます。

### ステップ 2: SQL を貼り付ける

`migration-v3-features.sql` の内容を**すべて**コピーして、SQL Editor に貼り付けます。

### ステップ 3: 実行する

**Run** ボタンをクリックして実行します。

### 重要な注意点

- マイグレーションは `BEGIN` / `COMMIT` でトランザクションとして実行されます。途中でエラーが発生した場合、すべての変更がロールバックされます。
- 冪等設計です（`IF NOT EXISTS`、`ON CONFLICT DO NOTHING` を使用）。何度実行しても安全です。
- 実行完了後、エラーメッセージがないことを確認してください。

---

## 4. 適用後の検証 SQL

マイグレーション適用後、以下の SQL で正しく適用されたことを確認してください。

### skill_prerequisites の件数確認

```sql
SELECT count(*) FROM skill_prerequisites;
```

**期待値: 20 件以上**（初回適用時は 22 件前後）

### skill_prerequisites のデータ確認

```sql
SELECT
  sp.id,
  s.skill_key AS skill,
  s.name AS skill_name,
  ci.label AS required_check_item,
  sp.created_at
FROM skill_prerequisites sp
JOIN skills s ON s.id = sp.skill_id
JOIN check_items ci ON ci.id = sp.required_check_item_id
ORDER BY s.skill_key
LIMIT 10;
```

### video_title カラムの存在確認

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'check_items'
  AND column_name IN ('video_title', 'video_url');
```

`video_title` と `video_url` の 2 行が返ることを確認してください。

### RLS ポリシーの確認

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'skill_prerequisites';
```

以下の 2 つのポリシーが存在することを確認:
- `prereq_select_all` (SELECT) - 認証済みユーザー全員が読み取り可能
- `prereq_admin_write` (ALL) - admin / super_admin のみ書き込み可能

---

## 5. ロールバック手順

問題が発生した場合、以下の SQL で変更を元に戻せます。

### skill_prerequisites テーブルの削除

```sql
DROP TABLE IF EXISTS skill_prerequisites;
```

### video_title カラムの削除

```sql
ALTER TABLE check_items DROP COLUMN IF EXISTS video_title;
```

### video_url カラムについて

`video_url` カラムは、このマイグレーション以前から存在していた可能性があります。ロールバック時に削除すべきかどうかは、事前チェック（セクション 1）の結果を確認してください。

もし v3 で初めて追加された場合のみ:

```sql
ALTER TABLE check_items DROP COLUMN IF EXISTS video_url;
```

---

## 6. よくあるエラーと対処法

### "relation \"skills\" does not exist"

**原因:** `skills` テーブルがまだ作成されていません。

**対処:** 先に `combined-all.sql` または `migration-v2-full.sql` を適用してください。これらのマイグレーションが `skills` テーブルを作成します。

### "relation \"check_items\" does not exist"

**原因:** `check_items` テーブルがまだ作成されていません。

**対処:** 上記と同様に、`combined-all.sql` または `migration-v2-full.sql` を先に適用してください。

### "Could not find check_item with label..."（サブクエリが NULL を返す）

**原因:** seed データが参照する `check_items` の `label` が DB 上のデータと完全一致していません。

**対処:**
1. 対象の `skill_key` と `label` を確認する
2. 実際の DB データを検索する:
   ```sql
   SELECT ci.label FROM check_items ci
   JOIN skills s ON s.id = ci.skill_id
   WHERE s.skill_key = '対象のskill_key';
   ```
3. ラベルの空白やタイポがないか確認する
4. 必要に応じて、`check_items` のラベルを修正するか、マイグレーション SQL 内のラベルを修正する

### "duplicate key value violates unique constraint"

**原因:** 既に同じデータが挿入済みです。

**対処:** このエラーは安全に無視できます。`ON CONFLICT DO NOTHING` が使われているため、通常このエラーは発生しません。もし発生する場合は、部分的に手動で INSERT を実行した可能性があります。

### category key の "basis" / "base" 混乱について

過去のスキーマでは、カテゴリの key が `basis` として定義されていた時期があり、途中で `base` に変更されました。もし skill_key の参照でエラーが出る場合は、以下を確認してください:

```sql
SELECT DISTINCT category_key FROM skills ORDER BY category_key;
```

古いスキーマ（`basis`）を使っている場合は、`combined-all.sql` で最新のスキーマに更新するか、手動で `category_key` を修正してください。

---

## 7. 注意事項

- **冪等設計:** `migration-v3-features.sql` は何度実行しても安全です。`IF NOT EXISTS` と `ON CONFLICT DO NOTHING` により、既存データを壊すことはありません。

- **seed データの前提:** `skills` テーブルに正しい `skill_key` が存在することが前提です。事前チェック（セクション 1）で確認してから適用してください。

- **label の完全一致:** `check_items` の `label` は完全一致で検索されます。部分一致ではありません。空白の有無、全角・半角の違い、括弧の種類（`()` vs `（）`）に注意してください。

- **トランザクション:** マイグレーション全体が `BEGIN` / `COMMIT` で囲まれています。途中でエラーが発生した場合、すべての変更が自動的にロールバックされます。つまり、中途半端な状態にはなりません。

- **適用順序:** このマイグレーションは `combined-all.sql`（または `migration-v2-full.sql`）が適用済みであることを前提としています。必ず先にそちらを適用してください。
