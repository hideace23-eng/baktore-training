import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import CharacterDetailClient from "./CharacterDetailClient";

export default async function CharacterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const [{ data: characterState }, { data: xpLogs }] = await Promise.all([
    supabase
      .from("character_states")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("xp_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!characterState) redirect("/dashboard/student");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CharacterDetailClient
          characterState={characterState}
          xpLogs={xpLogs || []}
        />
      </main>
    </div>
  );
}
