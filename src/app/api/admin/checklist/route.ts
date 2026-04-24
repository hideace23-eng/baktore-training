import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

async function checkEditPermission() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { allowed: false, supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, can_edit_checklist")
    .eq("id", user.id)
    .single();

  if (!profile) return { allowed: false, supabase, user };
  const allowed = profile.role === "super_admin" || profile.role === "admin" || (profile.role === "teacher" && profile.can_edit_checklist);
  return { allowed, supabase, user };
}

// GET: チェックリスト全データ取得
export async function GET() {
  const supabase = await createClient();

  // check_sub_items を含むクエリを試し、失敗したらフォールバック
  let categories: Record<string, unknown>[] | null = null;
  let hasSubItems = true;

  const full = await supabase
    .from("categories")
    .select(`
      id, key, name, color, order_index,
      skills (
        id, skill_key, name, level, hint, description, order_index,
        check_items (
          id, label, video_title, video_url, order_index,
          check_sub_items (
            id, label, order_index
          )
        )
      )
    `)
    .order("order_index");

  if (full.error) {
    // check_sub_items テーブルが無い場合のフォールバック
    hasSubItems = false;
    const fallback = await supabase
      .from("categories")
      .select(`
        id, key, name, color, order_index,
        skills (
          id, skill_key, name, level, hint, description, order_index,
          check_items (
            id, label, video_title, video_url, order_index
          )
        )
      `)
      .order("order_index");

    if (fallback.error) {
      return Response.json({ error: fallback.error.message }, { status: 500 });
    }
    categories = fallback.data;
  } else {
    categories = full.data;
  }

  // Sort nested arrays by order_index
  const sorted = (categories || []).map((cat: Record<string, unknown>) => ({
    ...cat,
    skills: ((cat.skills as Record<string, unknown>[]) || [])
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.order_index as number) - (b.order_index as number))
      .map((sk: Record<string, unknown>) => ({
        ...sk,
        check_items: ((sk.check_items as Record<string, unknown>[]) || [])
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.order_index as number) - (b.order_index as number))
          .map((ci: Record<string, unknown>) => ({
            ...ci,
            check_sub_items: hasSubItems
              ? ((ci.check_sub_items as Record<string, unknown>[]) || [])
                  .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (a.order_index as number) - (b.order_index as number))
              : [],
          })),
      })),
  }));

  return Response.json({ data: sorted });
}

// POST: CRUD操作
export async function POST(req: NextRequest) {
  const { allowed, supabase } = await checkEditPermission();
  if (!allowed) return Response.json({ error: "権限がありません" }, { status: 403 });

  const body = await req.json();
  const { action, table, data, id } = body;

  const validTables = ["categories", "skills", "check_items", "check_sub_items"];
  if (!validTables.includes(table)) {
    return Response.json({ error: "無効なテーブル" }, { status: 400 });
  }

  try {
    if (action === "insert") {
      const { data: result, error } = await supabase.from(table).insert(data).select().single();
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data: result });
    }

    if (action === "update") {
      const { data: result, error } = await supabase.from(table).update(data).eq("id", id).select().single();
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ data: result });
    }

    if (action === "delete") {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ success: true });
    }

    if (action === "reorder") {
      // data = [{ id, order_index }]
      for (const item of data) {
        await supabase.from(table).update({ order_index: item.order_index }).eq("id", item.id);
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: "無効なアクション" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
