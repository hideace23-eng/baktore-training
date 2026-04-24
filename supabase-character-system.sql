-- ============================================================
-- キャラクター成長システム
-- 実行順: 5番目（ロールv2, stores, daily_tips の後）
-- ============================================================

-- 1. キャラクター状態テーブル
CREATE TABLE IF NOT EXISTS character_states (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  character_type TEXT NOT NULL CHECK (character_type IN ('acro_kun', 'acro_chan')),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  name VARCHAR(20) NOT NULL DEFAULT 'アクロ',
  last_login_date DATE,
  login_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. XP獲得ログテーブル
CREATE TABLE IF NOT EXISTS xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_gained INTEGER NOT NULL,
  reason TEXT,
  resource_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON xp_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_dedup ON xp_logs (user_id, action_type, resource_id);

-- 3. RLS
ALTER TABLE character_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;

-- character_states: ユーザーは自分のキャラのみ操作可
CREATE POLICY "Users can read own character" ON character_states
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own character" ON character_states
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own character" ON character_states
  FOR UPDATE USING (user_id = auth.uid());

-- super_adminは全キャラ閲覧可
CREATE POLICY "Super admins can read all characters" ON character_states
  FOR SELECT USING (get_my_role() = 'super_admin');

-- xp_logs: ユーザーは自分のログのみ
CREATE POLICY "Users can read own xp_logs" ON xp_logs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own xp_logs" ON xp_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- super_adminは全ログ閲覧可
CREATE POLICY "Super admins can read all xp_logs" ON xp_logs
  FOR SELECT USING (get_my_role() = 'super_admin');
