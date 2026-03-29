"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, CheckStatus } from "@/lib/types";
import ChecklistProgressView from "@/components/ChecklistProgressView";

interface AdminProps {
  users: Profile[];
  courses: {
    id: string;
    title: string;
    description: string;
    lessons: { id: string; title: string }[];
  }[];
  progress: {
    user_id: string;
    lesson_id: string;
    status: string;
    completed_at: string | null;
    profiles: { full_name: string; email: string };
    lessons: { title: string; course_id: string };
  }[];
  viewLogs: {
    id: string;
    viewed_at: string;
    duration_seconds: number;
    profiles: { full_name: string; email: string };
    lessons: { title: string };
  }[];
  checklistProgress: {
    user_id: string;
    full_name: string;
    email: string;
    skill_id: string;
    item_index: number;
    sub_index: number;
    status: CheckStatus;
    rating: number | null;
    updated_at: string;
  }[];
  students: { id: string; full_name: string; email: string }[];
}

type Tab = "users" | "checklist" | "courses" | "progress" | "logs";

const roleLabels: Record<string, string> = {
  admin: "管理者",
  teacher: "先生",
  student: "生徒",
};

export default function AdminDashboardClient({
  users,
  courses,
  progress,
  viewLogs,
  checklistProgress,
  students,
}: AdminProps) {
  const [tab, setTab] = useState<Tab>("users");
  const supabase = createClient();

  async function changeRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    if (!error) window.location.reload();
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "users", label: "ユーザー管理", count: users.length },
    { key: "checklist", label: "研修チェックリスト", count: checklistProgress.length },
    { key: "courses", label: "コース", count: courses.length },
    { key: "progress", label: "コース進捗", count: progress.length },
    { key: "logs", label: "閲覧ログ", count: viewLogs.length },
  ];

  return (
    <div>
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-2xl font-bold text-gray-800">{users.length}</div>
          <div className="text-sm text-gray-500">総ユーザー数</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-2xl font-bold text-gray-800">{courses.length}</div>
          <div className="text-sm text-gray-500">コース数</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-2xl font-bold text-gray-800">
            {progress.filter((p) => p.status === "completed").length}
          </div>
          <div className="text-sm text-gray-500">完了レッスン</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <div className="text-2xl font-bold text-gray-800">{viewLogs.length}</div>
          <div className="text-sm text-gray-500">閲覧ログ件数</div>
        </div>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* ユーザー管理 */}
      {tab === "users" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  氏名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  メール
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  役割
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  登録日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {u.full_name || "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{roleLabels[u.role]}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1 text-gray-700"
                    >
                      <option value="student">生徒</option>
                      <option value="teacher">先生</option>
                      <option value="admin">管理者</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 研修チェックリスト */}
      {tab === "checklist" && (
        <ChecklistProgressView
          progressData={checklistProgress}
          students={students}
        />
      )}

      {/* コース一覧 */}
      {tab === "courses" && (
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-800">{course.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{course.description}</p>
              <div className="mt-3 text-sm text-gray-500">
                レッスン数: {course.lessons?.length || 0}
              </div>
            </div>
          ))}
          {courses.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              コースがまだありません
            </div>
          )}
        </div>
      )}

      {/* 全体進捗 */}
      {tab === "progress" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  生徒
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  レッスン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  完了日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {progress.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    進捗データがありません
                  </td>
                </tr>
              ) : (
                progress.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {p.profiles?.full_name || p.profiles?.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.lessons?.title}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : p.status === "in_progress"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.status === "completed"
                          ? "完了"
                          : p.status === "in_progress"
                            ? "学習中"
                            : "未開始"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {p.completed_at
                        ? new Date(p.completed_at).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 閲覧ログ */}
      {tab === "logs" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ユーザー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  レッスン
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  閲覧日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  閲覧時間
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {viewLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    閲覧ログがありません
                  </td>
                </tr>
              ) : (
                viewLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.profiles?.full_name || log.profiles?.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.lessons?.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(log.viewed_at).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {Math.floor(log.duration_seconds / 60)}分
                      {log.duration_seconds % 60}秒
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
