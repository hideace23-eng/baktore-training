"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ChecklistProgressView from "@/components/ChecklistProgressView";
import type { CheckStatus } from "@/lib/types";

interface TeacherProps {
  courses: {
    id: string;
    title: string;
    description: string;
    lessons: { id: string; title: string; order_index: number }[];
  }[];
  progress: {
    user_id: string;
    lesson_id: string;
    status: string;
    score: number | null;
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
  students: { id: string; full_name: string; email: string }[];
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
}

type Tab = "checklist" | "progress" | "logs" | "courses";

export default function TeacherDashboardClient({
  courses,
  progress,
  viewLogs,
  students,
  checklistProgress,
}: TeacherProps) {
  const [tab, setTab] = useState<Tab>("checklist");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const supabase = createClient();

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("courses").insert({
      title: courseTitle,
      description: courseDesc,
    });
    if (!error) {
      setCourseTitle("");
      setCourseDesc("");
      setShowCourseForm(false);
      window.location.reload();
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "checklist", label: "研修チェックリスト" },
    { key: "progress", label: "コース進捗" },
    { key: "logs", label: "閲覧ログ" },
    { key: "courses", label: "コース管理" },
  ];

  return (
    <div>
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
            {t.label}
          </button>
        ))}
      </div>

      {tab === "checklist" && (
        <ChecklistProgressView
          progressData={checklistProgress}
          students={students}
        />
      )}

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
                    まだ進捗データがありません
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

      {tab === "logs" && (
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
                    まだ閲覧ログがありません
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

      {tab === "courses" && (
        <div>
          <button
            onClick={() => setShowCourseForm(!showCourseForm)}
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            + 新規コース作成
          </button>

          {showCourseForm && (
            <form
              onSubmit={handleCreateCourse}
              className="bg-white rounded-xl shadow p-6 mb-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  コース名
                </label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  説明
                </label>
                <textarea
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-gray-900"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
              >
                作成
              </button>
            </form>
          )}

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
          </div>
        </div>
      )}
    </div>
  );
}
