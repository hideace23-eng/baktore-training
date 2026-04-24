"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { getStage, getStageInfo } from "@/lib/xp";

interface StudentInfo {
  id: string;
  full_name: string;
  email: string;
  store_id: string | null;
  character?: {
    xp: number;
    level: number;
    name: string;
    login_streak: number;
    last_login_date: string | null;
    character_type: string;
  } | null;
  checklistDone: number;
  checklistTotal: number;
}

interface StoreInfo {
  id: string;
  name: string;
}

interface Props {
  students: StudentInfo[];
  stores: StoreInfo[];
  currentStoreName: string;
}

export default function TeacherDashboardClient({ students, stores }: Props) {
  const [selectedStore, setSelectedStore] = useState<string | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = students;
    if (selectedStore !== "all") {
      list = list.filter(s => s.store_id === selectedStore);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    return list;
  }, [students, selectedStore, search]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">生徒管理</h2>
      <p className="text-sm text-gray-500 mb-6">生徒をクリックして代理チェックモードに入れます</p>

      {/* Store tabs */}
      {stores.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setSelectedStore("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedStore === "all" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
            すべて ({students.length})
          </button>
          {stores.map(store => {
            const count = students.filter(s => s.store_id === store.id).length;
            return (
              <button key={store.id} onClick={() => setSelectedStore(store.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedStore === store.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}>
                {store.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="生徒名で検索..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
        />
      </div>

      {/* Student grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(student => {
          const char = student.character;
          const stage = char ? getStage(char.level) : null;
          const stageInfo = stage ? getStageInfo(stage) : null;
          const checkPct = student.checklistTotal > 0 ? Math.round((student.checklistDone / student.checklistTotal) * 100) : 0;

          return (
            <Link
              key={student.id}
              href={`/dashboard/student?act_as=${student.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{stageInfo?.emoji || "\uD83E\uDD5A"}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition">
                    {student.full_name || student.email}
                  </div>
                  <div className="text-xs text-gray-400">
                    {char ? `Lv.${char.level} ${stageInfo?.label || ""}` : "キャラ未作成"}
                  </div>
                </div>
                {char && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                    {char.xp}XP
                  </span>
                )}
              </div>

              {/* Checklist progress */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>チェック進捗</span>
                  <span>{student.checklistDone}/{student.checklistTotal} ({checkPct}%)</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${checkPct}%` }} />
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {char?.login_streak && char.login_streak > 1 && (
                  <span>{"\uD83D\uDD25"} {char.login_streak}日連続</span>
                )}
                {char?.last_login_date && (
                  <span>最終: {new Date(char.last_login_date).toLocaleDateString("ja-JP")}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {search ? "検索条件に一致する生徒がいません" : "生徒がまだいません"}
        </div>
      )}
    </div>
  );
}
