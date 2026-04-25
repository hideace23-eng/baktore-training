"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LessonViewer from "@/components/LessonViewer";
import SkillChecklist from "@/components/SkillChecklist";
import DailyTipCard from "@/components/DailyTipCard";
import CharacterSelectModal from "@/components/CharacterSelectModal";
import CharacterDisplay from "@/components/CharacterDisplay";
// 将来の有料機能用に残している (AiChat, api/chat/route.ts)
import type { CheckStatus, CharacterState } from "@/lib/types";

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

type Tab = "checklist" | "courses" | "skill-tree" | "faq" | "guide";

export default function StudentDashboardClient({
  courses,
  userId,
  checklistProgress,
  initialCharacterState,
  actAsMode,
  viewAsMode,
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
  initialCharacterState: CharacterState | null;
  actAsMode?: {
    targetUserId: string;
    targetName: string;
    actorId: string;
    actorName: string;
  };
  viewAsMode?: {
    mode: "student";
    actualRole: string;
  };
}) {
  const [tab, setTab] = useState<Tab>("checklist");
  const [selectedLesson, setSelectedLesson] = useState<LessonWithProgress | null>(null);
  const [character, setCharacter] = useState<CharacterState | null>(initialCharacterState);

  // 連続ログインXPトリガー（初回マウント時のみ）
  useEffect(() => {
    if (character) {
      fetch("/api/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consecutive_login", resourceId: "daily" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.character) setCharacter(data.character);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // キャラ未作成
  if (!character) {
    // view_as モードではキャラ作成させず案内メッセージを表示
    if (viewAsMode) {
      return (
        <div>
          <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-yellow-800 font-medium">
              🎭 生徒モードで表示中（あなたは{viewAsMode.actualRole === "super_admin" ? "システム管理者" : "店長"}です）
            </span>
            <Link
              href="/dashboard/admin"
              className="text-sm font-bold text-yellow-700 hover:text-yellow-900 underline"
            >
              元に戻る
            </Link>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <p className="text-blue-800 font-medium mb-2">管理者にはまだデータがありません</p>
            <p className="text-blue-600 text-sm">
              実際の生徒データで確認するには、生徒選択画面から act_as 機能をご利用ください。
            </p>
            <Link
              href="/dashboard/teacher?view_as=teacher"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              生徒選択画面へ
            </Link>
          </div>
        </div>
      );
    }
    return <CharacterSelectModal userId={userId} onComplete={(c) => setCharacter(c)} />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "checklist", label: "チェックリスト" },
    { key: "skill-tree", label: "スキルツリー" },
    { key: "faq", label: "FAQ" },
    { key: "guide", label: "使い方" },
    { key: "courses", label: "コース教材" },
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

  const roleLabel = viewAsMode?.actualRole === "super_admin" ? "システム管理者" : "店長";

  return (
    <div>
      {/* 代理チェックモード バナー */}
      {actAsMode && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-yellow-800 font-medium">
            {"\uD83C\uDFAD"} <strong>{actAsMode.targetName}</strong> として操作中
          </span>
          <Link
            href="/dashboard/teacher"
            className="text-sm font-bold text-yellow-700 hover:text-yellow-900 underline"
          >
            自分に戻る
          </Link>
        </div>
      )}

      {/* view_as モード バナー */}
      {viewAsMode && !actAsMode && (
        <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-yellow-800 font-medium">
            🎭 生徒モードで表示中（あなたは{roleLabel}です）
          </span>
          <Link
            href="/dashboard/admin"
            className="text-sm font-bold text-yellow-700 hover:text-yellow-900 underline"
          >
            元に戻る
          </Link>
        </div>
      )}

      {/* キャラクター表示 */}
      <CharacterDisplay
        characterState={character}
        compact
        onCharacterUpdate={(c) => setCharacter(c)}
      />

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
        <>
          {/* Tutorial banner: 柔軟・倒立が両方未着手の場合に案内 */}
          {(() => {
            const flexDone = checklistProgress.some(p => p.skill_id === "flexibility" && p.sub_index === -1 && p.status === "done");
            const handDone = checklistProgress.some(p => p.skill_id === "tutorial_handstand" && p.sub_index === -1 && p.status === "done");
            const flexStarted = checklistProgress.some(p => p.skill_id === "flexibility");
            const handStarted = checklistProgress.some(p => p.skill_id === "tutorial_handstand");
            if (!flexDone && !handDone && !flexStarted && !handStarted) {
              return (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💪</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-800 mb-1">
                        柔軟と倒立にもチャレンジしてみよう！
                      </p>
                      <p className="text-xs text-amber-600">
                        すべての技の土台になります。スキルツリーからチャレンジできるよ！
                      </p>
                      <a
                        href="/dashboard/skill-tree"
                        className="inline-block mt-2 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition"
                      >
                        🗺️ スキルツリーへ
                      </a>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          <DailyTipCard userId={userId} />
          <SkillChecklist userId={userId} initialProgress={checklistProgress} actorId={actAsMode?.actorId} />
        </>
      )}

      {tab === "skill-tree" && (
        <div className="text-center py-8">
          <a
            href="/dashboard/skill-tree"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            スキルツリーを表示
          </a>
        </div>
      )}

      {tab === "faq" && (
        <div className="text-center py-8">
          <a
            href="/dashboard/faq"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            FAQページを表示
          </a>
        </div>
      )}

      {tab === "guide" && (
        <div className="text-center py-8">
          <a
            href="/dashboard/guide"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
          >
            使い方ガイドを表示
          </a>
        </div>
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
    </div>
  );
}
