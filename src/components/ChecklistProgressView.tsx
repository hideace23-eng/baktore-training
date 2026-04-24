"use client";

import { useState } from "react";
import {
  CHECKLIST_DATA,
  findSkill,
  getLevelInfo,
  getCategoryColor,
} from "@/lib/checklist-data";
import type { CheckStatus } from "@/lib/types";

interface StudentProgress {
  user_id: string;
  full_name: string;
  email: string;
  skill_id: string;
  item_index: number;
  sub_index: number;
  status: CheckStatus;
  rating: number | null;
  updated_at: string;
}

interface Props {
  progressData: StudentProgress[];
  students: { id: string; full_name: string; email: string }[];
}

export default function ChecklistProgressView({ progressData, students }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  // Build per-student, per-skill summary
  const studentSkillMap = new Map<string, Map<string, { done: number; ren: number; total: number; ratingSum: number; ratingCount: number; lastUpdated: string }>>();

  for (const row of progressData) {
    if (row.sub_index !== -1) continue; // only count main items
    if (!studentSkillMap.has(row.user_id)) studentSkillMap.set(row.user_id, new Map());
    const skillMap = studentSkillMap.get(row.user_id)!;

    if (!skillMap.has(row.skill_id)) {
      const found = findSkill(row.skill_id);
      skillMap.set(row.skill_id, {
        done: 0,
        ren: 0,
        total: found ? found.skill.checks.length : 0,
        ratingSum: 0,
        ratingCount: 0,
        lastUpdated: row.updated_at,
      });
    }
    const entry = skillMap.get(row.skill_id)!;
    if (row.status === "done") entry.done++;
    if (row.status === "ren") entry.ren++;
    if (row.rating != null) { entry.ratingSum += row.rating; entry.ratingCount++; }
    if (row.updated_at > entry.lastUpdated) entry.lastUpdated = row.updated_at;
  }

  // Build display rows
  type DisplayRow = {
    userId: string;
    studentName: string;
    skillId: string;
    skillName: string;
    catKey: string;
    level: string;
    done: number;
    ren: number;
    total: number;
    pct: number;
    avgRating: number | null;
    lastUpdated: string;
  };

  const rows: DisplayRow[] = [];
  for (const student of students) {
    const skillMap = studentSkillMap.get(student.id);
    if (!skillMap) continue;
    for (const [skillId, stats] of skillMap) {
      const found = findSkill(skillId);
      if (!found) continue;
      rows.push({
        userId: student.id,
        studentName: student.full_name || student.email,
        skillId,
        skillName: found.skill.name,
        catKey: found.catKey,
        level: getLevelInfo(found.skill.level).label,
        done: stats.done,
        ren: stats.ren,
        total: stats.total,
        pct: stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0,
        avgRating: stats.ratingCount > 0 ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10 : null,
        lastUpdated: stats.lastUpdated,
      });
    }
  }

  // Filter
  const filtered = rows.filter((r) => {
    if (selectedStudent !== "all" && r.userId !== selectedStudent) return false;
    if (selectedCat !== "all" && r.catKey !== selectedCat) return false;
    return true;
  });

  // Sort by last updated desc
  filtered.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));

  // Summary stats
  const activeStudents = new Set(rows.map((r) => r.userId)).size;
  const totalChecks = rows.reduce((s, r) => s + r.done, 0);
  const fullCleared = rows.filter((r) => r.pct === 100).length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{activeStudents}</div>
          <div className="text-xs text-gray-500">学習中の生徒</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalChecks}</div>
          <div className="text-xs text-gray-500">クリア済み項目</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{fullCleared}</div>
          <div className="text-xs text-gray-500">技完全クリア</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 text-gray-700 bg-white"
        >
          <option value="all">全生徒</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name || s.email}
            </option>
          ))}
        </select>
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="text-sm border rounded-lg px-3 py-2 text-gray-700 bg-white"
        >
          <option value="all">全カテゴリ</option>
          {Object.entries(CHECKLIST_DATA).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          チェックリストの進捗データがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">生徒</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">技</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">レベル</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">進捗</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">自己評価</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最終更新</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((r) => {
                  const colors = getCategoryColor(CHECKLIST_DATA[r.catKey]?.color || "");
                  return (
                    <tr key={`${r.userId}-${r.skillId}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{r.studentName}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                          <span className="font-medium text-gray-800">{r.skillName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.level === "初級" ? "bg-green-100 text-green-700" :
                          r.level === "中級" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {r.level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${r.pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${r.pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{r.done}/{r.total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.avgRating !== null ? (
                          <div className="flex items-center gap-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                                  fill={s <= Math.round(r.avgRating!) ? "#f59e0b" : "none"}
                                  stroke={s <= Math.round(r.avgRating!) ? "#f59e0b" : "#d1d5db"}
                                  strokeWidth="2"
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-500">{r.avgRating}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {r.done > 0 && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                              {r.done}クリア
                            </span>
                          )}
                          {r.ren > 0 && (
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">
                              {r.ren}要練習
                            </span>
                          )}
                          {r.pct === 100 && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                              完全クリア
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(r.lastUpdated).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
