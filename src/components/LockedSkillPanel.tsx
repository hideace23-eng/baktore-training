"use client";

export interface PrereqStatus {
  skillName: string;
  label: string;
  done: boolean;
}

interface Props {
  skillName: string;
  prerequisites: PrereqStatus[];
}

export default function LockedSkillPanel({ skillName, prerequisites }: Props) {
  const doneCount = prerequisites.filter((p) => p.done).length;
  const total = prerequisites.length;

  return (
    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔒</span>
        <span className="text-sm font-bold text-gray-700">
          この技はロック中です
        </span>
      </div>
      <p className="text-xs text-gray-500">
        以下の前提技を習得して「{skillName}」をアンロックしましょう:
      </p>
      <div className="space-y-1.5">
        {prerequisites.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={p.done ? "text-green-600" : "text-gray-400"}>
              {p.done ? "✅" : "⬜"}
            </span>
            <span className={`font-medium ${p.done ? "text-green-700" : "text-gray-600"}`}>
              {p.skillName}:
            </span>
            <span className={p.done ? "text-green-600 line-through" : "text-gray-500"}>
              {p.label}
            </span>
            <span className={`text-[10px] font-bold ${p.done ? "text-green-500" : "text-gray-400"}`}>
              {p.done ? "(達成)" : "(未達成)"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-bold text-gray-500">
          {doneCount}/{total}
        </span>
      </div>
    </div>
  );
}
