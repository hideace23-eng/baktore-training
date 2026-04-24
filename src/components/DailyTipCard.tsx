"use client";

import { useState, useEffect, useRef } from "react";

interface Tip {
  id: string;
  title: string;
  content: string;
  video_url: string | null;
  category: string;
}

interface Props {
  userId?: string;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  faq: { label: "よくある質問", color: "bg-blue-100 text-blue-700" },
  training: { label: "トレーニング", color: "bg-green-100 text-green-700" },
  safety: { label: "安全", color: "bg-red-100 text-red-700" },
  mental: { label: "メンタル", color: "bg-purple-100 text-purple-700" },
  motivation: { label: "モ���ベーション", color: "bg-orange-100 text-orange-700" },
  general: { label: "豆知識", color: "bg-gray-100 text-gray-600" },
};

function getYouTubeEmbedUrl(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export default function DailyTipCard({ userId }: Props) {
  const [tip, setTip] = useState<Tip | null>(null);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const xpAwardedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tips?offset=${offset}`);
        const json = await res.json();
        setTip(json.tip);
      } catch {
        setTip(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [offset]);

  function handleExpand() {
    setExpanded(!expanded);
    // XP: 豆知識を読んだ（1日1回、同じtipは1回まで）
    if (!expanded && tip && userId && !xpAwardedRef.current.has(tip.id)) {
      xpAwardedRef.current.add(tip.id);
      fetch("/api/xp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_daily_tip", resourceId: tip.id }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.xp > 0) {
            window.dispatchEvent(new CustomEvent("xp-gained", { detail: data }));
          }
        })
        .catch(() => {});
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (!tip) return null;

  const cat = categoryLabels[tip.category] || categoryLabels.general;
  const embedUrl = tip.video_url ? getYouTubeEmbedUrl(tip.video_url) : null;
  const previewLength = 150;
  const isLong = tip.content.length > previewLength;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-5 mb-6 card-hover">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💡</span>
        <span className="text-xs font-bold text-blue-600 tracking-wider">今日の豆知識</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
      </div>

      <h3 className="text-base font-bold text-gray-800 mb-2">{tip.title}</h3>

      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {expanded || !isLong
          ? tip.content
          : tip.content.slice(0, previewLength) + "..."}
      </div>

      {isLong && (
        <button
          onClick={handleExpand}
          className="text-xs text-blue-600 hover:underline mt-2 font-medium"
        >
          {expanded ? "閉じる" : "続きを読む"}
        </button>
      )}

      {embedUrl && expanded && (
        <div className="mt-4 rounded-lg overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => { setOffset((o) => o + 1); setExpanded(false); }}
          className="text-xs px-3 py-1.5 bg-white text-blue-600 rounded-full border border-blue-200 hover:bg-blue-50 transition font-medium"
        >
          次の豆知識 →
        </button>
      </div>
    </div>
  );
}
