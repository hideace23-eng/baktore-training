export type UserRole = "admin" | "teacher" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
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
