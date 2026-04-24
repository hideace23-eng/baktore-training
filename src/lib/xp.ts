import type { CharacterStage, CharacterType } from "./types";

// XP基礎点テーブル（技の難易度レベル1〜10）
export const XP_BASE_BY_LEVEL: Record<number, { check: number; complete: number }> = {
  1:  { check: 3,   complete: 15 },
  2:  { check: 5,   complete: 25 },
  3:  { check: 8,   complete: 40 },
  4:  { check: 12,  complete: 60 },
  5:  { check: 18,  complete: 90 },
  6:  { check: 26,  complete: 130 },
  7:  { check: 38,  complete: 190 },
  8:  { check: 55,  complete: 275 },
  9:  { check: 80,  complete: 400 },
  10: { check: 120, complete: 600 },
};

// 星評価の倍率（★1〜5）
export const STAR_MULTIPLIER: Record<number, number> = {
  1: 1.0,
  2: 1.1,
  3: 1.25,
  4: 1.4,
  5: 1.5,
};

// 固定XP（レベル・星に依存しないアクション）
export const XP_FIXED = {
  read_daily_tip: 2,
  consecutive_login: 3,
} as const;

// チェッククリア時のXP
export function calcCheckXp(level: number, rating: number): number {
  const base = (XP_BASE_BY_LEVEL[level] ?? XP_BASE_BY_LEVEL[1]).check;
  const multiplier = STAR_MULTIPLIER[rating] ?? 1.0;
  return Math.round(base * multiplier);
}

// 技コンプリート時のXP
export function calcCompleteXp(level: number, rating: number): number {
  const base = (XP_BASE_BY_LEVEL[level] ?? XP_BASE_BY_LEVEL[1]).complete;
  const multiplier = STAR_MULTIPLIER[rating] ?? 1.0;
  return Math.round(base * multiplier);
}

// レベルNに必要な累計XP: N^2 * 10
export function xpForLevel(level: number): number {
  return level * level * 10;
}

// 累計XPからレベルを計算
export function calculateLevel(totalXp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

// レベルからステージを取得
export function getStage(level: number): CharacterStage {
  if (level <= 5) return "egg";
  if (level <= 15) return "chick";
  if (level <= 30) return "child";
  if (level <= 50) return "youth";
  return "pro";
}

// 現在レベル内のXP進捗
export function getLevelProgress(totalXp: number) {
  const level = calculateLevel(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const range = nextLevelXp - currentLevelXp;
  const progress = totalXp - currentLevelXp;
  return {
    level,
    currentXp: progress,
    nextLevelXp: range,
    percentage: range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100,
  };
}

// ステージ表示情報
export function getStageInfo(stage: CharacterStage) {
  switch (stage) {
    case "egg": return { label: "タマゴ", emoji: "🥚", minLevel: 1, maxLevel: 5 };
    case "chick": return { label: "ひよこアクロ", emoji: "🐣", minLevel: 6, maxLevel: 15 };
    case "child": return { label: "こどもアクロ", emoji: "🤸", minLevel: 16, maxLevel: 30 };
    case "youth": return { label: "わかものアクロ", emoji: "🔥", minLevel: 31, maxLevel: 50 };
    case "pro": return { label: "プロアクロ", emoji: "⭐", minLevel: 51, maxLevel: 999 };
  }
}

// キャラクター画像パス（SVGがなければnull → 絵文字フォールバック）
export function getCharacterImagePath(type: CharacterType, stage: CharacterStage): string {
  return `/characters/${type}/${stage}.svg`;
}

// 次のステージ
export function getNextStage(stage: CharacterStage): CharacterStage | null {
  const stages: CharacterStage[] = ["egg", "chick", "child", "youth", "pro"];
  const idx = stages.indexOf(stage);
  return idx < stages.length - 1 ? stages[idx + 1] : null;
}

// 次のステージまでの必要レベル
export function getNextStageLevel(stage: CharacterStage): number | null {
  switch (stage) {
    case "egg": return 6;
    case "chick": return 16;
    case "child": return 31;
    case "youth": return 51;
    case "pro": return null;
  }
}

// XPアクションの表示名
export function getActionLabel(action: string): string {
  switch (action) {
    case "check_clear": return "チェッククリア";
    case "skill_complete": return "技コンプリート";
    case "consecutive_login": return "連続ログイン";
    case "read_daily_tip": return "豆知識を読む";
    default: return action;
  }
}
