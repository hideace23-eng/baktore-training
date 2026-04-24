import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import TeacherDashboardClient from "./TeacherDashboardClient";

export default async function TeacherDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");
  if (!["teacher", "admin", "super_admin"].includes(profile.role)) {
    redirect("/dashboard/student");
  }

  // 先生の担当店舗を取得（teacher_stores テーブル優先、fallback: profiles.store_id）
  const { data: teacherStoreRows } = await supabase
    .from("teacher_stores")
    .select("store_id")
    .eq("teacher_id", user.id);

  let storeIds: string[] = (teacherStoreRows || []).map((r) => r.store_id);

  // teacher_storesにデータがなければ、profiles.store_idをfallback
  if (storeIds.length === 0 && profile.store_id) {
    storeIds = [profile.store_id];
  }

  // 店舗情報を取得
  let stores: { id: string; name: string }[] = [];
  if (storeIds.length > 0) {
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", storeIds);
    stores = storeData || [];
  }

  // admin/super_admin は全店舗・全生徒を見られる
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  // 生徒一覧を取得
  let studentsQuery = supabase
    .from("profiles")
    .select("id, full_name, email, store_id")
    .eq("role", "student");

  if (!isAdmin && storeIds.length > 0) {
    studentsQuery = studentsQuery.in("store_id", storeIds);
  }

  const { data: students } = await studentsQuery;
  const studentList = students || [];
  const studentIds = studentList.map((s) => s.id);

  // キャラクター状態を取得
  const characterStates: Record<string, {
    xp: number;
    level: number;
    name: string;
    login_streak: number;
    last_login_date: string | null;
    character_type: string;
  }> = {};

  if (studentIds.length > 0) {
    const { data: charData } = await supabase
      .from("character_states")
      .select("user_id, xp, level, name, login_streak, last_login_date, character_type")
      .in("user_id", studentIds);

    for (const c of charData || []) {
      characterStates[c.user_id] = {
        xp: c.xp,
        level: c.level,
        name: c.name,
        login_streak: c.login_streak,
        last_login_date: c.last_login_date,
        character_type: c.character_type,
      };
    }
  }

  // チェックリスト進捗カウントを取得（done のみカウント）
  const checklistCounts: Record<string, number> = {};
  if (studentIds.length > 0) {
    const { data: checkData } = await supabase
      .from("checklist_progress")
      .select("user_id, status")
      .in("user_id", studentIds)
      .eq("sub_index", -1)
      .eq("status", "done");

    for (const row of checkData || []) {
      checklistCounts[row.user_id] = (checklistCounts[row.user_id] || 0) + 1;
    }
  }

  // チェックリスト全体の項目数を取得
  const { count: totalCheckItems } = await supabase
    .from("check_items")
    .select("id", { count: "exact", head: true });

  const checklistTotal = totalCheckItems || 0;

  // 生徒データを整形
  const studentInfos = studentList.map((s) => ({
    id: s.id,
    full_name: s.full_name || "",
    email: s.email || "",
    store_id: s.store_id,
    character: characterStates[s.id] || null,
    checklistDone: checklistCounts[s.id] || 0,
    checklistTotal,
  }));

  // 現在の店舗名
  const currentStoreName = stores.length === 1 ? stores[0].name : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStoreName && (
          <p className="text-sm text-gray-500 mb-4">
            担当店舗: <span className="font-bold text-gray-700">{currentStoreName}</span>
          </p>
        )}
        <TeacherDashboardClient
          students={studentInfos}
          stores={stores}
          currentStoreName={currentStoreName}
        />
      </main>
    </div>
  );
}
