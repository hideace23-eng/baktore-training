import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ act_as?: string }>;
}) {
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

  const params = await searchParams;
  const actAsParam = params.act_as;

  // act_as モード判定: teacher/admin/super_admin のみ使用可能
  const isPrivileged = ["teacher", "admin", "super_admin"].includes(profile.role);
  const actAsUserId = isPrivileged && actAsParam ? actAsParam : null;
  const targetUserId = actAsUserId || user.id;

  // 通常のロール別リダイレクト（act_asでない場合のみ）
  if (!actAsUserId) {
    if (profile.role !== "student" && profile.role !== "guest") {
      const dest = profile.role === "super_admin" || profile.role === "admin" ? "admin" : "teacher";
      redirect("/dashboard/" + dest);
    }
  }

  // act_as の場合、対象ユーザーのプロフィールを取得
  let targetProfile = profile;
  if (actAsUserId) {
    const { data: targetProf } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", actAsUserId)
      .single();

    if (!targetProf) {
      redirect("/dashboard/teacher");
    }
    targetProfile = targetProf;
  }

  const [{ data: courses }, { data: checklistProgress }, { data: characterState }] = await Promise.all([
    supabase
      .from("courses")
      .select("*, lessons(*, progress(*))")
      .order("created_at", { ascending: false }),
    supabase
      .from("checklist_progress")
      .select("skill_id, item_index, sub_index, status, rating")
      .eq("user_id", targetUserId),
    supabase
      .from("character_states")
      .select("*")
      .eq("user_id", targetUserId)
      .single(),
  ]);

  // act_as モード情報
  const actAsMode = actAsUserId
    ? {
        targetUserId: actAsUserId,
        targetName: targetProfile.full_name || targetProfile.email || "",
        actorId: user.id,
        actorName: profile.full_name || profile.email || "",
      }
    : undefined;

  return (
    <div className="min-h-screen bg-gradient-main">
      <Header profile={actAsUserId ? targetProfile : profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">マイダッシュボード</h2>
        <StudentDashboardClient
          courses={courses || []}
          userId={targetUserId}
          checklistProgress={checklistProgress || []}
          initialCharacterState={characterState}
          actAsMode={actAsMode}
        />
      </main>
    </div>
  );
}
