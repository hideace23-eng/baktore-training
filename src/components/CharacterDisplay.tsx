"use client";

import { useState, useEffect, useCallback } from "react";
import type { CharacterState } from "@/lib/types";
import { getStage, getStageInfo, getLevelProgress, getCharacterImagePath, getNextStageLevel } from "@/lib/xp";

interface Props {
  characterState: CharacterState;
  compact?: boolean;
  onCharacterUpdate?: (state: CharacterState) => void;
}

export default function CharacterDisplay({ characterState, compact = true, onCharacterUpdate }: Props) {
  const [todayXp, setTodayXp] = useState(0);
  const [xpFlash, setXpFlash] = useState<number | null>(null);
  const [levelUpAnim, setLevelUpAnim] = useState(false);
  const [imgError, setImgError] = useState(false);

  const stage = getStage(characterState.level);
  const stageInfo = getStageInfo(stage);
  const progress = getLevelProgress(characterState.xp);
  const imgPath = getCharacterImagePath(characterState.character_type, stage);
  const nextStageLevel = getNextStageLevel(stage);

  // 今日のXPを取得
  useEffect(() => {
    fetch("/api/xp")
      .then((r) => r.json())
      .then((d) => setTodayXp(d.todayXp || 0))
      .catch(() => {});
  }, [characterState.xp]);

  // XPフラッシュアニメーション
  const flashXp = useCallback((amount: number) => {
    setXpFlash(amount);
    setTimeout(() => setXpFlash(null), 1200);
  }, []);

  // レベルアップアニメーション
  useEffect(() => {
    if (levelUpAnim) {
      const t = setTimeout(() => setLevelUpAnim(false), 2000);
      return () => clearTimeout(t);
    }
  }, [levelUpAnim]);

  // 外部からのXP通知を受け付ける（windowイベント経由）
  useEffect(() => {
    function handleXpEvent(e: CustomEvent) {
      const { xp, character, levelUp } = e.detail;
      if (xp > 0) flashXp(xp);
      if (levelUp) setLevelUpAnim(true);
      if (character && onCharacterUpdate) onCharacterUpdate(character);
    }
    window.addEventListener("xp-gained" as string, handleXpEvent as EventListener);
    return () => window.removeEventListener("xp-gained" as string, handleXpEvent as EventListener);
  }, [flashXp, onCharacterUpdate]);

  if (compact) {
    return (
      <a href="/dashboard/character" className="block">
        <div className={`bg-gradient-to-r from-white to-gray-50 rounded-xl shadow-sm border p-4 mb-4 flex items-center gap-4 hover:shadow-md transition relative overflow-hidden ${levelUpAnim ? "animate-level-up-glow" : ""}`}>
          {/* キャラ画像 */}
          <div className="relative w-16 h-16 flex-shrink-0 animate-character-float">
            {!imgError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgPath}
                alt={characterState.name}
                className="w-full h-full"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-4xl flex items-center justify-center h-full">{stageInfo.emoji}</span>
            )}
            {/* XPフラッシュ */}
            {xpFlash && (
              <span className="absolute -top-2 -right-2 text-xs font-bold text-yellow-500 animate-xp-flash">
                +{xpFlash}XP
              </span>
            )}
          </div>

          {/* 情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-extrabold text-gray-800">{characterState.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                Lv.{characterState.level}
              </span>
              <span className="text-[10px] text-gray-400">{stageInfo.label}</span>
            </div>
            {/* XPバー */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
                {xpFlash && (
                  <div className="absolute inset-0 rounded-full animate-shimmer" />
                )}
              </div>
              <span className="text-[10px] text-gray-500 whitespace-nowrap">
                {progress.currentXp}/{progress.nextLevelXp}
              </span>
            </div>
            {/* 今日のXP */}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-gray-400">
                今日 <span className="font-bold text-yellow-600">+{todayXp}XP</span>
              </span>
              {characterState.login_streak > 1 && (
                <span className="text-[10px] text-orange-500 font-bold">
                  🔥 {characterState.login_streak}日連続
                </span>
              )}
              {nextStageLevel && (
                <span className="text-[10px] text-gray-400">
                  Lv.{nextStageLevel}で進化
                </span>
              )}
            </div>
          </div>

          <span className="text-gray-300 text-lg">&rsaquo;</span>

          {/* レベルアップポップアップ */}
          {levelUpAnim && (
            <div className="absolute inset-0 flex items-center justify-center bg-yellow-50/90 rounded-xl z-10">
              <div className="text-center animate-character-bounce">
                <div className="text-3xl mb-1">🎉</div>
                <div className="text-lg font-extrabold text-yellow-700">レベルアップ!</div>
                <div className="text-sm font-bold text-yellow-600">Lv.{characterState.level}</div>
              </div>
            </div>
          )}
        </div>
      </a>
    );
  }

  // Full size (for character detail page)
  return (
    <div className={`text-center ${levelUpAnim ? "animate-level-up-glow" : ""}`}>
      <div className="relative inline-block animate-character-float">
        <div className="w-40 h-40 mx-auto">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgPath} alt={characterState.name} className="w-full h-full" onError={() => setImgError(true)} />
          ) : (
            <span className="text-7xl flex items-center justify-center h-full">{stageInfo.emoji}</span>
          )}
        </div>
        {xpFlash && (
          <span className="absolute top-0 right-0 text-lg font-bold text-yellow-500 animate-xp-flash">+{xpFlash}XP</span>
        )}
      </div>

      <h2 className="text-2xl font-extrabold text-gray-800 mt-4">{characterState.name}</h2>
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-sm font-bold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700">Lv.{characterState.level}</span>
        <span className="text-sm text-gray-500">{stageInfo.label}</span>
      </div>

      <div className="max-w-xs mx-auto mt-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>XP</span>
          <span>{progress.currentXp} / {progress.nextLevelXp}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-4 text-sm">
        <div className="bg-white rounded-lg shadow px-4 py-2">
          <div className="text-lg font-bold text-gray-800">{characterState.xp}</div>
          <div className="text-xs text-gray-500">累計XP</div>
        </div>
        <div className="bg-white rounded-lg shadow px-4 py-2">
          <div className="text-lg font-bold text-orange-500">{characterState.login_streak}</div>
          <div className="text-xs text-gray-500">連続日数</div>
        </div>
        <div className="bg-white rounded-lg shadow px-4 py-2">
          <div className="text-lg font-bold text-yellow-600">+{todayXp}</div>
          <div className="text-xs text-gray-500">今日のXP</div>
        </div>
      </div>

      {levelUpAnim && (
        <div className="mt-4 animate-character-bounce">
          <span className="text-3xl">🎉</span>
          <p className="text-lg font-extrabold text-yellow-700">レベルアップ!</p>
        </div>
      )}
    </div>
  );
}
