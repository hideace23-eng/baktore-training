import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // プロフィール取得
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // トリガーが動いていない場合、アプリ側でプロフィールを自動作成
  if (!profile) {
    const meta = user.user_metadata || {};

    // 招待トークン経由の場合、招待されたロールを使用
    let assignedRole = "student";
    if (meta.invitation_token) {
      const { data: invitation } = await supabase
        .from("invitations")
        .select("role, used_at")
        .eq("token", meta.invitation_token)
        .single();

      if (invitation && !invitation.used_at) {
        assignedRole = invitation.role;
        // 招待を使用済みにする
        await supabase
          .from("invitations")
          .update({ used_at: new Date().toISOString() })
          .eq("token", meta.invitation_token);
      }
    }

    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email || "",
        full_name: meta.full_name || "",
        role: assignedRole,
        store_id: meta.store_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create profile:", error);
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              プロフィール作成エラー
            </h1>
            <p className="text-gray-600 text-sm mb-2">
              Supabase SQL Editor で最新のマイグレーションSQLを実行済みか確認してください。
            </p>
            <p className="text-red-500 text-xs mt-2">{error.message}</p>
          </div>
        </div>
      );
    }

    profile = newProfile;
  }

  switch (profile.role) {
    case "super_admin":
      redirect("/dashboard/admin");
    case "admin":
      redirect("/dashboard/admin");
    case "teacher":
      redirect("/dashboard/teacher");
    case "guest":
      redirect("/dashboard/student");
    case "student":
    default:
      redirect("/dashboard/student");
  }
}
