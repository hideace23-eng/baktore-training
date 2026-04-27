# V6.1 デプロイ手順: 540 追加 + DB マイグレーション

## 前提
- Supabase プロジェクトに接続済みであること
- migration-v2-full.sql, migration-v3-features.sql が適用済みであること

## 手順

### Step 1: migration-v5 を適用（未適用の場合）

1. Supabase Dashboard → SQL Editor を開く
2. `migration-v5-tutorial-skills.sql` の内容を全て貼り付けて **Run**
3. 成功を確認（冪等設計なので再実行しても安全）

**追加される内容:**
- `skills.is_tutorial` カラム (BOOLEAN)
- `skills.skill_category` カラム (TEXT)
- 柔軟スキル（10チェック項目）
- 倒立チュートリアルスキル（10チェック項目）
- 既存技の skill_category 振り分け（forward/side/backward/special/tutorial）

### Step 2: migration-v6-1 を適用

1. Supabase Dashboard → SQL Editor を開く
2. `migration-v6-1-five-forty.sql` の内容を全て貼り付けて **Run**
3. 成功を確認

**追加される内容:**
- 540（ファイブフォーティー）スキル（8チェック項目）
  - skill_key: `five_forty`
  - category: `special`
  - difficulty_level: 6

### Step 3: 動作確認

1. `/dashboard/skill-tree` を開く
2. 以下が表示されることを確認:
   - **必修クエスト**: 柔軟、倒立（チュートリアル）
   - **前方系**: 前転 → 前宙ひねり（9技）
   - **側方系**: 側転 → ロンバク宙（6技）
   - **後方系**: ブリッジ → バク宙ひねり（13技）
   - **スペシャルクエスト**: マカコ、ゲイナー、サイドフリップ、**540**、ヘリコプテイロ、コーク（6技）
3. 540 ノードをタップ → ボトムシートが開き、8つのチェック項目が表示される
4. チェック項目をタップ → DB に保存される

### Step 4: 確認用 SQL

```sql
-- 540 が追加されたことを確認
SELECT skill_key, name, skill_category, difficulty_level
FROM skills
WHERE skill_key = 'five_forty';

-- チェック項目数を確認（8件であること）
SELECT COUNT(*)
FROM check_items
WHERE skill_id = (SELECT id FROM skills WHERE skill_key = 'five_forty');

-- 全スキルの category 分布を確認
SELECT skill_category, COUNT(*) as count
FROM skills
GROUP BY skill_category
ORDER BY skill_category;
```

## ロールバック

540 のみ削除する場合:
```sql
DELETE FROM check_items WHERE skill_id = (SELECT id FROM skills WHERE skill_key = 'five_forty');
DELETE FROM skills WHERE skill_key = 'five_forty';
```

## 変更ファイル一覧

| ファイル | 変更 |
|---------|------|
| `migration-v6-1-five-forty.sql` | 新規: 540 追加の SQL |
| `src/app/dashboard/skill-tree/page.tsx` | SPECIAL_NODES に five_forty 追加、スペシャルセクションをグラデーションバッジ付きに |
| `src/lib/checklist-data.ts` | フォールバック用に five_forty スキルデータ追加 |
| `V6-1-DEPLOY.md` | 本ファイル（デプロイ手順書） |
