import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

// GET: 現在のオンボーディング状態を取得
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未認証" }, { status: 401 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "onboarding_completed, onboarding_step, onboarding_completed_at, " +
      "onboarding_age_group, onboarding_attribute, onboarding_short_term_goals, " +
      "onboarding_long_term_dream, onboarding_self_image, onboarding_practice_frequency, " +
      "onboarding_self_reported_skills"
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return Response.json({ error: "プロフィールが見つかりません" }, { status: 404 });
  }

  return Response.json({ data: profile });
}

// POST: 各ステップの回答を保存
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未認証" }, { status: 401 });

  const body = await req.json();
  const { step, answers } = body as {
    step: number;
    answers: Record<string, unknown>;
  };

  if (typeof step !== "number" || step < 1 || step > 9) {
    return Response.json({ error: "無効なステップ" }, { status: 400 });
  }

  // Build update object based on step
  const update: Record<string, unknown> = {
    onboarding_step: step,
  };

  // Map step-specific answers to columns
  if (answers) {
    if (answers.age_group !== undefined) update.onboarding_age_group = answers.age_group;
    if (answers.attribute !== undefined) update.onboarding_attribute = answers.attribute;
    if (answers.short_term_goals !== undefined) update.onboarding_short_term_goals = answers.short_term_goals;
    if (answers.long_term_dream !== undefined) update.onboarding_long_term_dream = answers.long_term_dream;
    if (answers.self_image !== undefined) update.onboarding_self_image = answers.self_image;
    if (answers.practice_frequency !== undefined) update.onboarding_practice_frequency = answers.practice_frequency;
    if (answers.self_reported_skills !== undefined) update.onboarding_self_reported_skills = answers.self_reported_skills;
  }

  // Step 9 = completion
  if (step >= 9) {
    update.onboarding_completed = true;
    update.onboarding_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    return Response.json({ error: "保存に失敗しました" }, { status: 500 });
  }

  return Response.json({ success: true, step });
}
