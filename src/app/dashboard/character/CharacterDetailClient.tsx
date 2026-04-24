"use client";

import { useState } from "react";
import CharacterDisplay from "@/components/CharacterDisplay";
import type { CharacterState, XpLog } from "@/lib/types";
import {
  getStage,
  getStageInfo,
  getNextStage,
  getNextStageLevel,
  getCharacterImagePath,
  getActionLabel,
  xpForLevel,
} from "@/lib/xp";

interface Props {
  characterState: CharacterState;
  xpLogs: XpLog[];
}

export default function CharacterDetailClient({ characterState: initialState, xpLogs }: Props) {
  const [character, setCharacter] = useState(initialState);

  const stage = getStage(character.level);
  const nextStage = getNextStage(stage);
  const nextStageLevel = getNextStageLevel(stage);
  const nextStageInfo = nextStage ? getStageInfo(nextStage) : null;
  const nextStageXp = nextStageLevel ? xpForLevel(nextStageLevel) : null;
  const xpToNextStage = nextStageXp ? nextStageXp - character.xp : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <a href="/dashboard/student" className="text-blue-600 hover:underline text-sm">
        &larr; ダッシュボードに戻る
      </a>

      {/* Character display (full size) */}
      <CharacterDisplay
        characterState={character}
        compact={false}
        onCharacterUpdate={(c) => setCharacter(c)}
      />

      {/* Evolution stages */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">進化の道</h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {(["egg", "chick", "child", "youth", "pro"] as const).map((s) => {
            const info = getStageInfo(s);
            const isCurrent = s === stage;
            const isReached = character.level >= info.minLevel;
            return (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex flex-col items-center px-2 py-2 rounded-lg min-w-[60px] ${
                  isCurrent ? "bg-yellow-50 border-2 border-yellow-400" :
                  isReached ? "bg-green-50" : "bg-gray-50 opacity-50"
                }`}>
                  <div className="w-10 h-10 flex items-center justify-center">
                    {isReached ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getCharacterImagePath(character.character_type, s)}
                        alt={info.label}
                        className="w-full h-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-2xl">${info.emoji}</span>`; }}
                      />
                    ) : (
                      <span className="text-2xl opacity-30">{info.emoji}</span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-gray-600 mt-1">{info.label}</span>
                  <span className="text-[8px] text-gray-400">Lv.{info.minLevel}+</span>
                </div>
                {s !== "pro" && <span className="text-gray-300 text-xs">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Next evolution preview */}
      {nextStageInfo && xpToNextStage !== null && xpToNextStage > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">次の進化</h3>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 opacity-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCharacterImagePath(character.character_type, nextStage!)}
                alt={nextStageInfo.label}
                className="w-full h-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-4xl">${nextStageInfo.emoji}</span>`; }}
              />
            </div>
            <div>
              <div className="text-sm font-bold text-purple-700">{nextStageInfo.label}</div>
              <div className="text-xs text-gray-500">Lv.{nextStageLevel} で進化</div>
              <div className="text-xs text-purple-600 font-bold mt-1">
                あと {xpToNextStage} XP
              </div>
            </div>
          </div>
        </div>
      )}

      {/* XP History */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">XP獲得履歴</h3>
        {xpLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">まだ履歴がありません</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {xpLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-yellow-700">+{log.xp_gained}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800">{getActionLabel(log.action_type)}</div>
                  {log.reason && <div className="text-[10px] text-gray-500">{log.reason}</div>}
                </div>
                <div className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString("ja-JP")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
