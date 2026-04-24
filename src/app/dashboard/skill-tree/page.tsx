"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

// スキルノード定義
interface SkillNode {
  key: string;
  name: string;
  category: string;
  level: number;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
}

// カテゴリ色
const CAT_COLORS: Record<string, { bg: string; bgDone: string; border: string; text: string }> = {
  base:    { bg: "bg-purple-100", bgDone: "bg-purple-500", border: "border-purple-300", text: "text-purple-700" },
  front:   { bg: "bg-blue-100",   bgDone: "bg-blue-500",   border: "border-blue-300",   text: "text-blue-700" },
  back:    { bg: "bg-red-100",    bgDone: "bg-red-500",     border: "border-red-300",    text: "text-red-700" },
  side:    { bg: "bg-green-100",  bgDone: "bg-green-500",   border: "border-green-300",  text: "text-green-700" },
  combo:   { bg: "bg-pink-100",   bgDone: "bg-pink-500",    border: "border-pink-300",   text: "text-pink-700" },
  special: { bg: "bg-amber-100",  bgDone: "bg-amber-500",   border: "border-amber-300",  text: "text-amber-700" },
};

// メインツリーのノード配置
const TREE_NODES: SkillNode[] = [
  // Row 0: 基礎入門（Lv1）
  { key: "maeten",   name: "前転",       category: "front", level: 1, x: 0, y: 0 },
  { key: "bridge",   name: "ブリッジ",    category: "back",  level: 1, x: 1, y: 0 },
  { key: "kouten",   name: "後転",       category: "back",  level: 1, x: 2, y: 0 },

  // Row 1: Lv2
  { key: "wall_handstand",  name: "壁倒立",         category: "base", level: 2, x: 3, y: 1 },
  { key: "kaikyaku_maeten", name: "開脚前転",        category: "front", level: 2, x: 0, y: 1 },
  { key: "kaikyaku_kouten", name: "開脚後転",        category: "back",  level: 2, x: 2, y: 1 },

  // Row 2: Lv3
  { key: "handstand",       name: "倒立",           category: "base", level: 3, x: 3, y: 2 },
  { key: "tobikomi_maeten", name: "飛び込み前転",    category: "front", level: 3, x: 0, y: 2 },
  { key: "touritsu_maeten", name: "倒立前転",        category: "front", level: 3, x: 1, y: 2 },
  { key: "haitouritsu",     name: "背倒立",          category: "back",  level: 3, x: 2, y: 2 },
  { key: "sokuten",         name: "側転",            category: "side",  level: 3, x: 4, y: 2 },

  // Row 3: Lv4
  { key: "touritsu_bridge", name: "倒立ブリッジ",    category: "front", level: 4, x: 1, y: 3 },
  { key: "kouten_touritsu", name: "後転倒立",        category: "back",  level: 4, x: 2, y: 3 },
  { key: "katate_sokuten",  name: "片手側転",        category: "side",  level: 4, x: 4, y: 3 },

  // Row 4: Lv5
  { key: "handspring",     name: "ハンドスプリング", category: "front", level: 5, x: 1, y: 4 },
  { key: "kouhoutenkai",   name: "後方転回",        category: "back",  level: 5, x: 2, y: 4 },

  // Row 5: Lv6
  { key: "roundoff",       name: "ロンダート",      category: "side",  level: 6, x: 4, y: 5 },

  // Row 6: Lv7
  { key: "maesou",         name: "前宙",           category: "front", level: 7, x: 0, y: 6 },
  { key: "tensou",         name: "転宙",           category: "front", level: 7, x: 1, y: 6 },
  { key: "bakuten",        name: "バク転",         category: "back",  level: 7, x: 2, y: 6 },
  { key: "bakusou",        name: "バク宙",         category: "back",  level: 7, x: 3, y: 6 },
  { key: "sokusou_aerial", name: "側宙",           category: "side",  level: 7, x: 4, y: 6 },

  // Row 7: Lv8
  { key: "renzoku_bakuten",  name: "連続バク転",      category: "back",  level: 8, x: 2, y: 7 },
  { key: "roundoff_bakuten", name: "ロンバク転",      category: "combo", level: 8, x: 3, y: 7 },
  { key: "roundoff_bakusou", name: "ロンバク宙",      category: "combo", level: 8, x: 4, y: 7 },

  // Row 8: Lv9-10
  { key: "shinmi_tenkai",  name: "伸身宙返り",     category: "back",  level: 9,  x: 2, y: 8 },
  { key: "maesou_hineri",  name: "前宙ひねり",     category: "front", level: 10, x: 0, y: 8 },
  { key: "bakusou_hineri", name: "バク宙ひねり",    category: "back",  level: 10, x: 3, y: 8 },
];

// 特殊技（独立グループ）
const SPECIAL_NODES: SkillNode[] = [
  { key: "macaco",     name: "マカコ",         category: "special", level: 5, x: 0, y: 0 },
  { key: "gainer",     name: "ゲイナー",       category: "special", level: 5, x: 1, y: 0 },
  { key: "side_flip",  name: "サイドフリップ",  category: "special", level: 6, x: 2, y: 0 },
  { key: "helicopter", name: "ヘリコプテイロ",  category: "special", level: 7, x: 3, y: 0 },
  { key: "cork",       name: "コーク",         category: "special", level: 7, x: 4, y: 0 },
];

// 依存関係（矢印）
const EDGES: Edge[] = [
  // 前転系
  { from: "maeten", to: "kaikyaku_maeten" },
  { from: "maeten", to: "tobikomi_maeten" },
  { from: "maeten", to: "touritsu_maeten" },
  { from: "tobikomi_maeten", to: "maesou" },
  { from: "handspring", to: "maesou" },
  { from: "maesou", to: "tensou" },
  { from: "maesou", to: "maesou_hineri" },

  // 倒立系
  { from: "wall_handstand", to: "handstand" },
  { from: "handstand", to: "touritsu_maeten" },
  { from: "handstand", to: "touritsu_bridge" },
  { from: "handstand", to: "kouten_touritsu" },
  { from: "handstand", to: "sokuten" },

  // 前方中級
  { from: "touritsu_bridge", to: "handspring" },
  { from: "bridge", to: "touritsu_bridge" },

  // 後転系
  { from: "kouten", to: "kaikyaku_kouten" },
  { from: "kouten", to: "kouten_touritsu" },
  { from: "bridge", to: "kouhoutenkai" },
  { from: "kouten_touritsu", to: "kouhoutenkai" },
  { from: "kouhoutenkai", to: "bakuten" },
  { from: "bakuten", to: "renzoku_bakuten" },
  { from: "bakuten", to: "roundoff_bakuten" },
  { from: "bakusou", to: "roundoff_bakusou" },
  { from: "bakusou", to: "shinmi_tenkai" },
  { from: "bakusou", to: "bakusou_hineri" },

  // 側方系
  { from: "sokuten", to: "katate_sokuten" },
  { from: "sokuten", to: "roundoff" },
  { from: "katate_sokuten", to: "sokusou_aerial" },
  { from: "roundoff", to: "roundoff_bakuten" },
  { from: "roundoff", to: "roundoff_bakusou" },
];

type SkillStatus = "not_started" | "in_progress" | "completed";

export default function SkillTreePage() {
  const [skillStatuses, setSkillStatuses] = useState<Record<string, SkillStatus>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // チェックリストデータ取得
      const [checklistRes, { data: progress }] = await Promise.all([
        fetch("/api/admin/checklist").then(r => r.json()),
        supabase
          .from("checklist_progress")
          .select("skill_id, item_index, sub_index, status")
          .eq("user_id", user.id),
      ]);

      // スキルごとのチェック数を把握
      const skillChecksCount: Record<string, number> = {};
      if (checklistRes.data) {
        for (const cat of checklistRes.data) {
          for (const sk of cat.skills) {
            skillChecksCount[sk.skill_key] = sk.check_items?.length ?? 0;
          }
        }
      }

      // 進捗を集計
      const doneCount: Record<string, number> = {};
      for (const p of (progress || [])) {
        if (p.sub_index === -1 && p.status === "done") {
          doneCount[p.skill_id] = (doneCount[p.skill_id] || 0) + 1;
        }
      }

      const statuses: Record<string, SkillStatus> = {};
      const allKeys = [...TREE_NODES, ...SPECIAL_NODES].map(n => n.key);
      for (const key of allKeys) {
        const total = skillChecksCount[key] || 0;
        const done = doneCount[key] || 0;
        if (done > 0 && done >= total && total > 0) {
          statuses[key] = "completed";
        } else if (done > 0) {
          statuses[key] = "in_progress";
        } else {
          statuses[key] = "not_started";
        }
      }
      setSkillStatuses(statuses);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  function getNodeStyle(node: SkillNode) {
    const status = skillStatuses[node.key] || "not_started";
    const colors = CAT_COLORS[node.category] || CAT_COLORS.basis;

    if (status === "completed") {
      return `${colors.bgDone} text-white border-2 border-white shadow-lg ring-2 ring-offset-1 ring-${node.category === "back" ? "red" : node.category === "front" ? "blue" : node.category === "side" ? "green" : "purple"}-300`;
    }
    if (status === "in_progress") {
      return `${colors.bg} ${colors.text} border-2 ${colors.border}`;
    }
    return "bg-gray-100 text-gray-400 border-2 border-gray-200";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/student" className="text-blue-600 hover:underline text-sm">
            &larr; ダッシュボードに戻る
          </Link>
          <h2 className="text-xl font-bold text-gray-800">スキルツリー</h2>
        </div>

        {/* 凡例 */}
        <div className="flex flex-wrap gap-3 mb-6 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-200" />
            <span className="text-gray-500">未着手</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300" />
            <span className="text-gray-500">進行中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-blue-500 border-2 border-white shadow ring-2 ring-blue-300" />
            <span className="text-gray-500">達成済み</span>
          </div>
        </div>

        {/* メインツリー */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 overflow-x-auto mb-6">
          <h3 className="text-sm font-bold text-gray-600 mb-4">メインスキルツリー</h3>
          <div className="relative" style={{ minWidth: "600px" }}>
            {/* SVG for arrows */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: `${9 * 80 + 40}px` }}>
              {EDGES.map((edge, i) => {
                const fromNode = TREE_NODES.find(n => n.key === edge.from);
                const toNode = TREE_NODES.find(n => n.key === edge.to);
                if (!fromNode || !toNode) return null;

                const cellW = 120;
                const cellH = 80;
                const offsetX = 60;
                const offsetY = 30;

                const x1 = fromNode.x * cellW + offsetX;
                const y1 = fromNode.y * cellH + offsetY + 18;
                const x2 = toNode.x * cellW + offsetX;
                const y2 = toNode.y * cellH + offsetY - 2;

                return (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#d1d5db"
                    strokeWidth="1.5"
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#d1d5db" />
                </marker>
              </defs>
            </svg>

            {/* Nodes */}
            <div className="relative" style={{ height: `${9 * 80 + 40}px` }}>
              {TREE_NODES.map((node) => {
                const cellW = 120;
                const cellH = 80;
                const left = node.x * cellW;
                const top = node.y * cellH;

                return (
                  <Link
                    key={node.key}
                    href="/dashboard/student"
                    className={`absolute rounded-lg px-2 py-1.5 text-center cursor-pointer hover:scale-105 transition-transform ${getNodeStyle(node)}`}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: "110px",
                    }}
                  >
                    <div className="text-xs font-bold leading-tight truncate">{node.name}</div>
                    <div className="text-[10px] opacity-70">Lv{node.level}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* 特殊技 */}
        <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
          <h3 className="text-sm font-bold text-gray-600 mb-4">特殊技</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SPECIAL_NODES.map((node) => (
              <Link
                key={node.key}
                href="/dashboard/student"
                className={`rounded-lg px-3 py-3 text-center cursor-pointer hover:scale-105 transition-transform ${getNodeStyle(node)}`}
              >
                <div className="text-xs font-bold leading-tight">{node.name}</div>
                <div className="text-[10px] opacity-70">Lv{node.level}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
