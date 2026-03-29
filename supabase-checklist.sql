-- チェックリスト進捗テーブル
-- 生徒のスキルチェックリスト状態を保存する

CREATE TABLE IF NOT EXISTS checklist_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  skill_id TEXT NOT NULL,           -- e.g. 'bakuten', 'bakusou'
  item_index INT NOT NULL,          -- メインチェック項目のインデックス
  sub_index INT NOT NULL DEFAULT -1, -- -1 = メイン項目, 0+ = サブ項目
  status TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none', 'done', 'ren')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skill_id, item_index, sub_index)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_checklist_progress_user ON checklist_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_checklist_progress_skill ON checklist_progress(user_id, skill_id);

-- RLS有効化
ALTER TABLE checklist_progress ENABLE ROW LEVEL SECURITY;

-- 生徒: 自分のデータのみ閲覧・編集可能
CREATE POLICY "Users can view own checklist progress"
  ON checklist_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklist progress"
  ON checklist_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklist progress"
  ON checklist_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own checklist progress"
  ON checklist_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 先生・管理者: 全生徒のデータを閲覧可能
CREATE POLICY "Teachers and admins can view all checklist progress"
  ON checklist_progress FOR SELECT
  USING (public.get_my_role() IN ('teacher', 'admin'));
