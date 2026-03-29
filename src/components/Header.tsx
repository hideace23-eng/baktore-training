"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

const roleLabels = {
  admin: "管理者",
  teacher: "先生",
  student: "生徒",
};

const roleColors = {
  admin: "bg-red-100 text-red-700",
  teacher: "bg-green-100 text-green-700",
  student: "bg-blue-100 text-blue-700",
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
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-800">🏋️ バクトレ研修</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[profile.role]}`}
          >
            {roleLabels[profile.role]}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {profile.full_name || profile.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600 transition"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
