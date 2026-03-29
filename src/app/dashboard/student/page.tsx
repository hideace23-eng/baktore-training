import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboard() {
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
  if (profile.role !== "student") redirect("/dashboard/" + profile.role);

  const [{ data: courses }, { data: checklistProgress }] = await Promise.all([
    supabase
      .from("courses")
      .select("*, lessons(*, progress(*))")
      .order("created_at", { ascending: false }),
    supabase
      .from("checklist_progress")
      .select("skill_id, item_index, sub_index, status, rating")
      .eq("user_id", user.id),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">マイダッシュボード</h2>
        <StudentDashboardClient
          courses={courses || []}
          userId={user.id}
          checklistProgress={checklistProgress || []}
        />
      </main>
    </div>
  );
}
