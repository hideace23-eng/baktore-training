"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "@/lib/youtube";
import type { CheckStatus } from "@/lib/types";
import type { Skill, CheckItem } from "@/lib/checklist-data";

// ===== Types =====

type ProgressEntry = { status: CheckStatus; rating: number | null };
type ProgressMap = Record<string, Record<number, Record<number, ProgressEntry>>>;

interface PrereqItem {
  skillKey: string;
  skillName: string;
  itemIndex: number;
  label: string;
}

interface QuestBottomSheetProps {
  skill: Skill | null;
  userId: string;
  progressMap: ProgressMap;
  prereqMap: Record<string, PrereqItem[]>;
  isLocked: boolean;
  onProgressChange: (map: ProgressMap) => void;
  onClose: () => void;
  onAllClear: (skillId: string) => void;
  actorId?: string;
}

// ===== Helpers =====

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

// ===== Snap heights (vh) =====
const SNAP_CLOSED = 0;
const SNAP_HALF = 45;
const SNAP_FULL = 88;

function vhToPx(vh: number) {
  return (vh / 100) * (typeof window !== "undefined" ? window.innerHeight : 800);
}

// ===== Component =====

export default function QuestBottomSheet({
  skill,
  userId,
  progressMap,
  prereqMap,
  isLocked,
  onProgressChange,
  onClose,
  onAllClear,
  actorId,
}: QuestBottomSheetProps) {
  const supabase = createClient();
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [videoModal, setVideoModal] = useState<{ title: string; url: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [allClearCelebrated, setAllClearCelebrated] = useState(false);

  // Motion value: sheet height in px
  const sheetHeight = useMotionValue(0);
  const bgOpacity = useTransform(sheetHeight, [0, vhToPx(SNAP_HALF)], [0, 0.4]);

  // Snap logic
  const snapTo = useCallback((targetVh: number) => {
    const targetPx = vhToPx(targetVh);
    animate(sheetHeight, targetPx, { type: "spring", stiffness: 350, damping: 35 });
    if (targetVh === SNAP_CLOSED) {
      setTimeout(onClose, 300);
    }
  }, [sheetHeight, onClose]);

  // Open to half on mount / skill change
  useEffect(() => {
    if (skill) {
      setAllClearCelebrated(false);
      snapTo(SNAP_HALF);
    } else {
      snapTo(SNAP_CLOSED);
    }
  }, [skill, snapTo]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") snapTo(SNAP_CLOSED);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [snapTo]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ===== Drag handling =====
  function onDragEnd(_: unknown, info: PanInfo) {
    const currentH = sheetHeight.get();
    const velocity = info.velocity.y;
    const halfPx = vhToPx(SNAP_HALF);
    const fullPx = vhToPx(SNAP_FULL);

    // Fast swipe
    if (velocity > 500) {
      if (currentH > halfPx * 0.8) snapTo(SNAP_HALF);
      else snapTo(SNAP_CLOSED);
      return;
    }
    if (velocity < -500) {
      if (currentH < halfPx * 1.2) snapTo(SNAP_HALF);
      else snapTo(SNAP_FULL);
      return;
    }

    // Position-based snap
    const thresholdLow = halfPx * 0.35;
    const thresholdMid = (halfPx + fullPx) / 2;

    if (currentH < thresholdLow) snapTo(SNAP_CLOSED);
    else if (currentH < thresholdMid) snapTo(SNAP_HALF);
    else snapTo(SNAP_FULL);
  }

  // ===== Checklist interactions =====

  function updateLocal(skillId: string, itemIndex: number, subIndex: number, patch: Partial<ProgressEntry>) {
    const next = { ...progressMap };
    if (!next[skillId]) next[skillId] = {};
    if (!next[skillId][itemIndex]) next[skillId][itemIndex] = {};
    const cur = next[skillId][itemIndex][subIndex] || { status: "none" as CheckStatus, rating: null };
    next[skillId][itemIndex] = { ...next[skillId][itemIndex], [subIndex]: { ...cur, ...patch } };
    onProgressChange(next);
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
    if (isLocked) return;
    const cur = getEntry(progressMap, skillId, itemIndex, subIndex).status;
    const curRating = getEntry(progressMap, skillId, itemIndex, subIndex).rating;
    const next: CheckStatus = cur === "none" ? "done" : cur === "done" ? "ren" : "none";
    upsertStatus(skillId, itemIndex, subIndex, next);

    if (next === "done") {
      showToast("クリア!");
      const ratingForXp = curRating ?? 1;
      awardXp("check_clear", `${skillId}:${itemIndex}:${subIndex}`, ratingForXp);
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

  function handleAllClear() {
    if (!skill) return;
    awardXp("skill_complete", skill.id, 1);
    onAllClear(skill.id);
    setAllClearCelebrated(true);
  }

  if (!skill) return null;

  const prog = getSkillProgress(progressMap, skill);
  const allDone = prog.done === prog.total && prog.total > 0;
  const prereqs = prereqMap[skill.id] || [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black z-40 pointer-events-auto"
        style={{ opacity: bgOpacity }}
        onClick={() => snapTo(SNAP_CLOSED)}
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden pointer-events-auto"
        style={{ height: sheetHeight }}
      >
        {/* Drag handle */}
        <motion.div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          onDrag={(_, info) => {
            const delta = -info.delta.y;
            const next = Math.max(0, Math.min(vhToPx(SNAP_FULL + 5), sheetHeight.get() + delta));
            sheetHeight.set(next);
          }}
          onDragEnd={onDragEnd}
        >
          <div className="w-10 h-1.5 rounded-full bg-gray-300" />
        </motion.div>

        {/* Scrollable content */}
        <div ref={contentRef} className="overflow-y-auto px-4 pb-8" style={{ maxHeight: "calc(100% - 40px)" }}>
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{isLocked ? "\uD83D\uDD12" : allDone ? "\uD83C\uDF89" : "\u2694\uFE0F"}</span>
              <h3 className="text-lg font-extrabold text-gray-900">{skill.name}</h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Lv{skill.difficulty_level ?? 1}</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{skill.desc || skill.hint}</p>

            {/* Progress bar */}
            {!isLocked && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>クエスト進捗</span>
                  <span className="font-bold">{prog.done}/{prog.total}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${allDone ? "bg-gradient-to-r from-green-400 to-emerald-500" : "bg-gradient-to-r from-yellow-400 to-orange-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${prog.total > 0 ? (prog.done / prog.total) * 100 : 0}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Locked message */}
          {isLocked && (
            <div className="bg-gray-50 rounded-2xl p-5 text-center mb-4">
              <div className="text-3xl mb-2">{"\uD83D\uDD12"}</div>
              <p className="text-sm font-bold text-gray-600 mb-3">前提技をクリアしてください</p>
              <div className="space-y-2">
                {prereqs.map((p, i) => {
                  const done = getEntry(progressMap, p.skillKey, p.itemIndex, -1).status === "done";
                  return (
                    <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${done ? "bg-green-50 text-green-700" : "bg-white text-gray-500 border border-gray-200"}`}>
                      <span>{done ? "\u2705" : "\u2B1C"}</span>
                      <span className="font-medium">{p.skillName} - {p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Check items */}
          {!isLocked && (
            <div className="space-y-3">
              {skill.checks.map((ck, i) => (
                <QuestCheckItem
                  key={i}
                  check={ck}
                  mainEntry={getEntry(progressMap, skill.id, i, -1)}
                  subEntries={(idx: number) => getEntry(progressMap, skill.id, i, idx)}
                  onCycleMain={() => cycleStatus(skill.id, i, -1)}
                  onCycleSub={(si) => cycleStatus(skill.id, i, si)}
                  onRateMain={(r) => setRating(skill.id, i, -1, r)}
                  onPlayVideo={(title, url) => setVideoModal({ title, url })}
                />
              ))}

              {/* All Clear button */}
              {allDone && !allClearCelebrated && (
                <motion.button
                  onClick={handleAllClear}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-extrabold text-lg shadow-lg"
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {"\uD83C\uDF89"} すべてクリアした!
                </motion.button>
              )}

              {allClearCelebrated && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">{"\uD83C\uDFC6"}</div>
                  <p className="text-sm font-bold text-green-600">この技をマスターしました!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-[60] animate-[fadeIn_0.2s_ease-out]">
          {toast}
        </div>
      )}

      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-bold text-gray-800">{videoModal.title}</span>
              <button onClick={() => setVideoModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
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
                <div className="text-4xl mb-2">{"\uD83C\uDFAC"}</div>
                <p className="text-sm">動画準備中</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ===== Sub-components =====

function QuestCheckItem({
  check,
  mainEntry,
  subEntries,
  onCycleMain,
  onCycleSub,
  onRateMain,
  onPlayVideo,
}: {
  check: CheckItem;
  mainEntry: ProgressEntry;
  subEntries: (idx: number) => ProgressEntry;
  onCycleMain: () => void;
  onCycleSub: (si: number) => void;
  onRateMain: (rating: number | null) => void;
  onPlayVideo: (title: string, url: string) => void;
}) {
  const [showSub, setShowSub] = useState(false);
  const isDone = mainEntry.status === "done";
  const hasSub = check.sub && check.sub.length > 0;
  const hasVideo = !!check.vUrl && isYouTubeUrl(check.vUrl);

  return (
    <motion.div
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-colors ${
        isDone ? "border-green-200 bg-green-50/30" : mainEntry.status === "ren" ? "border-orange-200" : "border-gray-100"
      }`}
      layout
    >
      {/* Main item */}
      <button
        onClick={onCycleMain}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50 transition"
      >
        <motion.div
          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center flex-shrink-0 text-base font-bold transition ${
            isDone ? "bg-green-500 border-green-500 text-white" :
            mainEntry.status === "ren" ? "bg-orange-500 border-orange-500 text-white text-xs" :
            "border-gray-300 bg-gray-50 text-gray-300"
          }`}
          animate={isDone ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {isDone ? "\u2713" : mainEntry.status === "ren" ? "\u7DF4" : ""}
        </motion.div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-bold leading-snug ${isDone ? "line-through text-gray-400" : "text-gray-800"}`}>
            {check.l}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold ${
              isDone ? "text-green-500" : mainEntry.status === "ren" ? "text-orange-500" : "text-gray-300"
            }`}>
              {isDone ? "クリア済み" : mainEntry.status === "ren" ? "要練習" : "タップでチェック"}
            </span>
            {hasVideo && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlayVideo(check.v || "動画を見る", check.vUrl!); }}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
              >
                ▶ 動画
              </button>
            )}
          </div>
        </div>
      </button>

      {/* Star rating */}
      <div className="flex items-center gap-2 px-4 pb-2">
        <span className="text-[10px] text-gray-400 font-medium">自己評価:</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} onClick={(e) => { e.stopPropagation(); onRateMain(mainEntry.rating === star ? null : star); }}
              className="p-0.5 transition-transform hover:scale-110 active:scale-95">
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill={mainEntry.rating !== null && star <= mainEntry.rating ? "#f59e0b" : "none"}
                stroke={mainEntry.rating !== null && star <= mainEntry.rating ? "#f59e0b" : "#d1d5db"} strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Sub items toggle */}
      {hasSub && (
        <>
          <button
            onClick={() => setShowSub(!showSub)}
            className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border-t transition ${
              showSub ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-50 text-blue-500 hover:bg-blue-50 border-gray-100"
            }`}
          >
            <span className={`transition-transform ${showSub ? "rotate-90" : ""}`}>&rsaquo;</span>
            <span>{showSub ? "閉じる" : "詳細チェック"}</span>
            <span className="text-gray-400">({check.sub.length})</span>
          </button>

          {showSub && (
            <motion.div
              className="bg-gray-50 border-t border-gray-100 px-3 py-3 space-y-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
            >
              {check.sub.map((s, si) => {
                const se = subEntries(si);
                return (
                  <button key={si} onClick={() => onCycleSub(si)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl border-2 transition text-left active:scale-[0.98] ${
                      se.status === "done" ? "border-green-200 opacity-60" :
                      se.status === "ren" ? "border-orange-200" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition ${
                      se.status === "done" ? "bg-green-500 border-green-500 text-white" :
                      se.status === "ren" ? "bg-orange-500 border-orange-500 text-white text-[10px]" :
                      "border-gray-300"
                    }`}>
                      {se.status === "done" ? "\u2713" : se.status === "ren" ? "\u7DF4" : ""}
                    </div>
                    <span className={`text-xs font-medium ${se.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{s.l}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
