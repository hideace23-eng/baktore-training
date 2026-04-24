import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { calcCheckXp, calcCompleteXp, XP_FIXED, calculateLevel } from "@/lib/xp";
import type { XpActionType } from "@/lib/types";

const VALID_ACTIONS: XpActionType[] = [
  "check_clear",
  "skill_complete",
  "star_5_eval",
  "consecutive_login",
  "read_daily_tip",
];

// GET: 今日のXPサマリー + 最近のログ
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未認証" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];

  const [{ data: todayLogs }, { data: recentLogs }] = await Promise.all([
    supabase
      .from("xp_logs")
      .select("xp_gained")
      .eq("user_id", user.id)
      .gte("created_at", today + "T00:00:00Z")
      .lt("created_at", today + "T23:59:59Z"),
    supabase
      .from("xp_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const todayXp = (todayLogs || []).reduce((sum, log) => sum + log.xp_gained, 0);

  return Response.json({ todayXp, recentLogs: recentLogs || [] });
}

// POST: XP付与
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未認証" }, { status: 401 });

  const { action, resourceId, rating, triggeredByUserId } = await req.json() as {
    action: XpActionType;
    resourceId?: string;
    rating?: number;
    triggeredByUserId?: string;
  };

  // triggeredByUserId が指定されている場合、そのユーザーが teacher/admin/super_admin であることを確認
  if (triggeredByUserId) {
    const { data: actorProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", triggeredByUserId)
      .single();

    if (!actorProfile || !["teacher", "admin", "super_admin"].includes(actorProfile.role)) {
      return Response.json({ error: "代理操作の権限がありません" }, { status: 403 });
    }
  }

  if (!VALID_ACTIONS.includes(action)) {
    return Response.json({ error: "無効なアクション" }, { status: 400 });
  }

  // キャラクター状態を取得
  const { data: character } = await supabase
    .from("character_states")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!character) {
    return Response.json({ error: "キャラクターが未作成です" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  const resId = resourceId || "default";

  // 重複チェック: 同じ日・同じアクション・同じリソースは1回まで
  const { data: existing } = await supabase
    .from("xp_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("action_type", action)
    .eq("resource_id", resId)
    .gte("created_at", today + "T00:00:00Z")
    .lt("created_at", today + "T23:59:59Z")
    .limit(1);

  if (existing && existing.length > 0) {
    return Response.json({
      alreadyAwarded: true,
      xp: 0,
      character,
      levelUp: false,
    });
  }

  // ロック判定: check_clear / skill_complete のとき、前提技が未達なら XP=0
  if (action === "check_clear" || action === "skill_complete") {
    const locked = await isSkillLocked(supabase, resId.split(":")[0], user.id);
    if (locked) {
      return Response.json({ xp: 0, locked: true, character, levelUp: false });
    }
  }

  // XP量を決定
  const xpGained = await resolveXp(supabase, action, resId, rating ?? 1);

  // XPログを挿入（star_5_eval でも記録はする）
  await supabase.from("xp_logs").insert({
    user_id: user.id,
    action_type: action,
    xp_gained: xpGained,
    reason: getActionReason(action),
    resource_id: resId,
    ...(triggeredByUserId ? { triggered_by_user_id: triggeredByUserId } : {}),
  });

  // activity_log に記録（代理操作の場合）
  if (triggeredByUserId) {
    try {
      await supabase.from("activity_log").insert({
        user_id: user.id,
        actor_id: triggeredByUserId,
        action_type: `proxy_${action}`,
        message: `代理チェック: ${action} (${resId})`,
        metadata: { action, resourceId: resId, xpGained, rating: rating ?? 1 },
      });
    } catch {
      // activity_log テーブルが存在しない場合は無視
    }
  }

  if (xpGained === 0) {
    return Response.json({ xp: 0, character, levelUp: false });
  }

  // キャラクター状態を更新
  const newXp = character.xp + xpGained;
  const oldLevel = character.level;
  // ログインストリーク処理
  let newStreak = character.login_streak;
  let loginBonusAwarded = false;

  if (character.last_login_date !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (character.last_login_date === yesterdayStr) {
      newStreak = character.login_streak + 1;
    } else {
      newStreak = 1;
    }

    // 連続ログインボーナス（今日初回のXPアクション時に付与）
    if (action !== "consecutive_login" && newStreak > 1) {
      const { data: loginExists } = await supabase
        .from("xp_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("action_type", "consecutive_login")
        .gte("created_at", today + "T00:00:00Z")
        .limit(1);

      if (!loginExists || loginExists.length === 0) {
        await supabase.from("xp_logs").insert({
          user_id: user.id,
          action_type: "consecutive_login",
          xp_gained: XP_FIXED.consecutive_login,
          reason: `${newStreak}日連続ログイン`,
          resource_id: "daily",
        });
        loginBonusAwarded = true;
      }
    }
  }

  const totalXp = newXp + (loginBonusAwarded ? XP_FIXED.consecutive_login : 0);
  const finalLevel = calculateLevel(totalXp);

  await supabase
    .from("character_states")
    .update({
      xp: totalXp,
      level: finalLevel,
      last_login_date: today,
      login_streak: newStreak,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  const updatedCharacter = { ...character, xp: totalXp, level: finalLevel, login_streak: newStreak, last_login_date: today };

  return Response.json({
    xp: xpGained,
    loginBonus: loginBonusAwarded ? XP_FIXED.consecutive_login : 0,
    character: updatedCharacter,
    levelUp: finalLevel > oldLevel,
    newLevel: finalLevel,
  });
}

// アクションに応じたXP量を算出
async function resolveXp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: XpActionType,
  resourceId: string,
  rating: number,
): Promise<number> {
  switch (action) {
    case "check_clear":
    case "skill_complete": {
      // resourceId = "skillKey:itemIndex:subIndex" or "skillKey"
      const skillKey = resourceId.split(":")[0];
      const { data: skill } = await supabase
        .from("skills")
        .select("difficulty_level")
        .eq("skill_key", skillKey)
        .single();
      const difficultyLevel = skill?.difficulty_level ?? 1;
      return action === "check_clear"
        ? calcCheckXp(difficultyLevel, rating)
        : calcCompleteXp(difficultyLevel, rating);
    }
    case "star_5_eval":
      return 0; // ログのみ、XP付与なし
    case "read_daily_tip":
      return XP_FIXED.read_daily_tip;
    case "consecutive_login":
      return XP_FIXED.consecutive_login;
    default:
      return 0;
  }
}

// 技がロックされているか判定
async function isSkillLocked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  skillKey: string,
  userId: string,
): Promise<boolean> {
  const { data: skill } = await supabase
    .from("skills")
    .select("id")
    .eq("skill_key", skillKey)
    .single();
  if (!skill) return false;

  const { data: prereqs, error: prereqError } = await supabase
    .from("skill_prerequisites")
    .select("required_check_item_id")
    .eq("skill_id", skill.id);

  if (prereqError || !prereqs || prereqs.length === 0) return false;

  const ciIds = prereqs.map((p) => p.required_check_item_id);
  const { data: checkItems } = await supabase
    .from("check_items")
    .select("order_index, skills(skill_key)")
    .in("id", ciIds);

  if (!checkItems) return false;

  for (const ci of checkItems) {
    const parentSkillKey = (ci.skills as unknown as { skill_key: string } | null)?.skill_key;
    if (!parentSkillKey) continue;

    const { data: progress } = await supabase
      .from("checklist_progress")
      .select("status")
      .eq("user_id", userId)
      .eq("skill_id", parentSkillKey)
      .eq("item_index", ci.order_index)
      .eq("sub_index", -1)
      .single();

    if (!progress || progress.status !== "done") return true;
  }

  return false;
}

function getActionReason(action: XpActionType): string {
  switch (action) {
    case "check_clear": return "チェック項目クリア";
    case "skill_complete": return "技コンプリートボーナス";
    case "star_5_eval": return "★5自己評価（記録のみ）";
    case "consecutive_login": return "連続ログインボーナス";
    case "read_daily_tip": return "豆知識を読んだ";
    default: return "";
  }
}
