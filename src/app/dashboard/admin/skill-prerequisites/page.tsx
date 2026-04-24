"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface SkillOption {
  id: string;
  skill_key: string;
  name: string;
}

interface CheckItemOption {
  id: string;
  label: string;
  skill_key: string;
  skill_name: string;
}

interface PrereqRow {
  id: string;
  required_check_item_id: string;
  label: string;
  skill_key: string;
  skill_name: string;
}

export default function SkillPrerequisitesPage() {
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [allCheckItems, setAllCheckItems] = useState<CheckItemOption[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [prereqs, setPrereqs] = useState<PrereqRow[]>([]);
  const [addSkillFilter, setAddSkillFilter] = useState<string>("");
  const [addCheckItemId, setAddCheckItemId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const supabase = createClient();

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // Load all skills and check items
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/checklist");
      const json = await res.json();
      const categories = json.data || [];

      const sk: SkillOption[] = [];
      const ci: CheckItemOption[] = [];

      for (const cat of categories) {
        for (const skill of cat.skills) {
          sk.push({ id: skill.id, skill_key: skill.skill_key, name: skill.name });
          for (const item of skill.check_items) {
            ci.push({
              id: item.id,
              label: item.label,
              skill_key: skill.skill_key,
              skill_name: skill.name,
            });
          }
        }
      }

      setSkills(sk);
      setAllCheckItems(ci);
      setLoading(false);
    }
    load();
  }, []);

  // Load prerequisites for selected skill
  const loadPrereqs = useCallback(async (skillId: string) => {
    if (!skillId) {
      setPrereqs([]);
      return;
    }

    const { data } = await supabase
      .from("skill_prerequisites")
      .select("id, required_check_item_id")
      .eq("skill_id", skillId);

    if (!data || data.length === 0) {
      setPrereqs([]);
      return;
    }

    // Map to labels
    const rows: PrereqRow[] = data.map((row) => {
      const ci = allCheckItems.find((c) => c.id === row.required_check_item_id);
      return {
        id: row.id,
        required_check_item_id: row.required_check_item_id,
        label: ci?.label || "(不明)",
        skill_key: ci?.skill_key || "",
        skill_name: ci?.skill_name || "",
      };
    });

    setPrereqs(rows);
  }, [supabase, allCheckItems]);

  useEffect(() => {
    if (selectedSkillId && allCheckItems.length > 0) {
      loadPrereqs(selectedSkillId);
    }
  }, [selectedSkillId, allCheckItems, loadPrereqs]);

  async function addPrereq() {
    if (!selectedSkillId || !addCheckItemId) return;

    const { error } = await supabase.from("skill_prerequisites").insert({
      skill_id: selectedSkillId,
      required_check_item_id: addCheckItemId,
    });

    if (error) {
      showToast("エラー: " + error.message);
      return;
    }

    showToast("前提技を追加しました");
    setAddCheckItemId("");
    loadPrereqs(selectedSkillId);
  }

  async function removePrereq(prereqId: string) {
    if (!confirm("この前提技を削除しますか?")) return;

    await supabase.from("skill_prerequisites").delete().eq("id", prereqId);
    showToast("前提技を削除しました");
    loadPrereqs(selectedSkillId);
  }

  const filteredCheckItems = addSkillFilter
    ? allCheckItems.filter((ci) => ci.skill_key === addSkillFilter)
    : allCheckItems;

  // Exclude already-added prerequisites
  const existingCiIds = new Set(prereqs.map((p) => p.required_check_item_id));
  const availableCheckItems = filteredCheckItems.filter((ci) => !existingCiIds.has(ci.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const selectedSkill = skills.find((s) => s.id === selectedSkillId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/admin" className="text-blue-600 hover:underline text-sm">
            &larr; 管理画面に戻る
          </Link>
          <h2 className="text-xl font-bold text-gray-800">前提技の編集</h2>
        </div>

        {/* Skill selector */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <label className="text-sm font-bold text-gray-600 block mb-2">技を選択</label>
          <select
            value={selectedSkillId}
            onChange={(e) => {
              setSelectedSkillId(e.target.value);
              setAddSkillFilter("");
              setAddCheckItemId("");
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900"
          >
            <option value="">-- 技を選んでください --</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.skill_key})
              </option>
            ))}
          </select>
        </div>

        {selectedSkill && (
          <>
            {/* Current prerequisites */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-3">
                「{selectedSkill.name}」の前提技 ({prereqs.length}件)
              </h3>
              {prereqs.length === 0 ? (
                <p className="text-xs text-gray-400">前提技なし（誰でも挑戦可能）</p>
              ) : (
                <div className="space-y-2">
                  {prereqs.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs font-bold text-blue-600">{p.skill_name}</span>
                      <span className="text-xs text-gray-600 flex-1">{p.label}</span>
                      <button
                        onClick={() => removePrereq(p.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add prerequisite */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">前提技を追加</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500">技でフィルタ</label>
                  <select
                    value={addSkillFilter}
                    onChange={(e) => {
                      setAddSkillFilter(e.target.value);
                      setAddCheckItemId("");
                    }}
                    className="w-full border rounded px-3 py-1.5 text-sm text-gray-900"
                  >
                    <option value="">全技から選択</option>
                    {skills
                      .filter((s) => s.id !== selectedSkillId)
                      .map((s) => (
                        <option key={s.id} value={s.skill_key}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">チェック項目</label>
                  <select
                    value={addCheckItemId}
                    onChange={(e) => setAddCheckItemId(e.target.value)}
                    className="w-full border rounded px-3 py-1.5 text-sm text-gray-900"
                  >
                    <option value="">-- 選択 --</option>
                    {availableCheckItems.map((ci) => (
                      <option key={ci.id} value={ci.id}>
                        [{ci.skill_name}] {ci.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addPrereq}
                  disabled={!addCheckItemId}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  追加
                </button>
              </div>
            </div>
          </>
        )}

        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg z-50">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
