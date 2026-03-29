import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
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
  if (profile.role !== "admin") redirect("/dashboard/" + profile.role);

  // 全ユーザー取得
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // 全コース取得
  const { data: courses } = await supabase
    .from("courses")
    .select("*, lessons(*)")
    .order("created_at", { ascending: false });

  // 全進捗取得
  const { data: allProgress } = await supabase
    .from("progress")
    .select("*, profiles(full_name, email), lessons(title, course_id)");

  // 全閲覧ログ取得
  const { data: viewLogs } = await supabase
    .from("view_logs")
    .select("*, profiles(full_name, email), lessons(title)")
    .order("viewed_at", { ascending: false })
    .limit(100);

  // チェックリスト進捗を取得（全生徒分）
  const { data: checklistProgress } = await supabase
    .from("checklist_progress")
    .select("user_id, skill_id, item_index, sub_index, status, rating, updated_at");

  // 生徒一覧
  const students = (users || []).filter((u) => u.role === "student");
  const studentMap = new Map(students.map((s) => [s.id, s]));
  const checklistWithStudents = (checklistProgress || []).map((cp) => {
    const student = studentMap.get(cp.user_id);
    return {
      ...cp,
      full_name: student?.full_name || "",
      email: student?.email || "",
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboardClient
          users={users || []}
          courses={courses || []}
          progress={allProgress || []}
          viewLogs={viewLogs || []}
          checklistProgress={checklistWithStudents}
          students={students}
        />
      </main>
    </div>
  );
}
