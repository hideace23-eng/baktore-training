"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CHECKLIST_DATA,
  getLevelInfo,
  getCategoryColor,
  type ChecklistData,
  type Skill,
  type CheckItem,
} from "@/lib/checklist-data";
import { convertToChecklistData } from "@/lib/checklist-loader";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "@/lib/youtube";
import LockedSkillPanel, { type PrereqStatus } from "@/components/LockedSkillPanel";
import type { CheckStatus } from "@/lib/types";

type ProgressEntry = { status: CheckStatus; rating: number | null };
type ProgressMap = Record<string, Record<number, Record<number, ProgressEntry>>>;

interface PrereqItem {
  skillKey: string;
  skillName: string;
  itemIndex: number;
  label: string;
}

interface Props {
  userId: string;
  initialProgress: {
    skill_id: string;
    item_index: number;
    sub_index: number;
    status: CheckStatus;
    rating: number | null;
  }[];
  actorId?: string;
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

function findSkillInData(data: ChecklistData, skillId: string): { skill: Skill; catKey: string } | null {
  for (const [catKey, cat] of Object.entries(data)) {
    const skill = cat.skills.find((s) => s.id === skillId);
    if (skill) return { skill, catKey };
  }
  return null;
}

export default function SkillChecklist({ userId, initialProgress, actorId }: Props) {
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<ProgressMap>(() => buildProgressMap(initialProgress));
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [videoModal, setVideoModal] = useState<{ title: string; url: string } | null>(null);
  const [prereqMap, setPrereqMap] = useState<Record<string, PrereqItem[]>>({});

  // Track previous unlock state for unlock toast detection
  const prevUnlockRef = useRef<Record<string, boolean>>({});

  const supabase = createClient();

  useEffect(() => {
    async function loadChecklist() {
      try {
        const res = await fetch("/api/admin/checklist");
        const json = await res.json();
        const categories = json.data || [];

        if (categories.length > 0) {
          const data = convertToChecklistData(categories);
          setChecklistData(data);

          // default_expanded
          const initialExpanded: Record<string, boolean> = {};
          for (const cat of Object.values(data)) {
            for (const skill of cat.skills) {
              if (skill.default_expanded) initialExpanded[skill.id] = true;
            }
          }
          setExpandedSkills(initialExpanded);
          const firstKey = Object.keys(data)[0];
          if (firstKey) setExpandedCats({ [firstKey]: true });

          // Build prerequisite map from DB
          await loadPrerequisites(categories);
        } else {
          setChecklistData(CHECKLIST_DATA);
          const firstKey = Object.keys(CHECKLIST_DATA)[0];
          if (firstKey) setExpandedCats({ [firstKey]: true });
        }
      } catch {
        setChecklistData(CHECKLIST_DATA);
        const firstKey = Object.keys(CHECKLIST_DATA)[0];
        if (firstKey) setExpandedCats({ [firstKey]: true });
      } finally {
        setDataLoading(false);
      }
    }

    async function loadPrerequisites(categories: Array<{ skills: Array<{ id: string; skill_key: string; name: string; check_items: Array<{ id: string; label: string; order_index: number }> }> }>) {
      // Build maps from raw data
      const skillIdToKey: Record<string, string> = {};
      const skillIdToName: Record<string, string> = {};
      const ciIdToInfo: Record<string, { skillKey: string; skillName: string; itemIndex: number; label: string }> = {};

      for (const cat of categories) {
        for (const sk of cat.skills) {
          skillIdToKey[sk.id] = sk.skill_key;
          skillIdToName[sk.id] = sk.name;
          for (const ci of sk.check_items) {
            ciIdToInfo[ci.id] = {
              skillKey: sk.skill_key,
              skillName: sk.name,
              itemIndex: ci.order_index,
              label: ci.label,
            };
          }
        }
      }

      const { data: prereqs, error: prereqError } = await supabase
        .from("skill_prerequisites")
        .select("skill_id, required_check_item_id");

      if (prereqError || !prereqs || prereqs.length === 0) return;

      const map: Record<string, PrereqItem[]> = {};
      for (const p of prereqs) {
        const targetKey = skillIdToKey[p.skill_id];
        const reqInfo = ciIdToInfo[p.required_check_item_id];
        if (!targetKey || !reqInfo) continue;
        if (!map[targetKey]) map[targetKey] = [];
        map[targetKey].push(reqInfo);
      }
      setPrereqMap(map);
    }

    loadChecklist();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && videoModal) setVideoModal(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoModal]);

  // Detect newly unlocked skills
  useEffect(() => {
    if (!checklistData || Object.keys(prereqMap).length === 0) return;

    const currentUnlock: Record<string, boolean> = {};
    for (const skillKey of Object.keys(prereqMap)) {
      currentUnlock[skillKey] = isSkillUnlocked(skillKey);
    }

    // Compare with previous
    for (const [key, unlocked] of Object.entries(currentUnlock)) {
      if (unlocked && prevUnlockRef.current[key] === false) {
        const found = findSkillInData(checklistData, key);
        if (found) {
          showToast(`🎉 ${found.skill.name} がアンロックされました!`);
        }
      }
    }

    prevUnlockRef.current = currentUnlock;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressMap, prereqMap]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  function isSkillUnlocked(skillKey: string): boolean {
    const prereqs = prereqMap[skillKey];
    if (!prereqs || prereqs.length === 0) return true;
    return prereqs.every(
      (p) => getEntry(progressMap, p.skillKey, p.itemIndex, -1).status === "done"
    );
  }

  function getPrereqStatuses(skillKey: string): PrereqStatus[] {
    const prereqs = prereqMap[skillKey];
    if (!prereqs) return [];
    return prereqs.map((p) => ({
      skillName: p.skillName,
      label: p.label,
      done: getEntry(progressMap, p.skillKey, p.itemIndex, -1).status === "done",
    }));
  }

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
      await supabase.from("checklist_progress").delete()
        .eq("user_id", userId).eq("skill_id", skillId).eq("item_index", itemIndex).eq("sub_index", subIndex);
    } else {
      await supabase.from("checklist_progress").upsert({
        user_id: userId, skill_id: skillId, item_index: itemIndex, sub_index: subIndex,
        status: newStatus, rating: curRating, updated_at: new Date().toISOString(),
        ...(actorId ? { updated_by_user_id: actorId } : {}),
      }, { onConflict: "user_id,skill_id,item_index,sub_index" });
    }
  }

  async function setRating(skillId: string, itemIndex: number, subIndex: number, newRating: number | null) {
    const cur = getEntry(progressMap, skillId, itemIndex, subIndex);
    updateLocal(skillId, itemIndex, subIndex, { rating: newRating });
    showToast(newRating ? `${"★".repeat(newRating)} 自己評価を保存` : "評価をリセット");

    await supabase.from("checklist_progress").upsert({
      user_id: userId, skill_id: skillId, item_index: itemIndex, sub_index: subIndex,
      status: cur.status === "none" ? "none" : cur.status, rating: newRating, updated_at: new Date().toISOString(),
      ...(actorId ? { updated_by_user_id: actorId } : {}),
    }, { onConflict: "user_id,skill_id,item_index,sub_index" });

    if (newRating === 5) {
      awardXp("star_5_eval", `${skillId}:${itemIndex}:${subIndex}`, newRating);
    }
  }

  function cycleStatus(skillId: string, itemIndex: number, subIndex: number) {
    // Block if skill is locked
    if (!isSkillUnlocked(skillId)) return;

    const cur = getEntry(progressMap, skillId, itemIndex, subIndex).status;
    const curRating = getEntry(progressMap, skillId, itemIndex, subIndex).rating;
    const next: CheckStatus = cur === "none" ? "done" : cur === "done" ? "ren" : "none";
    upsertStatus(skillId, itemIndex, subIndex, next);
    if (next === "done") {
      showToast("クリア!");
      const ratingForXp = curRating ?? 1;
      awardXp("check_clear", `${skillId}:${itemIndex}:${subIndex}`, ratingForXp);
      if (checklistData) {
        const found = findSkillInData(checklistData, skillId);
        if (found) {
          const updatedMap = { ...progressMap };
          if (!updatedMap[skillId]) updatedMap[skillId] = {};
          if (!updatedMap[skillId][itemIndex]) updatedMap[skillId][itemIndex] = {};
          updatedMap[skillId][itemIndex][subIndex] = { ...getEntry(updatedMap, skillId, itemIndex, subIndex), status: "done" };
          const prog = getSkillProgress(updatedMap, found.skill);
          if (prog.done === prog.total && prog.total > 0) {
            awardXp("skill_complete", skillId, ratingForXp);
          }
        }
      }
    }
    if (next === "ren") showToast("要練習にマーク");
  }

  function awardXp(action: string, resourceId: string, rating: number = 1) {
    fetch("/api/xp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, resourceId, rating, ...(actorId ? { triggeredByUserId: actorId } : {}) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.xp > 0) {
          window.dispatchEvent(new CustomEvent("xp-gained", { detail: data }));
        }
      })
      .catch(() => {});
  }

  function toggleCat(key: string) {
    setExpandedCats((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSkill(skillId: string) {
    setExpandedSkills((prev) => ({ ...prev, [skillId]: !prev[skillId] }));
  }

  function togglePanel(key: string) {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
        <p className="mt-4 text-sm text-gray-500">チェックリストを読み込み中...</p>
      </div>
    );
  }

  if (!checklistData) return null;

  const DATA = checklistData;

  return (
    <div className="space-y-3">
      {Object.entries(DATA).map(([catKey, cat]) => {
        const colors = getCategoryColor(cat.color);
        const isExpanded = expandedCats[catKey] ?? false;
        const catDone = cat.skills.reduce((sum, sk) => sum + getSkillProgress(progressMap, sk).done, 0);
        const catTotal = cat.skills.reduce((sum, sk) => sum + getSkillProgress(progressMap, sk).total, 0);

        return (
          <div key={catKey} className="rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleCat(catKey)}
              className="w-full bg-white px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition text-left"
            >
              <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-800">{cat.name}</div>
                <div className="text-xs text-gray-400">
                  {cat.skills.length}技 / {catDone}/{catTotal} クリア
                </div>
              </div>
              <span className={`text-gray-400 text-lg transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                &rsaquo;
              </span>
            </button>

            {isExpanded && (
              <div className="bg-gray-50 border-t border-gray-100">
                {cat.skills.map((skill) => {
                  const level = getLevelInfo(skill.level);
                  const prog = getSkillProgress(progressMap, skill);
                  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                  const isSkillOpen = expandedSkills[skill.id] ?? false;
                  const allDone = prog.done === prog.total && prog.total > 0;
                  const diffLv = skill.difficulty_level ?? 1;
                  const unlocked = isSkillUnlocked(skill.id);
                  const hasPrereqs = (prereqMap[skill.id]?.length ?? 0) > 0;

                  return (
                    <div key={skill.id} className="border-b border-gray-100 last:border-b-0">
                      <button
                        onClick={() => toggleSkill(skill.id)}
                        className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/50 transition text-left ${!unlocked ? "opacity-60" : ""}`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full ${allDone ? "bg-green-500" : !unlocked ? "bg-gray-300" : colors.dot} ${allDone || !unlocked ? "" : "opacity-40"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!unlocked && <span className="text-xs">🔒</span>}
                            <span className="text-sm font-bold text-gray-800">{skill.name}</span>
                            {allDone && <span className="text-xs text-green-600">&#10003;</span>}
                            {unlocked && hasPrereqs && <span className="text-[10px] text-green-500 font-bold">🔓</span>}
                          </div>
                          <div className="text-xs text-gray-400">{skill.hint}</div>
                          {pct > 0 && (
                            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                              <div className={`h-full ${allDone ? "bg-green-500" : colors.bar} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-gray-400 font-medium">Lv{diffLv}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${level.className}`}>{level.label}</span>
                          <span className={`text-gray-400 text-lg transition-transform ${isSkillOpen ? "rotate-90" : ""}`}>&rsaquo;</span>
                        </div>
                      </button>

                      {isSkillOpen && (
                        <div className="bg-white px-4 py-3 space-y-2">
                          {/* Locked panel */}
                          {!unlocked && (
                            <LockedSkillPanel
                              skillName={skill.name}
                              prerequisites={getPrereqStatuses(skill.id)}
                            />
                          )}

                          {/* Progress summary */}
                          {unlocked && (
                            <>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>習得進捗</span>
                                <span className="font-bold text-gray-800">{prog.done} / {prog.total} クリア</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>

                              {allDone && (
                                <div className="bg-gradient-to-br from-green-600 to-green-500 rounded-xl p-4 text-center text-white mb-3">
                                  <div className="text-2xl mb-1">{"\uD83C\uDF89"}</div>
                                  <div className="text-sm font-extrabold">全項目クリア!</div>
                                </div>
                              )}

                              {skill.checks.map((ck, i) => (
                                <CheckItemCard
                                  key={i}
                                  check={ck}
                                  mainEntry={getEntry(progressMap, skill.id, i, -1)}
                                  subEntries={(idx: number) => getEntry(progressMap, skill.id, i, idx)}
                                  onCycleMain={() => cycleStatus(skill.id, i, -1)}
                                  onCycleSub={(si) => cycleStatus(skill.id, i, si)}
                                  onRateMain={(r) => setRating(skill.id, i, -1, r)}
                                  isOpen={openPanels[`${skill.id}-${i}`] || false}
                                  onToggle={() => togglePanel(`${skill.id}-${i}`)}
                                  onPlayVideo={(title, url) => setVideoModal({ title, url })}
                                />
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {toast && <Toast message={toast} />}

      {/* YouTube modal */}
      {videoModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setVideoModal(null)}>
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-bold text-gray-800">{videoModal.title}</span>
              <button onClick={() => setVideoModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            {getYouTubeEmbedUrl(videoModal.url) ? (
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src={getYouTubeEmbedUrl(videoModal.url)!}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm">動画準備中</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========= Sub Components =========

function CheckItemCard({
  check,
  mainEntry,
  subEntries,
  onCycleMain,
  onCycleSub,
  onRateMain,
  isOpen,
  onToggle,
  onPlayVideo,
}: {
  check: CheckItem;
  mainEntry: ProgressEntry;
  subEntries: (idx: number) => ProgressEntry;
  onCycleMain: () => void;
  onCycleSub: (si: number) => void;
  onRateMain: (rating: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  onPlayVideo: (title: string, url: string) => void;
}) {
  const mainStatus = mainEntry.status;
  const isDone = mainStatus === "done";
  const hasSub = check.sub && check.sub.length > 0;
  const videoUrl = check.vUrl;
  const videoTitle = check.v || "動画を見る";
  const hasVideo = !!videoUrl && isYouTubeUrl(videoUrl);

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 ${isDone ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-3 px-3 py-3">
        <button onClick={onCycleMain}
          className={`w-9 h-9 rounded-lg border-2 flex items-center justify-center flex-shrink-0 text-sm font-bold transition
            ${mainStatus === "done" ? "bg-green-500 border-green-500 text-white" :
              mainStatus === "ren" ? "bg-orange-500 border-orange-500 text-white text-xs" :
                "border-gray-300 bg-white text-gray-300"}`}>
          {mainStatus === "done" ? "\u2713" : mainStatus === "ren" ? "練" : ""}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-semibold leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
              {check.l}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-bold ${
              mainStatus === "done" ? "text-green-500" :
              mainStatus === "ren" ? "text-orange-500" : "text-gray-300"
            }`}>
              {mainStatus === "done" ? "クリア済み" :
               mainStatus === "ren" ? "要練習" : "タップしてチェック"}
            </span>
            {hasVideo && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlayVideo(videoTitle, videoUrl!); }}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
              >
                ▶ 動画を見る
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="text-[10px] text-gray-400 font-medium">自己評価:</span>
        <StarRating value={mainEntry.rating} onChange={onRateMain} />
      </div>

      {hasSub && (
        <>
          <button onClick={onToggle}
            className={`w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold border-t border-gray-100 transition
              ${isOpen ? "bg-blue-50 text-blue-700" : "bg-gray-50 text-blue-500 hover:bg-blue-50"}`}>
            <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>&rsaquo;</span>
            <span>{isOpen ? "閉じる" : "詳細"}</span>
            <span className="text-gray-400">({check.sub.length})</span>
          </button>

          {isOpen && (
            <div className="bg-gray-50 border-t border-gray-100 px-3 py-3 space-y-2">
              <div className="text-[10px] font-bold text-blue-600 tracking-wider mb-1">詳細チェック</div>
              {check.sub.map((s, si) => {
                const se = subEntries(si);
                return (
                  <button key={si} onClick={() => onCycleSub(si)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-lg border transition text-left
                      ${se.status === "done" ? "opacity-60 border-green-200" :
                        se.status === "ren" ? "border-orange-200" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition
                        ${se.status === "done" ? "bg-green-500 border-green-500 text-white" :
                          se.status === "ren" ? "bg-orange-500 border-orange-500 text-white text-[10px]" :
                            "border-gray-300"}`}>
                      {se.status === "done" ? "\u2713" : se.status === "ren" ? "練" : ""}
                    </div>
                    <span className={`text-xs font-medium ${se.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{s.l}</span>
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
        <button key={star} onClick={(e) => { e.stopPropagation(); onChange(value === star ? null : star); }}
          className="p-0.5 transition-transform hover:scale-110 active:scale-95">
          <svg width="18" height="18" viewBox="0 0 24 24"
            fill={value !== null && star <= value ? "#f59e0b" : "none"}
            stroke={value !== null && star <= value ? "#f59e0b" : "#d1d5db"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50 animate-toast-in">
      {message}
    </div>
  );
}
