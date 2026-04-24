"use client";

import { useState, useEffect, useCallback } from "react";
import type { DailyTip } from "@/lib/types";

const categoryOptions = [
  { value: "faq", label: "よくあ���質問" },
  { value: "training", label: "トレーニング" },
  { value: "safety", label: "��全" },
  { value: "mental", label: "メンタル" },
  { value: "motivation", label: "モチベーション" },
  { value: "general", label: "その他" },
];

async function api(action: string, data?: Record<string, unknown>, id?: string) {
  const res = await fetch("/api/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data, id }),
  });
  return res.json();
}

export default function TipsAdminClient() {
  const [tips, setTips] = useState<DailyTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", video_url: "", category: "general", is_active: true });

  const reload = useCallback(async () => {
    const res = await api("list");
    setTips(res.data || []);
  }, []);

  useEffect(() => { reload().then(() => setLoading(false)); }, [reload]);

  function resetForm() {
    setForm({ title: "", content: "", video_url: "", category: "general", is_active: true });
    setEditing(null);
  }

  async function handleSave() {
    if (!form.title || !form.content) return;
    const data = { ...form, video_url: form.video_url || null };
    if (editing) {
      await api("update", data, editing);
    } else {
      await api("insert", data);
    }
    resetForm();
    await reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    await api("delete", undefined, id);
    await reload();
  }

  async function toggleActive(tip: DailyTip) {
    await api("update", { is_active: !tip.is_active }, tip.id);
    await reload();
  }

  function startEdit(tip: DailyTip) {
    setEditing(tip.id);
    setForm({
      title: tip.title,
      content: tip.content,
      video_url: tip.video_url || "",
      category: tip.category,
      is_active: tip.is_active,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800">{editing ? "編集" : "新規作成"}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-medium">タイトル</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">カテゴリ</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900">
              {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">本文</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" rows={6} />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium">動画URL（YouTube���</label>
          <input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="https://youtube.com/watch?v=..." />
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            {editing ? "更新" : "作成"}
          </button>
          {editing && (
            <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
              キャンセル
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {tips.map((tip) => (
          <div key={tip.id} className={`bg-white rounded-xl shadow p-4 ${!tip.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold text-gray-800 flex-1">{tip.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                tip.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                {tip.is_active ? "有効" : "無効"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tip.category}</span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-2 mb-3">{tip.content}</p>
            <div className="flex gap-2">
              <button onClick={() => startEdit(tip)} className="text-xs text-blue-500 hover:underline">編集</button>
              <button onClick={() => toggleActive(tip)} className="text-xs text-orange-500 hover:underline">
                {tip.is_active ? "無効にする" : "有効にする"}
              </button>
              <button onClick={() => handleDelete(tip.id)} className="text-xs text-red-500 hover:underline">��除</button>
            </div>
          </div>
        ))}
        {tips.length === 0 && <div className="text-center py-8 text-gray-400">豆知識がありません</div>}
      </div>
    </div>
  );
}
