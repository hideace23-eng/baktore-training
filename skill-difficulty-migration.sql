-- ============================================================
-- 技別難易度レベル追加マイグレーション（冪等）
-- skills テーブルに difficulty_level (1〜10) を追加
-- ============================================================

ALTER TABLE skills
ADD COLUMN IF NOT EXISTS difficulty_level INT NOT NULL DEFAULT 1
CHECK (difficulty_level BETWEEN 1 AND 10);

-- 注: カラム名は slug ではなく skill_key
UPDATE skills SET difficulty_level = 1 WHERE skill_key = 'maeten';
UPDATE skills SET difficulty_level = 1 WHERE skill_key = 'kouten';
UPDATE skills SET difficulty_level = 1 WHERE skill_key = 'bridge';
UPDATE skills SET difficulty_level = 3 WHERE skill_key = 'handstand';
UPDATE skills SET difficulty_level = 4 WHERE skill_key = 'sokuten';
UPDATE skills SET difficulty_level = 4 WHERE skill_key = 'gainer';
UPDATE skills SET difficulty_level = 5 WHERE skill_key = 'roundoff';
UPDATE skills SET difficulty_level = 5 WHERE skill_key = 'helicopter';
UPDATE skills SET difficulty_level = 5 WHERE skill_key = 'maesou';
UPDATE skills SET difficulty_level = 5 WHERE skill_key = 'bakuten';
UPDATE skills SET difficulty_level = 5 WHERE skill_key = 'bakusou';
UPDATE skills SET difficulty_level = 6 WHERE skill_key = 'roundoff_bakuten';
