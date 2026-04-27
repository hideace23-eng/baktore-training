"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
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

type ViewMode = "admin" | "student" | "teacher";

const viewModeLabels: Record<ViewMode, string> = {
  admin: "管理者として表示",
  student: "生徒として表示",
  teacher: "先生として表示",
};

function ViewModeSwitcher({ currentMode }: { currentMode: ViewMode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(mode: ViewMode) {
    setOpen(false);
    if (mode === "admin") {
      router.push("/dashboard/admin");
    } else if (mode === "student") {
      router.push("/dashboard/student?view_as=student");
    } else {
      router.push("/dashboard/teacher?view_as=teacher");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 text-white border border-white/25 hover:bg-white/25 transition"
      >
        <span>👁️ 表示モード: {viewModeLabels[currentMode]}</span>
        <svg className={`w-3 h-3 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-50 min-w-[200px]">
          {(["admin", "student", "teacher"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleSelect(mode)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition ${
                currentMode === mode ? "font-bold text-blue-600" : "text-gray-700"
              }`}
            >
              {currentMode === mode && "✓ "}{viewModeLabels[mode]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({ profile, actualRole }: { profile: Profile; actualRole?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const realRole = actualRole || profile.role;
  const isAdmin = realRole === "super_admin" || realRole === "admin";
  const viewAs = searchParams.get("view_as");

  let currentViewMode: ViewMode = "admin";
  if (viewAs === "student") currentViewMode = "student";
  else if (viewAs === "teacher") currentViewMode = "teacher";

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
          {isAdmin && <ViewModeSwitcher currentMode={currentViewMode} />}
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
