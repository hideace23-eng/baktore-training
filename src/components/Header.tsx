"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

const roleLabels: Record<string, string> = {
  super_admin: "システム管理者",
  admin: "店長",
  teacher: "先生",
  student: "生徒",
  guest: "ゲスト",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-white/20 text-white border border-white/30",
  admin: "bg-white/20 text-white border border-white/30",
  teacher: "bg-white/20 text-white border border-white/30",
  student: "bg-white/20 text-white border border-white/30",
  guest: "bg-white/20 text-white/80 border border-white/20",
};

export default function Header({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">🤸 バクトレ研修</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${roleColors[profile.role] || roleColors.guest}`}
          >
            {roleLabels[profile.role] || profile.role}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/90">
            {profile.full_name || profile.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-white/70 hover:text-white transition"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
