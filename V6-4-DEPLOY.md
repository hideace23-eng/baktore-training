# V6.4 デプロイ手順: スキルツリーファースト化 + ハンバーガーメニュー

## 概要
- DB変更なし（コードのみの変更）
- 生徒の初期画面をスキルツリーに変更
- キャラクター・XPバーをUIから削除（バックエンドは維持）
- ハンバーガーメニューで他画面にアクセス可能に

## 手順

### Step 1: デプロイ
コードのみの変更なので、git push 後に自動デプロイされます。

### Step 2: 動作確認

| 確認項目 | 手順 | 期待結果 |
|---------|------|---------|
| リダイレクト | 生徒でログイン → /dashboard/student にアクセス | 自動的に /dashboard/skill-tree にリダイレクト |
| スキルツリー表示 | /dashboard/skill-tree を開く | クエストマップが表示される |
| 豆知識カード | スキルツリー上部を確認 | 「今日の豆知識」カードが表示される |
| オンボーディングバナー | onboarding_completed=false のユーザーで確認 | 紫バナー「✨ プロフィールを完成させて...」が表示 |
| ハンバーガーメニュー | ヘッダー左の ☰ をタップ | ドロップダウンメニューが開く |
| メニュー遷移 | メニューから各項目をタップ | クエストマップ/FAQ/使い方に遷移（3項目） |
| 管理者ビュー | 管理者で view_as=student | 従来のダッシュボードが表示される（リダイレクトされない） |
| act_as モード | 先生から生徒を代理チェック | 従来通り動作する |

### Step 3: キャラクター/XP非表示確認
- 生徒ダッシュボード（view_as=student でアクセス時）にキャラクター表示・タブメニューが非表示
- ただしXP加算はバックグラウンドで動作し続ける（/api/xp は変更なし）

## ロールバック
```bash
git revert <commit-hash>
```
これだけで元に戻ります。DB変更がないため、コードの revert のみで完了。

## 将来 XP・キャラを復活させる手順
1. `src/app/dashboard/student/StudentDashboardClient.tsx` の「v6.4: UIから削除」コメントを解除
2. `src/app/dashboard/student/page.tsx` の `redirect("/dashboard/skill-tree")` 行を削除
3. これだけで復活します（バックエンドは一切変更していないため）

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/app/dashboard/student/page.tsx` | 生徒ロールのリダイレクト先を /dashboard/skill-tree に |
| `src/app/dashboard/skill-tree/page.tsx` | 上部にオンボーディングバナー + 豆知識カード + オンボーディングモーダル |
| `src/app/dashboard/student/StudentDashboardClient.tsx` | CharacterDisplay / タブメニューをコメントアウト |
| `src/components/Header.tsx` | ハンバーガーメニュー追加（framer-motion アニメーション付き） |
| `V6-4-DEPLOY.md` | 本ファイル |
