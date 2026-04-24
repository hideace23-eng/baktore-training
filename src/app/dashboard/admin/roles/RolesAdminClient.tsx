"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  can_edit_checklist: boolean;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  admin: "管理者",
  teacher: "先生",
  student: "生徒",
};

export default function RolesAdminClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/roles");
    const json = await res.json();
    setUsers(json.data || []);
  }, []);

  useEffect(() => {
    fetchUsers().then(() => setLoading(false));
  }, [fetchUsers]);

  async function toggleChecklistEdit(userId: string, current: boolean) {
    setUpdating(userId);
    await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, canEditChecklist: !current }),
    });
    await fetchUsers();
    setUpdating(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-500">読み込み中...</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        チェックリスト編集権限を管理します。管理者は常に編集可能です。先生に編集権限を付与できます。
      </p>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">氏名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メール</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">役割</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">登録日</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                チェックリスト編集
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => {
              const isAdmin = u.role === "admin";
              const isTeacher = u.role === "teacher";
              const canToggle = isTeacher;

              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{u.full_name || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      isAdmin ? "bg-purple-100 text-purple-700" :
                      isTeacher ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isAdmin ? (
                      <span className="text-xs text-green-600 font-medium">常に有効</span>
                    ) : canToggle ? (
                      <button
                        onClick={() => toggleChecklistEdit(u.id, u.can_edit_checklist)}
                        disabled={updating === u.id}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          u.can_edit_checklist ? "bg-green-500" : "bg-gray-300"
                        } ${updating === u.id ? "opacity-50" : ""}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            u.can_edit_checklist ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
