import type { ChecklistData, SkillLevel } from "./checklist-data";

// Supabase から取得したデータを既存の ChecklistData 形式に変換する

interface DbSubItem {
  id: string;
  label: string;
  order_index: number;
}

interface DbCheckItem {
  id: string;
  label: string;
  video_title: string | null;
  video_url: string | null;
  order_index: number;
  check_sub_items?: DbSubItem[];
}

interface DbSkill {
  id: string;
  skill_key: string;
  name: string;
  level: string;
  hint: string;
  description: string;
  order_index: number;
  difficulty_level: number;
  default_expanded: boolean;
  check_items: DbCheckItem[];
}

interface DbCategory {
  id: string;
  key: string;
  name: string;
  color: string;
  order_index: number;
  skills: DbSkill[];
}

export function convertToChecklistData(dbCategories: DbCategory[]): ChecklistData {
  const result: ChecklistData = {};

  for (const cat of dbCategories) {
    result[cat.key] = {
      name: cat.name,
      color: cat.color,
      skills: cat.skills.map((sk) => ({
        id: sk.skill_key,
        name: sk.name,
        level: sk.level as SkillLevel,
        hint: sk.hint,
        desc: sk.description,
        difficulty_level: sk.difficulty_level ?? 1,
        default_expanded: sk.default_expanded ?? false,
        checks: sk.check_items.map((ci) => ({
          l: ci.label,
          v: ci.video_title || undefined,
          vUrl: ci.video_url || undefined,
          sub: (ci.check_sub_items || []).map((si) => ({ l: si.label })),
        })),
      })),
    };
  }

  return result;
}
