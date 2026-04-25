"use client";

import { motion } from "framer-motion";

export type NodeStatus = "locked" | "not_started" | "in_progress" | "completed";

interface SkillNodeProps {
  name: string;
  level: number;
  category: string;
  status: NodeStatus;
  progress: { done: number; total: number };
  rating: number | null;
  isSelected: boolean;
  isTutorial?: boolean;
  onClick: () => void;
}

const CAT_COLORS: Record<string, { ring: string; glow: string }> = {
  base:     { ring: "ring-purple-400", glow: "shadow-purple-300/50" },
  front:    { ring: "ring-blue-400",   glow: "shadow-blue-300/50" },
  forward:  { ring: "ring-blue-400",   glow: "shadow-blue-300/50" },
  back:     { ring: "ring-red-400",    glow: "shadow-red-300/50" },
  backward: { ring: "ring-teal-400",   glow: "shadow-teal-300/50" },
  side:     { ring: "ring-purple-400", glow: "shadow-purple-300/50" },
  combo:    { ring: "ring-pink-400",   glow: "shadow-pink-300/50" },
  special:  { ring: "ring-amber-400",  glow: "shadow-amber-300/50" },
  tutorial: { ring: "ring-amber-400",  glow: "shadow-amber-300/50" },
};

function getStatusEmoji(status: NodeStatus): string {
  switch (status) {
    case "locked":      return "\uD83D\uDD12";
    case "not_started": return "\uD83D\uDD13";
    case "in_progress": return "\u26A1";
    case "completed":   return "\u2705";
  }
}

function Stars({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="flex gap-px justify-center mt-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`text-[8px] ${i < count ? "text-yellow-400" : "text-gray-300"}`}>
          {"\u2B50"}
        </span>
      ))}
    </div>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const pct = done / total;
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <svg width="34" height="34" className="absolute -top-1.5 -right-1.5">
      <circle cx="17" cy="17" r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle
        cx="17" cy="17" r={r} fill="none"
        stroke={pct >= 1 ? "#22c55e" : "#f59e0b"}
        strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 17 17)"
        className="transition-all duration-500"
      />
    </svg>
  );
}

export default function SkillNode({
  name, level, category, status, progress, rating, isSelected, isTutorial, onClick,
}: SkillNodeProps) {
  const colors = CAT_COLORS[category] || CAT_COLORS.base;

  // Tutorial nodes have special styling
  if (isTutorial) {
    const tutorialBase = (() => {
      switch (status) {
        case "completed":
          return "bg-gradient-to-br from-amber-100 to-yellow-200 text-amber-900 border-amber-400 ring-2 ring-amber-400";
        case "in_progress":
          return "bg-gradient-to-br from-amber-50 to-yellow-100 text-amber-800 border-amber-300";
        default:
          return "bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 border-amber-300";
      }
    })();

    return (
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 1.08 }}
        animate={isSelected ? { scale: 1.06 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`relative rounded-2xl border-2 px-3 py-2.5 text-center select-none transition-shadow cursor-pointer ${tutorialBase} ${
          isSelected ? "shadow-lg shadow-amber-300/50" : ""
        } ${status !== "completed" ? "animate-tutorial-shimmer" : ""}`}
        style={{ width: "180px", minHeight: "80px" }}
      >
        {/* Progress ring */}
        {status === "in_progress" && <ProgressRing done={progress.done} total={progress.total} />}

        {/* Status emoji */}
        <div className="absolute -top-2 -left-1 text-sm leading-none">
          {getStatusEmoji(status)}
        </div>

        {/* Stars decoration */}
        <div className="absolute -top-1 -right-1 text-base leading-none flex gap-0.5">
          <span className="text-yellow-500">★</span>
          <span className="text-orange-400">★</span>
        </div>

        {/* Skill name */}
        <div className="text-sm font-extrabold leading-tight mt-1">{name}</div>

        {/* "必修" badge */}
        <div className="inline-block mt-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold tracking-wide">
          必修
        </div>

        {/* Star rating for completed */}
        {status === "completed" && rating !== null && rating > 0 && (
          <Stars count={Math.round(rating)} />
        )}

        {/* Progress fraction for in_progress */}
        {status === "in_progress" && (
          <div className="text-[9px] font-bold text-amber-700 mt-0.5">
            {progress.done}/{progress.total}
          </div>
        )}
      </motion.button>
    );
  }

  // Normal node
  const baseClass = (() => {
    switch (status) {
      case "locked":
        return "bg-gray-200/70 text-gray-400 border-gray-300 opacity-50 cursor-not-allowed";
      case "not_started":
        return "bg-white text-gray-700 border-blue-300 hover:border-blue-400 cursor-pointer";
      case "in_progress":
        return "bg-gradient-to-br from-yellow-50 to-orange-50 text-gray-800 border-orange-300 cursor-pointer";
      case "completed":
        return `bg-gradient-to-br from-green-50 to-emerald-100 text-green-800 border-green-400 cursor-pointer ring-2 ${colors.ring}`;
    }
  })();

  return (
    <motion.button
      onClick={onClick}
      whileTap={status !== "locked" ? { scale: 1.12 } : undefined}
      animate={isSelected ? { scale: 1.08 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`relative rounded-xl border-2 px-1.5 py-1.5 text-center select-none transition-shadow ${baseClass} ${
        isSelected ? `shadow-lg ${colors.glow}` : "shadow-sm"
      }`}
      style={{ width: "110px", minHeight: "52px" }}
    >
      {status === "in_progress" && <ProgressRing done={progress.done} total={progress.total} />}

      <div className="absolute -top-2 -left-1 text-sm leading-none">
        {getStatusEmoji(status)}
      </div>

      <div className="text-[11px] font-bold leading-tight truncate mt-1">{name}</div>
      <div className="text-[9px] opacity-60 font-medium">Lv{level}</div>

      {status === "completed" && rating !== null && rating > 0 && (
        <Stars count={Math.round(rating)} />
      )}

      {status === "in_progress" && (
        <div className="text-[8px] font-bold text-orange-600 mt-0.5">
          {progress.done}/{progress.total}
        </div>
      )}
    </motion.button>
  );
}
