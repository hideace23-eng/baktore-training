"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CharacterState, CharacterType } from "@/lib/types";
import { getStageInfo } from "@/lib/xp";

interface Props {
  userId: string;
  onComplete: (state: CharacterState) => void;
}

export default function CharacterSelectModal({ userId, onComplete }: Props) {
  const [selected, setSelected] = useState<CharacterType | null>(null);
  const [name, setName] = useState("アクロ");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const stageInfo = getStageInfo("egg");

  async function handleSubmit() {
    if (!selected) return;
    if (!name.trim()) { setError("名前を入力してください"); return; }
    if (name.length > 20) { setError("名前は20文字以内にしてください"); return; }

    setSaving(true);
    setError("");

    const { data, error: err } = await supabase
      .from("character_states")
      .insert({
        user_id: userId,
        character_type: selected,
        xp: 0,
        level: 1,
        name: name.trim(),
        login_streak: 0,
      })
      .select()
      .single();

    if (err) {
      setError("保存に失敗しました: " + err.message);
      setSaving(false);
      return;
    }

    onComplete(data as CharacterState);
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-purple-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 text-center">
        <div className="text-4xl mb-2">{stageInfo.emoji}</div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">相棒を選ぼう!</h2>
        <p className="text-sm text-gray-500 mb-6">練習を一緒に頑張るキャラクターを選んでね</p>

        {/* キャラ選択 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setSelected("acro_kun")}
            className={`p-6 rounded-xl border-3 transition ${
              selected === "acro_kun"
                ? "border-blue-500 bg-blue-50 shadow-lg"
                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
          >
            <div className="w-20 h-20 mx-auto mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/characters/acro_kun/egg.svg" alt="アクロくん" className="w-full h-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-5xl">🥚</span>'; }} />
            </div>
            <div className="text-lg font-bold text-blue-700">アクロくん</div>
            <div className="text-xs text-gray-500 mt-1">元気いっぱいの男の子</div>
          </button>

          <button
            onClick={() => setSelected("acro_chan")}
            className={`p-6 rounded-xl border-3 transition ${
              selected === "acro_chan"
                ? "border-pink-500 bg-pink-50 shadow-lg"
                : "border-gray-200 hover:border-pink-300 hover:bg-gray-50"
            }`}
          >
            <div className="w-20 h-20 mx-auto mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/characters/acro_chan/egg.svg" alt="アクロちゃん" className="w-full h-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-5xl">🥚</span>'; }} />
            </div>
            <div className="text-lg font-bold text-pink-700">アクロちゃん</div>
            <div className="text-xs text-gray-500 mt-1">しなやかな女の子</div>
          </button>
        </div>

        {/* 名前入力 */}
        {selected && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">キャラクターの名前</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-lg font-bold text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              placeholder="名前を入力..."
            />
            <p className="text-xs text-gray-400 mt-1">あとから変更できません</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || saving}
          className={`w-full py-3 rounded-xl font-bold text-lg transition ${
            selected
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          } disabled:opacity-50`}
        >
          {saving ? "保存中..." : "はじめる!"}
        </button>
      </div>
    </div>
  );
}
