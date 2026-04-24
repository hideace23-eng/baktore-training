export type UserRole = "super_admin" | "admin" | "teacher" | "student" | "guest";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  can_edit_checklist: boolean;
  store_id: string | null;
  is_gold_member: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface ViewLog {
  id: string;
  user_id: string;
  lesson_id: string;
  viewed_at: string;
  duration_seconds: number;
}

export type CheckStatus = "none" | "done" | "ren";

export interface ChecklistProgress {
  id: string;
  user_id: string;
  skill_id: string;
  item_index: number;
  sub_index: number; // -1 for main items
  status: CheckStatus;
  rating: number | null; // 1-5 star self-evaluation
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  invited_by: string;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  area: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyTip {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  category: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// キャラクター成長システム
// ============================================================

export type CharacterType = "acro_kun" | "acro_chan";

export type XpActionType =
  | "check_clear"
  | "skill_complete"
  | "star_5_eval"
  | "consecutive_login"
  | "read_daily_tip";

export type CharacterStage = "egg" | "chick" | "child" | "youth" | "pro";

export interface CharacterState {
  user_id: string;
  character_type: CharacterType;
  xp: number;
  level: number;
  name: string;
  last_login_date: string | null;
  login_streak: number;
  created_at: string;
  updated_at: string;
}

export interface XpLog {
  id: string;
  user_id: string;
  action_type: XpActionType;
  xp_gained: number;
  reason: string | null;
  resource_id: string | null;
  created_at: string;
}
