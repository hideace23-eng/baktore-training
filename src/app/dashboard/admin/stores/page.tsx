import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import StoresAdminClient from "./StoresAdminClient";

export default async function StoresAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/dashboard");
  if (profile.role !== "super_admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">店舗管理</h2>
          <a href="/dashboard/admin" className="text-blue-600 hover:underline text-sm">管理画面に戻る</a>
        </div>
        <StoresAdminClient />
      </main>
    </div>
  );
}
