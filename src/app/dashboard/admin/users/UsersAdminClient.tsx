"use client";

import { useState, useEffect, useCallback } from "react";

interface UserWithStore {
  id: string;
  email: string;
  full_name: string;
  role: string;
  store_id: string | null;
  is_gold_member: boolean;
  can_edit_checklist: boolean;
  created_at: string;
  stores: { name: string } | null;
}

interface Store {
  id: string;
  name: string;
}

const roleLabels: Record<string, string> = {
  super_admin: "システム管理者",
  admin: "店長",
  teacher: "先生",
  student: "生徒",
  guest: "ゲスト",
};

const roleOptions = ["guest", "student", "teacher", "admin", "super_admin"];

export default function UsersAdminClient() {
  const [users, setUsers] = useState<UserWithStore[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStore, setFilterStore] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("teacher");
  const [inviteUrl, setInviteUrl] = useState("");

  const reload = useCallback(async () => {
    const [usersRes, storesRes] = await Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/stores").then((r) => r.json()),
    ]);
    setUsers(usersRes.data || []);
    setStores(storesRes.data || []);
  }, []);

  useEffect(() => { reload().then(() => setLoading(false)); }, [reload]);

  async function changeRole(targetUserId: string, role: string) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_role", targetUserId, role }),
    });
    await reload();
  }

  async function toggleGold(targetUserId: string, current: boolean) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_gold", targetUserId, isGold: !current }),
    });
    await reload();
  }

  async function changeStore(targetUserId: string, storeId: string) {
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_store", targetUserId, storeId: storeId || null }),
    });
    await reload();
  }

  async function handleInvite() {
    if (!inviteEmail) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invite", email: inviteEmail, role: inviteRole }),
    });
    const json = await res.json();
    if (json.inviteUrl) {
      setInviteUrl(window.location.origin + json.inviteUrl);
      setInviteEmail("");
    }
  }

  const filtered = users.filter((u) => {
    if (filterStore !== "all" && u.store_id !== filterStore) return false;
    if (filterRole !== "all" && u.role !== filterRole) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 招待セクション */}
      <div className="bg-white rounded-xl shadow p-4">
        <button onClick={() => setShowInvite(!showInvite)}
          className="text-sm font-medium text-blue-600 hover:underline">
          {showInvite ? "招待フォームを閉じる" : "+ ユーザーを招待"}
        </button>

        {showInvite && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-gray-500">メールアドレス</label>
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900" placeholder="user@example.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500">ロール</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm text-gray-900">
                  <option value="teacher">先生</option>
                  <option value="admin">店長</option>
                </select>
              </div>
              <button onClick={handleInvite} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                招待リンク生成
              </button>
            </div>
            {inviteUrl && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-700 font-medium mb-1">招待リンク（7日間有効）:</p>
                <div className="flex gap-2">
                  <input value={inviteUrl} readOnly className="flex-1 text-xs bg-white border rounded px-2 py-1 text-gray-900" />
                  <button onClick={() => { navigator.clipboard.writeText(inviteUrl); }}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">コピー</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* フィルタ */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 text-gray-700 bg-white">
          <option value="all">全ロール</option>
          {roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
        </select>
        <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 text-gray-700 bg-white">
          <option value="all">全店舗</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-sm text-gray-500 self-center">{filtered.length}件</span>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">氏名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ロール</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">店舗</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Gold</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{u.full_name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1 text-gray-700">
                      {roleOptions.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.store_id || ""} onChange={(e) => changeStore(u.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1 text-gray-700">
                      <option value="">未設定</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleGold(u.id, u.is_gold_member)}
                      className={`text-xs px-2 py-1 rounded-full font-bold transition ${
                        u.is_gold_member ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-400"
                      }`}>
                      {u.is_gold_member ? "Gold" : "-"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
