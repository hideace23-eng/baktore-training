import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { allowed: profile?.role === "super_admin", supabase };
}

// GET: 全ユーザー一覧
export async function GET() {
  const { allowed, supabase } = await checkAdmin();
  if (!allowed) return Response.json({ error: "権限がありません" }, { status: 403 });

  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, can_edit_checklist, created_at")
    .order("created_at", { ascending: false });

  return Response.json({ data: users || [] });
}

// POST: can_edit_checklist の切り替え
export async function POST(req: NextRequest) {
  const { allowed, supabase } = await checkAdmin();
  if (!allowed) return Response.json({ error: "権限がありません" }, { status: 403 });

  const { userId, canEditChecklist } = await req.json();

  const { error } = await supabase
    .from("profiles")
    .update({ can_edit_checklist: canEditChecklist })
    .eq("id", userId);

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ success: true });
}
