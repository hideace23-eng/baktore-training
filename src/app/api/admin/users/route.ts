import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, supabase, userId: "" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { allowed: profile?.role === "super_admin", supabase, userId: user.id };
}

// GET: ユーザー一覧（店舗情報付き）
export async function GET() {
  const { allowed, supabase } = await checkSuperAdmin();
  if (!allowed) return Response.json({ error: "権限がありません" }, { status: 403 });

  const { data: users } = await supabase
    .from("profiles")
    .select("*, stores(name)")
    .order("created_at", { ascending: false });

  return Response.json({ data: users || [] });
}

// POST: ユーザー操作
export async function POST(req: NextRequest) {
  const { allowed, supabase, userId } = await checkSuperAdmin();
  if (!allowed) return Response.json({ error: "権限がありません" }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  // ロール変更
  if (action === "change_role") {
    const { targetUserId, role } = body;
    const { error } = await supabase.from("profiles").update({ role }).eq("id", targetUserId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  // ゴールド会員フラグ切替
  if (action === "toggle_gold") {
    const { targetUserId, isGold } = body;
    const { error } = await supabase.from("profiles").update({ is_gold_member: isGold }).eq("id", targetUserId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  // 所属店舗変更
  if (action === "change_store") {
    const { targetUserId, storeId } = body;
    const { error } = await supabase.from("profiles").update({ store_id: storeId || null }).eq("id", targetUserId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  // 招待リンク生成
  if (action === "invite") {
    const { email, role } = body;
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7日間有効

    const { data: result, error } = await supabase.from("invitations").insert({
      email,
      role,
      token,
      expires_at: expiresAt,
      invited_by: userId,
    }).select().single();

    if (error) return Response.json({ error: error.message }, { status: 400 });

    return Response.json({
      data: result,
      inviteUrl: `/login?invite=${token}`,
    });
  }

  return Response.json({ error: "無効なアクション" }, { status: 400 });
}
