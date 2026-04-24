import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

// GET: 今日の豆知識（日替わり）
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const offset = req.nextUrl.searchParams.get("offset");

  const { data: tips } = await supabase
    .from("daily_tips")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (!tips || tips.length === 0) {
    return Response.json({ tip: null });
  }

  // 日付ベースで同じ日は同じ豆知識を表示
  const today = new Date();
  const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  const idx = ((dayNumber + (parseInt(offset || "0") || 0)) % tips.length + tips.length) % tips.length;

  return Response.json({ tip: tips[idx], total: tips.length });
}

// POST: CRUD (super_admin only)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "未認証" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await req.json();
  const { action, data, id } = body;

  if (action === "list") {
    const { data: tips } = await supabase
      .from("daily_tips")
      .select("*")
      .order("created_at", { ascending: false });
    return Response.json({ data: tips || [] });
  }

  if (action === "insert") {
    const { data: result, error } = await supabase
      .from("daily_tips")
      .insert({ ...data, created_by: user.id })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data: result });
  }

  if (action === "update") {
    const { data: result, error } = await supabase
      .from("daily_tips")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data: result });
  }

  if (action === "delete") {
    const { error } = await supabase.from("daily_tips").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  return Response.json({ error: "無効なアクション" }, { status: 400 });
}
