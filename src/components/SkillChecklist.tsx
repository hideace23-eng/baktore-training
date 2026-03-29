"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CHECKLIST_DATA,
  findSkill,
  getLevelInfo,
  getCategoryColor,
  type Skill,
  type CheckItem,
} from "@/lib/checklist-data";
import type { CheckStatus } from "@/lib/types";

type ProgressEntry = { status: CheckStatus; rating: number | null };
type ProgressMap = Record<string, Record<number, Record<number, ProgressEntry>>>;
// progressMap[skillId][itemIndex][subIndex] = { status, rating }
// subIndex -1 = main item

interface Props {
  userId: string;
  initialProgress: {
    skill_id: string;
    item_index: number;
    sub_index: number;
    status: CheckStatus;
    rating: number | null;
  }[];
}

function buildProgressMap(
  data: { skill_id: string; item_index: number; sub_index: number; status: CheckStatus; rating: number | null }[]
): ProgressMap {
  const map: ProgressMap = {};
  for (const row of data) {
    if (!map[row.skill_id]) map[row.skill_id] = {};
    if (!map[row.skill_id][row.item_index]) map[row.skill_id][row.item_index] = {};
    map[row.skill_id][row.item_index][row.sub_index] = { status: row.status, rating: row.rating };
  }
  return map;
}

function getEntry(map: ProgressMap, skillId: string, itemIndex: number, subIndex: number): ProgressEntry {
  return map[skillId]?.[itemIndex]?.[subIndex] || { status: "none", rating: null };
}

function getSkillProgress(map: ProgressMap, skill: Skill) {
  let done = 0;
  for (let i = 0; i < skill.checks.length; i++) {
    if (getEntry(map, skill.id, i, -1).status === "done") done++;
  }
  return { done, total: skill.checks.length };
}

export default function SkillChecklist({ userId, initialProgress }: Props) {
  const [progressMap, setProgressMap] = useState<ProgressMap>(() => buildProgressMap(initialProgress));
  const [view, setView] = useState<"home" | "skills" | "check">("home");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  function updateLocal(skillId: string, itemIndex: number, subIndex: number, patch: Partial<ProgressEntry>) {
    setProgressMap((prev) => {
      const next = { ...prev };
      if (!next[skillId]) next[skillId] = {};
      if (!next[skillId][itemIndex]) next[skillId][itemIndex] = {};
      const cur = next[skillId][itemIndex][subIndex] || { status: "none" as CheckStatus, rating: null };
      next[skillId][itemIndex] = { ...next[skillId][itemIndex], [subIndex]: { ...cur, ...patch } };
      return next;
    });
  }

  async function upsertStatus(skillId: string, itemIndex: number, subIndex: number, newStatus: CheckStatus) {
    const curRating = getEntry(progressMap, skillId, itemIndex, subIndex).rating;
    updateLocal(skillId, itemIndex, subIndex, { status: newStatus });

    if (newStatus === "none" && curRating === null) {
      await supabase
        .from("checklist_progress")
        .delete()
        .eq("user_id", userId)
        .eq("skill_id", skillId)
        .eq("item_index", itemIndex)
        .eq("sub_index", subIndex);
    } else {
      await supabase.from("checklist_progress").upsert(
        {
          user_id: userId,
          skill_id: skillId,
          item_index: itemIndex,
          sub_index: subIndex,
          status: newStatus,
          rating: curRating,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_id,item_index,sub_index" }
      );
    }
  }

  async function setRating(skillId: string, itemIndex: number, subIndex: number, newRating: number | null) {
    const cur = getEntry(progressMap, skillId, itemIndex, subIndex);
    updateLocal(skillId, itemIndex, subIndex, { rating: newRating });
    showToast(newRating ? `${"★".repeat(newRating)} 自己評価を保存` : "評価をリセット");

    await supabase.from("checklist_progress").upsert(
      {
        user_id: userId,
        skill_id: skillId,
        item_index: itemIndex,
        sub_index: subIndex,
        status: cur.status === "none" ? "none" : cur.status,
        rating: newRating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,skill_id,item_index,sub_index" }
    );
  }

  function cycleStatus(skillId: string, itemIndex: number, subIndex: number) {
    const cur = getEntry(progressMap, skillId, itemIndex, subIndex).status;
    const next: CheckStatus = cur === "none" ? "done" : cur === "done" ? "ren" : "none";
    upsertStatus(skillId, itemIndex, subIndex, next);
    if (next === "done") showToast("クリア!");
    if (next === "ren") showToast("要練習にマーク");
  }

  function togglePanel(key: string) {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Popular skills on home
  const popularSkills = [
    { id: "bakuten", icon: "\uD83D\uDD04", cat: "back" },
    { id: "bakusou", icon: "\uD83C\uDF00", cat: "back" },
    { id: "maesou", icon: "\u2B06\uFE0F", cat: "front" },
    { id: "roundoff", icon: "\u2194\uFE0F", cat: "side" },
    { id: "roundoff_bakuten", icon: "\uD83D\uDD25", cat: "back" },
    { id: "handstand", icon: "\uD83E\uDD38", cat: "base" },
  ];

  const selectedSkill = selectedSkillId ? findSkill(selectedSkillId) : null;

  // ========= RENDER =========

  // Home view
  if (view === "home") {
    return (
      <div className="space-y-6">
        {/* Popular Skills Grid */}
        <div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-3">
            やりたい技を選んでください
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {popularSkills.map(({ id, icon }) => {
              const found = findSkill(id);
              if (!found) return null;
              const { skill, catKey } = found;
              const colors = getCategoryColor(CHECKLIST_DATA[catKey].color);
              const level = getLevelInfo(skill.level);
              const prog = getSkillProgress(progressMap, skill);
              const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
              return (
                <button
                  key={id}
                  onClick={() => { setSelectedCat(catKey); setSelectedSkillId(id); setView("check"); }}
                  className={`bg-white rounded-xl p-4 border-2 ${colors.border} shadow-sm hover:shadow-md transition text-center`}
                >
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className={`text-base font-extrabold ${colors.text}`}>{skill.name}</div>
                  <div className="flex gap-1 justify-center mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.className}`}>
                      {level.label}
                    </span>
                  </div>
                  {pct > 0 && (
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category List */}
        <div>
          <div className="text-xs font-bold text-gray-400 tracking-wider mb-3">
            カテゴリから探す
          </div>
          <div className="space-y-2">
            {Object.entries(CHECKLIST_DATA).map(([catKey, cat]) => {
              const colors = getCategoryColor(cat.color);
              return (
                <button
                  key={catKey}
                  onClick={() => { setSelectedCat(catKey); setView("skills"); }}
                  className="w-full bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition text-left"
                >
                  <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800">{cat.name}</div>
                    <div className="text-xs text-gray-400">{cat.skills.length}技</div>
                  </div>
                  <span className="text-gray-300 text-lg">&rsaquo;</span>
                </button>
              );
            })}
          </div>
        </div>

        {toast && <Toast message={toast} />}
      </div>
    );
  }

  // Skills list view
  if (view === "skills" && selectedCat) {
    const cat = CHECKLIST_DATA[selectedCat];
    const colors = getCategoryColor(cat.color);
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView("home")}
          className="text-blue-600 hover:underline text-sm mb-2"
        >
          &larr; ホームに戻る
        </button>
        <h3 className="text-lg font-bold text-gray-800">{cat.name}</h3>
        {cat.skills.map((skill) => {
          const level = getLevelInfo(skill.level);
          const prog = getSkillProgress(progressMap, skill);
          const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
          return (
            <button
              key={skill.id}
              onClick={() => { setSelectedSkillId(skill.id); setView("check"); }}
              className="w-full bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition text-left"
            >
              <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-800">{skill.name}</div>
                <div className="text-xs text-gray-400">{skill.hint}</div>
                {pct > 0 && (
                  <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.className}`}>
                {level.label}
              </span>
              <span className="text-gray-300 text-lg">&rsaquo;</span>
            </button>
          );
        })}
        {toast && <Toast message={toast} />}
      </div>
    );
  }

  // Checklist view
  if (view === "check" && selectedSkill) {
    const { skill, catKey } = selectedSkill;
    const level = getLevelInfo(skill.level);
    const prog = getSkillProgress(progressMap, skill);
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    const allDone = prog.done === prog.total && prog.total > 0;

    return (
      <div className="space-y-3">
        <button
          onClick={() => selectedCat ? setView("skills") : setView("home")}
          className="text-blue-600 hover:underline text-sm"
        >
          &larr; {selectedCat ? "技一覧に戻る" : "ホームに戻る"}
        </button>

        {/* Skill Header */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-xl font-extrabold text-gray-800 mb-1">{skill.name}</div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${level.className}`}>
            {level.label}
          </span>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{skill.desc}</p>
          <div className="flex justify-between text-xs text-gray-500 mt-3 mb-1">
            <span>習得進捗</span>
            <span className="font-bold text-gray-800">{prog.done} / {prog.total} クリア</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 bg-white rounded-lg px-3 py-2 shadow-sm text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded border-2 border-gray-300" />
            <span>未チェック</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center text-[10px] font-bold">&check;</div>
            <span>クリア</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-orange-500 text-white flex items-center justify-center text-[10px] font-extrabold">練</div>
            <span>要練習</span>
          </div>
        </div>

        {/* All done */}
        {allDone && (
          <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-xl p-6 text-center text-white">
            <div className="text-4xl mb-2">{"\uD83C\uDF89"}</div>
            <div className="text-lg font-extrabold mb-1">全項目クリア!</div>
            <div className="text-xs opacity-85">
              {skill.name}の習得チェックリストをすべてクリアしました!<br />
              次の技にチャレンジしましょう。
            </div>
          </div>
        )}

        {/* Check Items */}
        {!allDone && (
          <div className="space-y-3">
            {skill.checks.map((ck, i) => (
              <CheckItemCard
                key={i}
                skillId={skill.id}
                itemIndex={i}
                check={ck}
                mainEntry={getEntry(progressMap, skill.id, i, -1)}
                subEntries={(idx: number) => getEntry(progressMap, skill.id, i, idx)}
                onCycleMain={() => cycleStatus(skill.id, i, -1)}
                onCycleSub={(si) => cycleStatus(skill.id, i, si)}
                onRateMain={(r) => setRating(skill.id, i, -1, r)}
                isOpen={openPanels[`${skill.id}-${i}`] || false}
                onToggle={() => togglePanel(`${skill.id}-${i}`)}
              />
            ))}
          </div>
        )}

        {toast && <Toast message={toast} />}
      </div>
    );
  }

  return null;
}

// ========= Sub Components =========

function CheckItemCard({
  skillId,
  itemIndex,
  check,
  mainEntry,
  subEntries,
  onCycleMain,
  onCycleSub,
  onRateMain,
  isOpen,
  onToggle,
}: {
  skillId: string;
  itemIndex: number;
  check: CheckItem;
  mainEntry: ProgressEntry;
  subEntries: (idx: number) => ProgressEntry;
  onCycleMain: () => void;
  onCycleSub: (si: number) => void;
  onRateMain: (rating: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const mainStatus = mainEntry.status;
  const isDone = mainStatus === "done";
  const hasSub = check.sub && check.sub.length > 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${isDone ? "opacity-55" : ""}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-3">
        <button
          onClick={onCycleMain}
          className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center flex-shrink-0 text-sm font-bold transition
            ${mainStatus === "done" ? "bg-green-500 border-green-500 text-white" :
              mainStatus === "ren" ? "bg-orange-500 border-orange-500 text-white text-xs" :
                "border-gray-300 bg-white text-gray-300"}`}
        >
          {mainStatus === "done" ? "\u2713" : mainStatus === "ren" ? "練" : ""}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
            {check.l}
          </div>
          <div className={`text-[10px] mt-0.5 font-bold ${
            mainStatus === "done" ? "text-green-500" :
            mainStatus === "ren" ? "text-orange-500" :
            "text-gray-300"
          }`}>
            {mainStatus === "done" ? "クリア済み" :
             mainStatus === "ren" ? "要練習 - 練習を続けましょう" :
             "タップしてチェック"}
          </div>
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="text-[10px] text-gray-400 font-medium">自己評価:</span>
        <StarRating value={mainEntry.rating} onChange={onRateMain} />
      </div>

      {/* Detail toggle */}
      {hasSub && (
        <>
          <button
            onClick={onToggle}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-t border-gray-100 transition
              ${isOpen ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-blue-500 hover:bg-blue-50"}`}
          >
            <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>&rsaquo;</span>
            <span>{isOpen ? "詳細チェックポイントを閉じる" : "詳細チェックポイントを見る"}</span>
            <span className="text-gray-400 ml-1">({check.sub.length}項目)</span>
          </button>

          {isOpen && (
            <div className="bg-gray-50 border-t border-gray-100 px-3 py-3 space-y-2">
              {check.v && (
                <div className="bg-gray-900 rounded-lg p-3 text-center mb-3">
                  <div className="text-xs text-gray-500 mb-1">VIDEO</div>
                  <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-1 text-white text-sm">
                    &#9654;
                  </div>
                  <div className="text-xs font-bold text-white">{check.v}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">動画準備中</div>
                </div>
              )}
              <div className="text-[10px] font-bold text-blue-600 tracking-wider mb-1">
                &#9660; 詳細チェックポイント
              </div>
              {check.sub.map((s, si) => {
                const se = subEntries(si);
                return (
                  <button
                    key={si}
                    onClick={() => onCycleSub(si)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg border transition text-left
                      ${se.status === "done" ? "opacity-60 border-green-200" :
                        se.status === "ren" ? "border-orange-200" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition
                        ${se.status === "done" ? "bg-green-500 border-green-500 text-white" :
                          se.status === "ren" ? "bg-orange-500 border-orange-500 text-white text-[10px]" :
                            "border-gray-300"}`}
                    >
                      {se.status === "done" ? "\u2713" : se.status === "ren" ? "練" : ""}
                    </div>
                    <span className={`text-xs font-medium ${se.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>
                      {s.l}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StarRating({ value, onChange }: { value: number | null; onChange: (r: number | null) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => {
            e.stopPropagation();
            onChange(value === star ? null : star);
          }}
          className="p-0.5 transition-transform hover:scale-110 active:scale-95"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={value !== null && star <= value ? "#f59e0b" : "none"}
            stroke={value !== null && star <= value ? "#f59e0b" : "#d1d5db"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 animate-fade-in">
      {message}
    </div>
  );
}
