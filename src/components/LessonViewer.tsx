"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lesson } from "@/lib/types";

export default function LessonViewer({
  lesson,
  userId,
}: {
  lesson: Lesson;
  userId: string;
}) {
  const supabase = createClient();
  const startTime = useRef(Date.now());
  const [status, setStatus] = useState<string>("not_started");

  // 閲覧ログ記録 & 進捗更新
  useEffect(() => {
    // 閲覧開始を記録
    supabase
      .from("progress")
      .upsert(
        {
          user_id: userId,
          lesson_id: lesson.id,
          status: "in_progress",
        },
        { onConflict: "user_id,lesson_id" }
      )
      .then(() => setStatus("in_progress"));

    // ページ離脱時に閲覧時間を記録
    return () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      supabase.from("view_logs").insert({
        user_id: userId,
        lesson_id: lesson.id,
        duration_seconds: duration,
      });
    };
  }, [lesson.id, userId, supabase]);

  async function markComplete() {
    await supabase
      .from("progress")
      .upsert(
        {
          user_id: userId,
          lesson_id: lesson.id,
          status: "completed",
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" }
      );
    setStatus("completed");
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">{lesson.title}</h2>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === "completed"
              ? "bg-green-100 text-green-700"
              : status === "in_progress"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {status === "completed"
            ? "完了"
            : status === "in_progress"
              ? "学習中"
              : "未開始"}
        </span>
      </div>
      <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
        {lesson.content}
      </div>
      {status !== "completed" && (
        <button
          onClick={markComplete}
          className="mt-6 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          完了にする
        </button>
      )}
    </div>
  );
}
