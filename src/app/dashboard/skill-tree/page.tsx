"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import SkillNode, { type NodeStatus } from "@/components/SkillNode";
import QuestBottomSheet from "@/components/QuestBottomSheet";
import { convertToChecklistData } from "@/lib/checklist-loader";
import { CHECKLIST_DATA, type ChecklistData, type Skill } from "@/lib/checklist-data";
import type { CheckStatus } from "@/lib/types";

// ===== Tree Data =====

interface SkillNodeDef {
  key: string;
  name: string;
  category: string;
  level: number;
  x: number;
  y: number;
  isTutorial?: boolean;
}

interface Edge {
  from: string;
  to: string;
  dashed?: boolean; // recommended (not required)
}

// ===== Tutorial Nodes (top) =====
const TUTORIAL_NODES: SkillNodeDef[] = [
  { key: "flexibility",         name: "柔軟",              category: "tutorial", level: 0, x: 0, y: 0, isTutorial: true },
  { key: "tutorial_handstand",  name: "倒立（チュートリアル）", category: "tutorial", level: 0, x: 1, y: 0, isTutorial: true },
];

// ===== Forward (前方系) =====
const FORWARD_NODES: SkillNodeDef[] = [
  { key: "maeten",           name: "前転",           category: "forward", level: 1, x: 0, y: 0 },
  { key: "kaikyaku_maeten",  name: "開脚前転",        category: "forward", level: 2, x: 0, y: 1 },
  { key: "tobikomi_maeten",  name: "飛び込み前転",    category: "forward", level: 3, x: 0, y: 2 },
  { key: "touritsu_maeten",  name: "倒立前転",        category: "forward", level: 3, x: 1, y: 2 },
  { key: "touritsu_bridge",  name: "倒立ブリッジ",    category: "forward", level: 4, x: 1, y: 3 },
  { key: "handspring",       name: "ハンドスプリング", category: "forward", level: 5, x: 0, y: 4 },
  { key: "maesou",           name: "前宙",           category: "forward", level: 7, x: 0, y: 5 },
  { key: "tensou",           name: "転宙",           category: "forward", level: 7, x: 1, y: 5 },
  { key: "maesou_hineri",    name: "前宙ひねり",      category: "forward", level: 10, x: 0, y: 6 },
];

const FORWARD_EDGES: Edge[] = [
  { from: "maeten", to: "kaikyaku_maeten" },
  { from: "maeten", to: "tobikomi_maeten" },
  { from: "maeten", to: "touritsu_maeten" },
  { from: "touritsu_maeten", to: "touritsu_bridge" },
  { from: "touritsu_bridge", to: "handspring" },
  { from: "tobikomi_maeten", to: "maesou" },
  { from: "handspring", to: "maesou" },
  { from: "maesou", to: "tensou" },
  { from: "maesou", to: "maesou_hineri" },
];

// ===== Side (側方系) =====
const SIDE_NODES: SkillNodeDef[] = [
  { key: "sokuten",          name: "側転",           category: "side", level: 3, x: 0, y: 0 },
  { key: "katate_sokuten",   name: "片手側転",        category: "side", level: 4, x: 0, y: 1 },
  { key: "roundoff",         name: "ロンダート",      category: "side", level: 6, x: 1, y: 1 },
  { key: "sokusou_aerial",   name: "側宙",           category: "side", level: 7, x: 0, y: 2 },
  { key: "roundoff_bakuten", name: "ロンバク転",      category: "side", level: 8, x: 1, y: 2 },
  { key: "roundoff_bakusou", name: "ロンバク宙",      category: "side", level: 8, x: 1, y: 3 },
];

const SIDE_EDGES: Edge[] = [
  { from: "sokuten", to: "katate_sokuten" },
  { from: "sokuten", to: "roundoff" },
  { from: "katate_sokuten", to: "sokusou_aerial" },
  { from: "roundoff", to: "roundoff_bakuten" },
  { from: "roundoff", to: "roundoff_bakusou" },
];

// ===== Backward (後方系) =====
const BACKWARD_NODES: SkillNodeDef[] = [
  { key: "bridge",           name: "ブリッジ",        category: "backward", level: 1, x: 0, y: 0 },
  { key: "kouten",           name: "後転",           category: "backward", level: 1, x: 1, y: 0 },
  { key: "wall_handstand",   name: "壁倒立",         category: "backward", level: 2, x: 2, y: 0 },
  { key: "kaikyaku_kouten",  name: "開脚後転",        category: "backward", level: 2, x: 1, y: 1 },
  { key: "haitouritsu",      name: "背倒立",          category: "backward", level: 3, x: 0, y: 1 },
  { key: "handstand",        name: "倒立",           category: "backward", level: 3, x: 2, y: 1 },
  { key: "kouten_touritsu",  name: "後転倒立",        category: "backward", level: 4, x: 1, y: 2 },
  { key: "kouhoutenkai",     name: "後方転回",        category: "backward", level: 5, x: 0, y: 3 },
  { key: "bakuten",          name: "バク転",         category: "backward", level: 7, x: 0, y: 4 },
  { key: "bakusou",          name: "バク宙",         category: "backward", level: 7, x: 1, y: 4 },
  { key: "renzoku_bakuten",  name: "連続バク転",      category: "backward", level: 8, x: 0, y: 5 },
  { key: "shinmi_tenkai",    name: "伸身宙返り",      category: "backward", level: 9,  x: 1, y: 5 },
  { key: "bakusou_hineri",   name: "バク宙ひねり",    category: "backward", level: 10, x: 1, y: 6 },
];

const BACKWARD_EDGES: Edge[] = [
  { from: "bridge", to: "haitouritsu" },
  { from: "bridge", to: "kouhoutenkai" },
  { from: "kouten", to: "kaikyaku_kouten" },
  { from: "kouten", to: "kouten_touritsu" },
  { from: "wall_handstand", to: "handstand" },
  { from: "handstand", to: "kouten_touritsu" },
  { from: "kouten_touritsu", to: "kouhoutenkai" },
  { from: "kouhoutenkai", to: "bakuten" },
  { from: "bakuten", to: "renzoku_bakuten" },
  { from: "bakusou", to: "shinmi_tenkai" },
  { from: "bakusou", to: "bakusou_hineri" },
];

// ===== Special =====
const SPECIAL_NODES: SkillNodeDef[] = [
  { key: "macaco",     name: "マカコ",         category: "special", level: 5, x: 0, y: 0 },
  { key: "gainer",     name: "ゲイナー",       category: "special", level: 5, x: 1, y: 0 },
  { key: "side_flip",  name: "サイドフリップ",  category: "special", level: 6, x: 2, y: 0 },
  { key: "helicopter", name: "ヘリコプテイロ",  category: "special", level: 7, x: 3, y: 0 },
  { key: "cork",       name: "コーク",         category: "special", level: 7, x: 4, y: 0 },
];

// All nodes combined for lookups
const ALL_NODES: SkillNodeDef[] = [
  ...TUTORIAL_NODES,
  ...FORWARD_NODES,
  ...SIDE_NODES,
  ...BACKWARD_NODES,
  ...SPECIAL_NODES,
];

// ===== Progress types =====

type ProgressEntry = { status: CheckStatus; rating: number | null };
type ProgressMap = Record<string, Record<number, Record<number, ProgressEntry>>>;

interface PrereqItem {
  skillKey: string;
  skillName: string;
  itemIndex: number;
  label: string;
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

function getSkillProgress(map: ProgressMap, checksCount: number, skillKey: string) {
  let done = 0;
  for (let i = 0; i < checksCount; i++) {
    if (getEntry(map, skillKey, i, -1).status === "done") done++;
  }
  return { done, total: checksCount };
}

function getAverageRating(map: ProgressMap, checksCount: number, skillKey: string): number | null {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < checksCount; i++) {
    const r = getEntry(map, skillKey, i, -1).rating;
    if (r !== null) { sum += r; count++; }
  }
  return count > 0 ? Math.round(sum / count) : null;
}

// ===== Confetti =====

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 40 }, (_, i) => i);
  const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#01a3a4", "#f368e0"];

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = 1.5 + Math.random() * 1.5;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 8;
        const rotation = Math.random() * 360;

        return (
          <div
            key={i}
            className="absolute animate-[confettiFall_var(--dur)_ease-out_var(--delay)_forwards]"
            style={{
              left: `${left}%`,
              top: "-5%",
              "--delay": `${delay}s`,
              "--dur": `${duration}s`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            } as React.CSSProperties}
          >
            <div
              style={{
                width: `${size}px`,
                height: `${size * 0.6}px`,
                backgroundColor: color,
                borderRadius: "2px",
                transform: `rotate(${rotation}deg)`,
              }}
            />
          </div>
        );
      })}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ===== XP Toast =====

function XpToast({ xp, visible }: { xp: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <motion.div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[110] text-center pointer-events-none"
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-2xl shadow-2xl">
        <div className="text-3xl font-black">+{xp} XP!</div>
      </div>
    </motion.div>
  );
}

// ===== Section Tree Renderer =====

function SectionTree({
  title,
  titleEmoji,
  titleColor,
  borderColor,
  nodes,
  edges,
  getNodeStatus,
  getNodeProgress,
  getNodeRating,
  selectedSkillKey,
  onNodeClick,
}: {
  title: string;
  titleEmoji: string;
  titleColor: string;
  borderColor: string;
  nodes: SkillNodeDef[];
  edges: Edge[];
  getNodeStatus: (key: string) => NodeStatus;
  getNodeProgress: (key: string) => { done: number; total: number };
  getNodeRating: (key: string) => number | null;
  selectedSkillKey: string | null;
  onNodeClick: (key: string) => void;
}) {
  const cellW = 120;
  const cellH = 80;
  const maxX = Math.max(...nodes.map(n => n.x));
  const maxY = Math.max(...nodes.map(n => n.y));
  const containerW = (maxX + 1) * cellW;
  const containerH = (maxY + 1) * cellH + 20;

  function renderEdge(edge: Edge, i: number) {
    const fromNode = nodes.find(n => n.key === edge.from);
    const toNode = nodes.find(n => n.key === edge.to);
    if (!fromNode || !toNode) return null;

    const offsetX = 55;
    const offsetY = 26;
    const x1 = fromNode.x * cellW + offsetX;
    const y1 = fromNode.y * cellH + offsetY + 20;
    const x2 = toNode.x * cellW + offsetX;
    const y2 = toNode.y * cellH + offsetY - 4;

    const fromStatus = getNodeStatus(fromNode.key);
    const toStatus = getNodeStatus(toNode.key);
    const bothDone = fromStatus === "completed" && toStatus === "completed";
    const active = fromStatus === "completed" || fromStatus === "in_progress";
    const isDashed = edge.dashed || (!active);

    return (
      <line
        key={i}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={bothDone ? "#22c55e" : active ? "#60a5fa" : "#d1d5db"}
        strokeWidth={bothDone ? "2.5" : "1.5"}
        strokeDasharray={isDashed ? "4 4" : undefined}
        markerEnd={`url(#arrow-${bothDone ? "green" : active ? "blue" : "gray"})`}
      />
    );
  }

  return (
    <div className={`bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm p-4 border ${borderColor}`}>
      <h4 className={`text-sm font-extrabold ${titleColor} mb-3 flex items-center gap-1.5`}>
        {titleEmoji} {title}
      </h4>
      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: `${containerW}px`, height: `${containerH}px` }}>
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="arrow-gray" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#d1d5db" />
              </marker>
              <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#60a5fa" />
              </marker>
              <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#22c55e" />
              </marker>
            </defs>
            {edges.map((edge, i) => renderEdge(edge, i))}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.key}
              className="absolute"
              style={{ left: `${node.x * cellW}px`, top: `${node.y * cellH}px` }}
            >
              <SkillNode
                name={node.name}
                level={node.level}
                category={node.category}
                status={getNodeStatus(node.key)}
                progress={getNodeProgress(node.key)}
                rating={getNodeRating(node.key)}
                isSelected={selectedSkillKey === node.key}
                isTutorial={node.isTutorial}
                onClick={() => onNodeClick(node.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== Main Page =====

export default function SkillTreePage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
  const [prereqMap, setPrereqMap] = useState<Record<string, PrereqItem[]>>({});
  const [skillChecksCount, setSkillChecksCount] = useState<Record<string, number>>({});

  // UI state
  const [selectedSkillKey, setSelectedSkillKey] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpToast, setXpToast] = useState<{ xp: number; visible: boolean }>({ xp: 0, visible: false });

  const router = useRouter();
  const supabase = createClient();

  // ===== Load data =====
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const [checklistRes, { data: progress }] = await Promise.all([
        fetch("/api/admin/checklist").then(r => r.json()),
        supabase
          .from("checklist_progress")
          .select("skill_id, item_index, sub_index, status, rating")
          .eq("user_id", user.id),
      ]);

      // Build checklist data
      const categories = checklistRes.data || [];
      let clData: ChecklistData;
      if (categories.length > 0) {
        clData = convertToChecklistData(categories);
      } else {
        clData = CHECKLIST_DATA;
      }
      setChecklistData(clData);

      // Skill checks count
      const countsMap: Record<string, number> = {};
      if (categories.length > 0) {
        for (const cat of categories) {
          for (const sk of cat.skills) {
            countsMap[sk.skill_key] = sk.check_items?.length ?? 0;
          }
        }
      } else {
        for (const cat of Object.values(CHECKLIST_DATA)) {
          for (const sk of cat.skills) {
            countsMap[sk.id] = sk.checks.length;
          }
        }
      }
      setSkillChecksCount(countsMap);

      // Progress
      setProgressMap(buildProgressMap(progress || []));

      // Prerequisites
      if (categories.length > 0) {
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

        const { data: prereqs } = await supabase
          .from("skill_prerequisites")
          .select("skill_id, required_check_item_id");

        if (prereqs && prereqs.length > 0) {
          const pMap: Record<string, PrereqItem[]> = {};
          for (const p of prereqs) {
            const targetKey = skillIdToKey[p.skill_id];
            const reqInfo = ciIdToInfo[p.required_check_item_id];
            if (!targetKey || !reqInfo) continue;
            if (!pMap[targetKey]) pMap[targetKey] = [];
            pMap[targetKey].push(reqInfo);
          }
          setPrereqMap(pMap);
        }
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Derived state =====

  const isSkillUnlocked = useCallback((skillKey: string): boolean => {
    const prereqs = prereqMap[skillKey];
    if (!prereqs || prereqs.length === 0) return true;
    return prereqs.every(
      (p) => getEntry(progressMap, p.skillKey, p.itemIndex, -1).status === "done"
    );
  }, [prereqMap, progressMap]);

  function getNodeStatus(key: string): NodeStatus {
    // Tutorial nodes are never locked
    const nodeDef = ALL_NODES.find(n => n.key === key);
    if (!nodeDef?.isTutorial && !isSkillUnlocked(key)) return "locked";
    const total = skillChecksCount[key] || 0;
    const prog = getSkillProgress(progressMap, total, key);
    if (prog.done > 0 && prog.done >= prog.total && prog.total > 0) return "completed";
    if (prog.done > 0) return "in_progress";
    return "not_started";
  }

  function getNodeProgress(key: string) {
    const total = skillChecksCount[key] || 0;
    return getSkillProgress(progressMap, total, key);
  }

  function getNodeRating(key: string) {
    const total = skillChecksCount[key] || 0;
    return getAverageRating(progressMap, total, key);
  }

  function findSkill(key: string): Skill | null {
    if (!checklistData) return null;
    for (const cat of Object.values(checklistData)) {
      const skill = cat.skills.find(s => s.id === key);
      if (skill) return skill;
    }
    return null;
  }

  // ===== Tutorial banner check =====
  const tutorialFlexStatus = getNodeStatus("flexibility");
  const tutorialHandstandStatus = getNodeStatus("tutorial_handstand");
  const showTutorialBanner = tutorialFlexStatus === "not_started" && tutorialHandstandStatus === "not_started";

  // ===== Handlers =====

  function handleNodeClick(key: string) {
    setSelectedSkillKey(key);
  }

  function handleAllClear(skillId: string) {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
    setXpToast({ xp: 50, visible: true });
    setTimeout(() => setXpToast({ xp: 0, visible: false }), 2500);
    void skillId;
  }

  // ===== Render =====

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto" />
          <p className="mt-4 text-sm text-purple-400 font-bold">クエストマップを読み込み中...</p>
        </div>
      </div>
    );
  }

  const selectedSkill = selectedSkillKey ? findSkill(selectedSkillKey) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      <Confetti active={showConfetti} />
      <AnimatePresence>
        {xpToast.visible && <XpToast xp={xpToast.xp} visible />}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/student" className="text-purple-600 hover:underline text-sm font-bold">
            ← ダッシュボード
          </Link>
          <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            ⚔️ クエストマップ
          </h2>
        </div>

        {/* Tutorial banner */}
        {showTutorialBanner && (
          <motion.div
            className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-4 mb-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">💪</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800 mb-1">
                  柔軟と倒立にもチャレンジしてみよう！
                </p>
                <p className="text-xs text-amber-600">
                  すべての技の土台になります。先にやっておくと上達が早くなるよ！
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setSelectedSkillKey("flexibility")}
                    className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition"
                  >
                    🧘 柔軟をやる
                  </button>
                  <button
                    onClick={() => setSelectedSkillKey("tutorial_handstand")}
                    className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition"
                  >
                    🤸 倒立をやる
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-5 text-xs">
          <div className="flex items-center gap-1.5">
            <span>📌</span>
            <span className="text-amber-600 font-bold">必修・推奨（先にやろう）</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🔒</span>
            <span className="text-gray-500 font-medium">ロック</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🔓</span>
            <span className="text-gray-500 font-medium">チャレンジ可能</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>⚡</span>
            <span className="text-gray-500 font-medium">進行中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>✅</span>
            <span className="text-gray-500 font-medium">クリア</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>⭐</span>
            <span className="text-gray-500 font-medium">星評価</span>
          </div>
        </div>

        {/* ===== Tutorial Section ===== */}
        <div className="mb-6">
          <div className="text-center mb-3">
            <h3 className="text-sm font-extrabold text-amber-600 flex items-center justify-center gap-1.5">
              📌 必修クエスト（最初にチャレンジしてみよう！）
            </h3>
          </div>
          <div className="flex justify-center gap-6 flex-wrap">
            {TUTORIAL_NODES.map((node) => (
              <SkillNode
                key={node.key}
                name={node.name}
                level={node.level}
                category={node.category}
                status={getNodeStatus(node.key)}
                progress={getNodeProgress(node.key)}
                rating={getNodeRating(node.key)}
                isSelected={selectedSkillKey === node.key}
                isTutorial
                onClick={() => handleNodeClick(node.key)}
              />
            ))}
          </div>
        </div>

        {/* Dashed separator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
          <span className="text-xs font-bold text-gray-400">推奨（点線 = アンロック条件ではない）</span>
          <div className="flex-1 border-t-2 border-dashed border-gray-300" />
        </div>

        {/* Section heading for 3 branches */}
        <div className="text-center mb-4">
          <h3 className="text-sm font-extrabold text-gray-600">3系統に分岐</h3>
        </div>

        {/* ===== 3-Column Layout ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Forward */}
          <SectionTree
            title="前方系"
            titleEmoji="🔵"
            titleColor="text-blue-600"
            borderColor="border-blue-200"
            nodes={FORWARD_NODES}
            edges={FORWARD_EDGES}
            getNodeStatus={getNodeStatus}
            getNodeProgress={getNodeProgress}
            getNodeRating={getNodeRating}
            selectedSkillKey={selectedSkillKey}
            onNodeClick={handleNodeClick}
          />

          {/* Side */}
          <SectionTree
            title="側方系"
            titleEmoji="🟣"
            titleColor="text-purple-600"
            borderColor="border-purple-200"
            nodes={SIDE_NODES}
            edges={SIDE_EDGES}
            getNodeStatus={getNodeStatus}
            getNodeProgress={getNodeProgress}
            getNodeRating={getNodeRating}
            selectedSkillKey={selectedSkillKey}
            onNodeClick={handleNodeClick}
          />

          {/* Backward */}
          <SectionTree
            title="後方系"
            titleEmoji="🟢"
            titleColor="text-teal-600"
            borderColor="border-teal-200"
            nodes={BACKWARD_NODES}
            edges={BACKWARD_EDGES}
            getNodeStatus={getNodeStatus}
            getNodeProgress={getNodeProgress}
            getNodeRating={getNodeRating}
            selectedSkillKey={selectedSkillKey}
            onNodeClick={handleNodeClick}
          />
        </div>

        {/* ===== Special Skills ===== */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-sm p-4 sm:p-6 border border-white/80 mb-32">
          <h3 className="text-sm font-extrabold text-amber-600 mb-4 flex items-center gap-1.5">
            ✨ スペシャルクエスト
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SPECIAL_NODES.map((node) => (
              <SkillNode
                key={node.key}
                name={node.name}
                level={node.level}
                category={node.category}
                status={getNodeStatus(node.key)}
                progress={getNodeProgress(node.key)}
                rating={getNodeRating(node.key)}
                isSelected={selectedSkillKey === node.key}
                onClick={() => handleNodeClick(node.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Sheet */}
      {selectedSkillKey && userId && (
        <QuestBottomSheet
          skill={selectedSkill}
          userId={userId}
          progressMap={progressMap}
          prereqMap={prereqMap}
          isLocked={!isSkillUnlocked(selectedSkillKey)}
          onProgressChange={setProgressMap}
          onClose={() => setSelectedSkillKey(null)}
          onAllClear={handleAllClear}
        />
      )}
    </div>
  );
}
