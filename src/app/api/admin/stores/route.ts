import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, supabase };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { allowed: profile?.role === "super_admin", supabase };
}

// GET: 店舗一覧（認証不要 - signup時にも使う）
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.from("stores").select("*").order("name");
  return Response.json({ data: data || [] });
}

// POST: CRUD
export async function POST(req: NextRequest) {
  const { allowed, supabase } = await checkSuperAdmin();
  if (!allowed) return Response.json({ error: "権限がありません" }, { status: 403 });

  const { action, data, id } = await req.json();

  if (action === "insert") {
    const { data: result, error } = await supabase.from("stores").insert(data).select().single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data: result });
  }

  if (action === "update") {
    const { data: result, error } = await supabase.from("stores").update(data).eq("id", id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ data: result });
  }

  if (action === "delete") {
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ success: true });
  }

  return Response.json({ error: "無効なアクション" }, { status: 400 });
}
