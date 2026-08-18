# V6.2 デプロイ手順: オンボーディング（初回ヒアリング）

## 前提
- migration-v5, migration-v6-1 が適用済みであること

## 手順

### Step 1: migration-v6-2 を適用

1. Supabase Dashboard → SQL Editor を開く
2. `migration-v6-2-onboarding.sql` の内容を全て貼り付けて **Run**
3. 実行後、確認用 SELECT の結果に以下の10カラムが表示されることを確認:
   - `onboarding_completed` (boolean)
   - `onboarding_step` (integer)
   - `onboarding_completed_at` (timestamp with time zone)
   - `onboarding_age_group` (text)
   - `onboarding_attribute` (text)
   - `onboarding_short_term_goals` (ARRAY)
   - `onboarding_long_term_dream` (text)
   - `onboarding_self_image` (text)
   - `onboarding_practice_frequency` (text)
   - `onboarding_self_reported_skills` (ARRAY)

### Step 2: 動作確認

1. `/dashboard/student` を開く
2. **初回ユーザー**（onboarding_step = 0）: 自動でオンボーディングモーダルが表示される
3. **途中離脱ユーザー**（onboarding_step >= 1）: 紫のバナー「✨ プロフィールを完成させて...」+「続きから始める」ボタンが表示
4. **完了済みユーザー**（onboarding_completed = true）: 何も表示されない

### Step 3: 各ステップの確認

| Step | 画面 | 確認内容 |
|------|------|---------|
| 1 | ウェルカム | 「冒険のはじまりだ ✨」+ はじめる/あとでやるボタン |
| 2 | 年齢グループ | 8つの年齢ボタン + スキップ |
| 3 | 属性 | 11の属性カード + スキップ |
| 4 | 短期目標 | カテゴリ別タブ + スキル複数選択 + スキップ |
| 5 | 憧れ目標 | スキル選択 + フリーテキスト + スキップ |
| 6 | 自分像 | フリーテキスト + スキップ |
| 7 | 練習頻度 | 5つの頻度ボタン + スキップ |
| 8 | 今できる技 | カテゴリ別タブ + スキル複数選択 + スキップ |
| 9 | 完了 | 紙吹雪 + ダッシュボードへボタン |

### Step 4: 確認用 SQL

```sql
-- オンボーディング状態の確認
SELECT
  id, full_name,
  onboarding_step,
  onboarding_completed,
  onboarding_age_group,
  onboarding_attribute,
  onboarding_short_term_goals,
  onboarding_long_term_dream,
  onboarding_self_image,
  onboarding_practice_frequency,
  onboarding_self_reported_skills
FROM profiles
ORDER BY onboarding_step DESC
LIMIT 10;
```

## ロールバック

```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_step;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_completed_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_age_group;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_attribute;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_short_term_goals;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_long_term_dream;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_self_image;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_practice_frequency;
ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_self_reported_skills;
```

## 変更ファイル一覧

| ファイル | 変更 |
|---------|------|
| `migration-v6-2-onboarding.sql` | **新規**: profiles に10カラム追加 |
| `src/app/api/onboarding/route.ts` | **新規**: GET/POST API |
| `src/components/OnboardingModal.tsx` | **新規**: 9ステップのモーダルコンポーネント |
| `src/app/dashboard/student/page.tsx` | onboarding 状態を props で渡す |
| `src/app/dashboard/student/StudentDashboardClient.tsx` | モーダル表示 + 途中離脱バナー |
| `V6-2-DEPLOY.md` | 本ファイル |
