"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "@/lib/youtube";

// ============================================================
// Types
// ============================================================
interface SubItem {
  id: string;
  label: string;
  order_index: number;
}

interface CheckItem {
  id: string;
  label: string;
  video_url: string | null;
  order_index: number;
  check_sub_items?: SubItem[];
}

interface Skill {
  id: string;
  skill_key: string;
  name: string;
  level: string;
  hint: string;
  description: string;
  order_index: number;
  check_items: CheckItem[];
}

interface Category {
  id: string;
  key: string;
  name: string;
  color: string;
  order_index: number;
  skills: Skill[];
}

// ============================================================
// API helpers
// ============================================================
async function api(action: string, table: string, data?: Record<string, unknown>, id?: string) {
  const res = await fetch("/api/admin/checklist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, table, data, id }),
  });
  return res.json();
}

async function fetchAll(): Promise<Category[]> {
  const res = await fetch("/api/admin/checklist");
  const json = await res.json();
  return json.data || [];
}

// ============================================================
// Component
// ============================================================
export default function ChecklistAdminClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<Record<string, string>>({});

  // Drag state
  const dragItem = useRef<{ table: string; id: string; index: number } | null>(null);
  const dragOverItem = useRef<{ index: number } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const reload = useCallback(async () => {
    const data = await fetchAll();
    setCategories(data);
  }, []);

  useEffect(() => {
    reload().then(() => setLoading(false));
  }, [reload]);

  // ============================================================
  // Drag handlers
  // ============================================================
  function handleDragStart(table: string, id: string, index: number) {
    dragItem.current = { table, id, index };
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverItem.current = { index };
  }

  async function handleDrop<T extends { id: string; order_index: number }>(
    e: React.DragEvent,
    items: T[],
    table: string
  ) {
    e.preventDefault();
    if (!dragItem.current || !dragOverItem.current) return;
    if (dragItem.current.table !== table) return;

    const from = dragItem.current.index;
    const to = dragOverItem.current.index;
    if (from === to) return;

    const reordered = [...items];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const updates = reordered.map((item, i) => ({ id: item.id, order_index: i }));
    await api("reorder", table, updates as unknown as Record<string, unknown>);
    await reload();
    showToast("並び順を更新しました");

    dragItem.current = null;
    dragOverItem.current = null;
  }

  // ============================================================
  // CRUD helpers
  // ============================================================
  async function addCategory() {
    const name = prompt("カテゴリ名を入力:");
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20) || `cat_${Date.now()}`;
    await api("insert", "categories", {
      key,
      name,
      color: "base",
      order_index: categories.length,
    });
    await reload();
    showToast("カテゴリを追加しました");
  }

  async function addSkill(categoryId: string, currentSkillCount: number) {
    const name = prompt("技の名前を入力:");
    if (!name) return;
    const skillKey = name.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30) || `skill_${Date.now()}`;
    await api("insert", "skills", {
      category_id: categoryId,
      skill_key: skillKey,
      name,
      level: "b",
      hint: "",
      description: "",
      order_index: currentSkillCount,
    });
    await reload();
    showToast("技を追加しました");
  }

  async function addCheckItem(skillId: string, currentCount: number) {
    const label = prompt("チェック項目のラベルを入力:");
    if (!label) return;
    await api("insert", "check_items", {
      skill_id: skillId,
      label,
      video_url: null,
      order_index: currentCount,
    });
    await reload();
    showToast("チェック項目を追加しました");
  }

  async function addSubItem(checkItemId: string, currentCount: number) {
    const label = prompt("詳細項目のラベルを入力:");
    if (!label) return;
    await api("insert", "check_sub_items", {
      check_item_id: checkItemId,
      label,
      order_index: currentCount,
    });
    await reload();
    showToast("詳細項目を追加しました");
  }

  async function deleteItem(table: string, id: string, label: string) {
    if (!confirm(`「${label}」を削除しますか？関連データもすべて削除されます。`)) return;
    await api("delete", table, undefined, id);
    await reload();
    showToast("削除しました");
  }

  function startEdit(id: string, fields: Record<string, string>) {
    setEditingId(id);
    setEditValue(fields);
  }

  async function saveEdit(table: string, id: string) {
    // DB に存在しないフィールドを除外
    const { video_title: _vt, ...dbFields } = editValue;
    void _vt;
    await api("update", table, dbFields as Record<string, unknown>, id);
    setEditingId(null);
    setEditValue({});
    await reload();
    showToast("更新しました");
  }

  // ============================================================
  // Render
  // ============================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">読み込み中...</span>
      </div>
    );
  }

  const levelOptions = [
    { value: "b", label: "初級" },
    { value: "m", label: "中級" },
    { value: "a", label: "上級" },
  ];

  const colorOptions = ["base", "back", "front", "side", "combo", "special"];

  return (
    <div className="space-y-4">
      {/* Add category */}
      <button
        onClick={addCategory}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
      >
        + カテゴリを追加
      </button>

      {/* Categories */}
      {categories.map((cat, catIdx) => (
        <div
          key={cat.id}
          draggable
          onDragStart={() => handleDragStart("categories", cat.id, catIdx)}
          onDragOver={(e) => handleDragOver(e, catIdx)}
          onDrop={(e) => handleDrop(e, categories, "categories")}
          className="bg-white rounded-xl shadow border"
        >
          {/* Category header */}
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
            onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
          >
            <span className="text-gray-400 cursor-grab" title="ドラッグで並び替え">&#9776;</span>
            <span className={`text-lg font-bold ${expandedCat === cat.id ? "text-blue-700" : "text-gray-800"}`}>
              {cat.name}
            </span>
            <span className="text-xs text-gray-400">({cat.skills.length}技)</span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">{cat.color}</span>
            <div className="flex-1" />
            <button
              onClick={(e) => { e.stopPropagation(); startEdit(cat.id, { name: cat.name, color: cat.color }); }}
              className="text-xs text-blue-500 hover:underline"
            >
              編集
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteItem("categories", cat.id, cat.name); }}
              className="text-xs text-red-500 hover:underline"
            >
              削除
            </button>
            <span className="text-gray-400">{expandedCat === cat.id ? "▲" : "▼"}</span>
          </div>

          {/* Category edit */}
          {editingId === cat.id && (
            <div className="px-4 pb-3 flex gap-2 items-end bg-yellow-50 border-t">
              <div>
                <label className="text-xs text-gray-500">名前</label>
                <input
                  value={editValue.name || ""}
                  onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                  className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">色キー</label>
                <select
                  value={editValue.color || ""}
                  onChange={(e) => setEditValue({ ...editValue, color: e.target.value })}
                  className="block border rounded px-2 py-1 text-sm text-gray-900"
                >
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => saveEdit("categories", cat.id)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">保存</button>
              <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400">キャンセル</button>
            </div>
          )}

          {/* Skills */}
          {expandedCat === cat.id && (
            <div className="border-t px-4 py-3 space-y-3">
              <button
                onClick={() => addSkill(cat.id, cat.skills.length)}
                className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium"
              >
                + 技を追加
              </button>

              {cat.skills.map((skill, skIdx) => (
                <div
                  key={skill.id}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); handleDragStart("skills", skill.id, skIdx); }}
                  onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, skIdx); }}
                  onDrop={(e) => { e.stopPropagation(); handleDrop(e, cat.skills, "skills"); }}
                  className="bg-gray-50 rounded-lg border"
                >
                  {/* Skill header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedSkill(expandedSkill === skill.id ? null : skill.id)}
                  >
                    <span className="text-gray-400 cursor-grab text-sm">&#9776;</span>
                    <span className="font-semibold text-gray-800 text-sm">{skill.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      skill.level === "b" ? "bg-green-100 text-green-700" :
                      skill.level === "m" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {skill.level === "b" ? "初級" : skill.level === "m" ? "中級" : "上級"}
                    </span>
                    <span className="text-xs text-gray-400">({skill.check_items.length}項目)</span>
                    <div className="flex-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(skill.id, {
                          name: skill.name,
                          level: skill.level,
                          hint: skill.hint,
                          description: skill.description,
                          skill_key: skill.skill_key,
                        });
                      }}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem("skills", skill.id, skill.name); }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      削除
                    </button>
                    <span className="text-gray-400 text-sm">{expandedSkill === skill.id ? "▲" : "▼"}</span>
                  </div>

                  {/* Skill edit */}
                  {editingId === skill.id && (
                    <div className="px-3 pb-3 bg-yellow-50 border-t space-y-2">
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <label className="text-xs text-gray-500">技キー</label>
                          <input
                            value={editValue.skill_key || ""}
                            onChange={(e) => setEditValue({ ...editValue, skill_key: e.target.value })}
                            className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">名前</label>
                          <input
                            value={editValue.name || ""}
                            onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                            className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">レベル</label>
                          <select
                            value={editValue.level || "b"}
                            onChange={(e) => setEditValue({ ...editValue, level: e.target.value })}
                            className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                          >
                            {levelOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">ヒント</label>
                          <input
                            value={editValue.hint || ""}
                            onChange={(e) => setEditValue({ ...editValue, hint: e.target.value })}
                            className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">説明</label>
                        <textarea
                          value={editValue.description || ""}
                          onChange={(e) => setEditValue({ ...editValue, description: e.target.value })}
                          className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit("skills", skill.id)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">保存</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400">キャンセル</button>
                      </div>
                    </div>
                  )}

                  {/* Check Items */}
                  {expandedSkill === skill.id && (
                    <div className="border-t px-3 py-2 space-y-2">
                      <button
                        onClick={() => addCheckItem(skill.id, skill.check_items.length)}
                        className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium"
                      >
                        + チェック項目を追加
                      </button>

                      {skill.check_items.map((ci, ciIdx) => (
                        <div
                          key={ci.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleDragStart("check_items", ci.id, ciIdx); }}
                          onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, ciIdx); }}
                          onDrop={(e) => { e.stopPropagation(); handleDrop(e, skill.check_items, "check_items"); }}
                          className="bg-white rounded border p-2"
                        >
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => setExpandedCheck(expandedCheck === ci.id ? null : ci.id)}
                          >
                            <span className="text-gray-400 cursor-grab text-xs">&#9776;</span>
                            <span className="text-sm text-gray-800 flex-1">{ci.label}</span>
                            {ci.video_url && <span className="text-xs text-gray-400">[動画]</span>}
                            <span className="text-xs text-gray-400">({(ci.check_sub_items || []).length})</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(ci.id, { label: ci.label, video_title: (ci as unknown as Record<string, string>).video_title || "", video_url: ci.video_url || "" });
                              }}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              編集
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteItem("check_items", ci.id, ci.label); }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              削除
                            </button>
                          </div>

                          {/* Check item edit */}
                          {editingId === ci.id && (
                            <div className="mt-2 p-2 bg-yellow-50 rounded space-y-2">
                              <div>
                                <label className="text-xs text-gray-500">ラベル</label>
                                <input
                                  value={editValue.label || ""}
                                  onChange={(e) => setEditValue({ ...editValue, label: e.target.value })}
                                  className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">動画タイトル</label>
                                <input
                                  value={editValue.video_title || ""}
                                  onChange={(e) => setEditValue({ ...editValue, video_title: e.target.value })}
                                  className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                                  placeholder="空欄でOK"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">動画URL</label>
                                <input
                                  value={editValue.video_url || ""}
                                  onChange={(e) => setEditValue({ ...editValue, video_url: e.target.value })}
                                  className="block w-full border rounded px-2 py-1 text-sm text-gray-900"
                                  placeholder="https://youtu.be/... または空欄"
                                />
                                {editValue.video_url && isYouTubeUrl(editValue.video_url) && (
                                  <div className="mt-2 rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                                    <iframe
                                      src={getYouTubeEmbedUrl(editValue.video_url)!}
                                      className="w-full h-full"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => saveEdit("check_items", ci.id)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">保存</button>
                                <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400">キャンセル</button>
                              </div>
                            </div>
                          )}

                          {/* Sub items */}
                          {expandedCheck === ci.id && (
                            <div className="mt-2 pl-4 space-y-1">
                              <button
                                onClick={() => addSubItem(ci.id, (ci.check_sub_items || []).length)}
                                className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 font-medium"
                              >
                                + 詳細項目を追加
                              </button>
                              {(ci.check_sub_items || []).map((sub, subIdx) => (
                                <div
                                  key={sub.id}
                                  draggable
                                  onDragStart={(e) => { e.stopPropagation(); handleDragStart("check_sub_items", sub.id, subIdx); }}
                                  onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, subIdx); }}
                                  onDrop={(e) => { e.stopPropagation(); handleDrop(e, ci.check_sub_items || [], "check_sub_items"); }}
                                  className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5"
                                >
                                  <span className="text-gray-400 cursor-grab text-xs">&#9776;</span>
                                  {editingId === sub.id ? (
                                    <div className="flex-1 flex gap-1">
                                      <input
                                        value={editValue.label || ""}
                                        onChange={(e) => setEditValue({ ...editValue, label: e.target.value })}
                                        className="flex-1 border rounded px-2 py-0.5 text-xs text-gray-900"
                                      />
                                      <button onClick={() => saveEdit("check_sub_items", sub.id)} className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">保存</button>
                                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 bg-gray-300 text-xs rounded">取消</button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs text-gray-700 flex-1">{sub.label}</span>
                                      <button
                                        onClick={() => startEdit(sub.id, { label: sub.label })}
                                        className="text-xs text-blue-500 hover:underline"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => deleteItem("check_sub_items", sub.id, sub.label)}
                                        className="text-xs text-red-500 hover:underline"
                                      >
                                        削除
                                      </button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          チェックリストデータがありません。seed SQLを実行してください。
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
