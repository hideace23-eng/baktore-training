-- ============================================================
-- バクトレ研修 V4: 代理チェック機能（先生モード）
-- ============================================================
-- 冪等設計: 何度実行しても安全
-- ============================================================

BEGIN;

-- 1. checklist_progress に updated_by_user_id カラム追加
ALTER TABLE checklist_progress ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES auth.users(id);

-- 2. xp_logs に triggered_by_user_id カラム追加
ALTER TABLE xp_logs ADD COLUMN IF NOT EXISTS triggered_by_user_id UUID REFERENCES auth.users(id);

-- 3. teacher_stores テーブル（先生の複数店舗対応）
CREATE TABLE IF NOT EXISTS teacher_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, store_id)
);

ALTER TABLE teacher_stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teacher_stores_select" ON teacher_stores;
CREATE POLICY "teacher_stores_select" ON teacher_stores FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "teacher_stores_admin_write" ON teacher_stores;
CREATE POLICY "teacher_stores_admin_write" ON teacher_stores FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
);

-- 4. activity_log テーブル
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
);
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
);

-- 5. 既存の profiles.store_id を teacher_stores にも初期データとして反映する関数
-- （先生のprofile.store_idがあれば、teacher_storesにも追加）
INSERT INTO teacher_stores (teacher_id, store_id)
SELECT id, store_id FROM profiles WHERE role = 'teacher' AND store_id IS NOT NULL
ON CONFLICT (teacher_id, store_id) DO NOTHING;

COMMIT;
