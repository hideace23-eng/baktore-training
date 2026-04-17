"use client";

import { useState } from "react";
import LessonViewer from "@/components/LessonViewer";
import SkillChecklist from "@/components/SkillChecklist";
import AiChat from "@/components/AiChat";
import type { CheckStatus } from "@/lib/types";

interface LessonWithProgress {
  id: string;
  title: string;
  content: string;
  order_index: number;
  progress: { status: string }[];
}

interface CourseWithLessons {
  id: string;
  title: string;
  description: string;
  lessons: LessonWithProgress[];
}

type Tab = "checklist" | "courses" | "ai";

export default function StudentDashboardClient({
  courses,
  userId,
  checklistProgress,
}: {
  courses: CourseWithLessons[];
  userId: string;
  checklistProgress: {
    skill_id: string;
    item_index: number;
    sub_index: number;
    status: CheckStatus;
    rating: number | null;
  }[];
}) {
  const [tab, setTab] = useState<Tab>("checklist");
  const [selectedLesson, setSelectedLesson] = useState<LessonWithProgress | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: "checklist", label: "研修チェックリスト" },
    { key: "courses", label: "コース教材" },
    { key: "ai", label: "AIに質問" },
  ];

  if (selectedLesson) {
    return (
      <div>
        <button
          onClick={() => setSelectedLesson(null)}
          className="mb-4 text-blue-600 hover:underline text-sm"
        >
          &larr; コース一覧に戻る
        </button>
        <LessonViewer lesson={selectedLesson as never} userId={userId} />
      </div>
    );
  }

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
        <SkillChecklist userId={userId} initialProgress={checklistProgress} />
      )}

      {tab === "courses" && (
        <>
          {courses.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              まだコースが登録されていません
            </div>
          ) : (
            <div className="space-y-6">
              {courses.map((course) => {
                const totalLessons = course.lessons.length;
                const completedLessons = course.lessons.filter((l) =>
                  l.progress?.some((p) => p.status === "completed")
                ).length;
                const progressPercent =
                  totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                return (
                  <div key={course.id} className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-800">{course.title}</h3>
                      <span className="text-sm text-gray-500">
                        {completedLessons}/{totalLessons} 完了
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{course.description}</p>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="space-y-2">
                      {course.lessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((lesson) => {
                          const isCompleted = lesson.progress?.some(
                            (p) => p.status === "completed"
                          );
                          return (
                            <button
                              key={lesson.id}
                              onClick={() => setSelectedLesson(lesson)}
                              className="w-full text-left px-4 py-3 rounded-lg border hover:bg-blue-50 transition flex items-center justify-between"
                            >
                              <span className="text-gray-700">{lesson.title}</span>
                              {isCompleted && (
                                <span className="text-green-600 text-sm">&check; 完了</span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "ai" && <AiChat />}
    </div>
  );
}
