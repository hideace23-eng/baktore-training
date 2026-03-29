-- チェックリスト進捗テーブルに星評価カラムを追加
ALTER TABLE checklist_progress
  ADD COLUMN IF NOT EXISTS rating INT DEFAULT NULL CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
