# V6.3 デプロイ手順: チェック項目整備 + ボトムシートバグ修正

## ⚠️ 重要: このマイグレーションは破壊的です

対象5技の **既存チェック項目と進捗データが削除** されます。
実行前に **必ずバックアップ** を取得してください。

対象技:
- バク転 (bakuten)
- バク宙 (bakusou)
- ハンドスプリング (handspring)
- 側転 (sokuten)
- 三点倒立 (haitouritsu)

---

## 手順

### 1. バックアップ
Supabase Dashboard → Settings → Database → Backups でバックアップを取得。

または手動で対象データをエクスポート:
```sql
-- 影響を受けるデータのエクスポート確認
SELECT s.skill_key, ci.label, ci.order_index
FROM check_items ci
JOIN skills s ON s.id = ci.skill_id
WHERE s.skill_key IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu')
ORDER BY s.skill_key, ci.order_index;

SELECT cp.skill_id, cp.item_index, cp.sub_index, cp.status, cp.rating
FROM checklist_progress cp
WHERE cp.skill_id IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu');
```

### 2. マイグレーション実行
1. Supabase Dashboard → SQL Editor を開く
2. `migration-v6-3-checklist-overhaul.sql` の内容を全て貼り付けて Run
3. 冪等設計: 対象技が既に10項目持っている場合はスキップされる
4. 最後の確認用 SELECT で各技が10項目あることを確認

### 3. 動作確認

#### ボトムシート Lv 表示
/dashboard/skill-tree で以下を確認:
- [ ] バク転をタップ → ボトムシートに **Lv7** 表示
- [ ] バク宙をタップ → **Lv7** 表示
- [ ] ハンドスプリングをタップ → **Lv5** 表示
- [ ] 側転をタップ → **Lv3** 表示
- [ ] 三点倒立をタップ → **Lv3** 表示

#### チェック項目内容
各技のボトムシートで10項目が表示され、新仕様の内容になっていることを確認:
- [ ] バク転: 「ジャンプ力がある」→...→「補助なしでバク転を1本通せる」
- [ ] バク宙: 「バク転ができる」→...→「補助なしでバク宙を1本通せる」
- [ ] ハンドスプリング: 「手首・足首の柔軟性がある」→...→「目線「床→天井→正面」...」
- [ ] 側転: 「利き手・利き足が判別できている」→...→「障害物なしで...側転できる」
- [ ] 三点倒立: 「練習環境が整っている」→...→「三点倒立を30秒以上キープ」

### 4. 確認用SQL
```sql
-- 各技のチェック項目数
SELECT s.skill_key, s.name, s.description, COUNT(ci.id) AS item_count
FROM skills s
LEFT JOIN check_items ci ON ci.skill_id = s.id
WHERE s.skill_key IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu')
GROUP BY s.skill_key, s.name, s.description
ORDER BY s.skill_key;

-- 各技の項目一覧
SELECT s.skill_key, ci.order_index, ci.label
FROM check_items ci
JOIN skills s ON s.id = ci.skill_id
WHERE s.skill_key IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu')
ORDER BY s.skill_key, ci.order_index;

-- difficulty_level 確認
SELECT skill_key, name, difficulty_level FROM skills
WHERE skill_key IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu')
ORDER BY difficulty_level DESC;
```

### 5. ロールバック手順

⚠️ **チェック項目を削除して再挿入しているため、元のチェック項目内容を復元するには seed データが必要です。**

1. Supabase のバックアップから復元する（最も安全）
2. または、`supabase-checklist-seed.sql` を再実行して元のデータに戻す

```sql
-- 手動ロールバック（元データが seed SQL にある場合）
-- Step 1: 新しいチェック項目を削除
DELETE FROM check_items WHERE skill_id IN (SELECT id FROM skills WHERE skill_key IN ('bakuten', 'bakusou', 'handspring', 'sokuten', 'haitouritsu'));

-- Step 2: seed SQL から対象5技の部分だけ再実行
-- → supabase-checklist-seed.sql を参照
```

---

## コード変更（自動反映済み）

### ボトムシート Lv 表示バグ修正
- **原因**: `/api/admin/checklist` の SELECT クエリに `difficulty_level` カラムが含まれていなかった
- **修正**: skills の SELECT に `difficulty_level, default_expanded` を追加
- **ファイル**: `src/app/api/admin/checklist/route.ts`

### フォールバックデータ更新
- **ファイル**: `src/lib/checklist-data.ts`
- 5技のチェック項目を新仕様に更新
