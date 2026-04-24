"use client";

import { useState, useEffect, useCallback } from "react";
import type { Store } from "@/lib/types";

async function api(action: string, data?: Record<string, unknown>, id?: string) {
  const res = await fetch("/api/admin/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data, id }),
  });
  return res.json();
}

export default function StoresAdminClient() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", area: "", is_active: true });

  const reload = useCallback(async () => {
    const res = await fetch("/api/admin/stores");
    const json = await res.json();
    setStores(json.data || []);
  }, []);

  useEffect(() => { reload().then(() => setLoading(false)); }, [reload]);

  function resetForm() {
    setForm({ name: "", address: "", phone: "", area: "", is_active: true });
    setEditing(null);
  }

  async function handleSave() {
    if (!form.name) return;
    if (editing) {
      await api("update", form, editing);
    } else {
      await api("insert", form);
    }
    resetForm();
    await reload();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await api("delete", undefined, id);
    await reload();
  }

  function startEdit(store: Store) {
    setEditing(store.id);
    setForm({ name: store.name, address: store.address, phone: store.phone, area: store.area, is_active: store.is_active });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-800">{editing ? "店舗を編集" : "店舗を追加"}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 font-medium">店舗名</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">エリア</label>
            <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">住所</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">電話番号</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            {editing ? "更新" : "追加"}
          </button>
          {editing && <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg">キャンセル</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">店舗名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">エリア</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">住所</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stores.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.area}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.address}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.is_active ? "有効" : "無効"}
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => startEdit(s)} className="text-xs text-blue-500 hover:underline">編集</button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-xs text-red-500 hover:underline">削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
