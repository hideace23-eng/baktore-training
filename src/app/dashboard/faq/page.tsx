import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

const FAQ_DATA = [
  {
    q: "バク転とバク宙、どっちが難しいですか?",
    a: `一般的には「バク宙は手をつかずに空中回転するため、バク転より難しい」と言われることが多いですが、個人差が非常に大きい技です。身体の柔軟性、瞬発力、恐怖心との付き合い方によって、人によっては「バク宙の方が簡単」と感じる方もいます。バクトレでは両方を同じ難易度レベル7として扱っています。`,
  },
  {
    q: "技の難易度レベルはどう決まっていますか?",
    a: `以下の基準で総合的に判断しています。
1. 必要な身体能力（筋力・柔軟性・瞬発力・空間認識）
2. 恐怖心の度合い
3. 習得までの平均的な所要時間
4. 前提となる基礎技の多さ
5. バクトレ講師陣の現場指導経験
ただし、これらはあくまで目安です。自分のペースで挑戦していきましょう。`,
  },
  {
    q: "なぜ前転は3XP、バク宙は38XPなんですか?",
    a: `技の難易度によって獲得できるXPに差をつけることで、「難しい技に挑戦するほどキャラクターが大きく成長する」というゲーム性を持たせています。ただし基礎技もアクロバット全ての土台となる大切な技なので、コツコツ積み上げることで確実にレベルアップできます。`,
  },
  {
    q: "星評価（★1〜★5）でXPはどう変わる?",
    a: `自己評価の星の数に応じて基本XPに倍率がかかります。
★1: ×1.0倍 / ★2: ×1.1倍 / ★3: ×1.25倍 / ★4: ×1.4倍 / ★5: ×1.5倍
例: バク転のチェック項目クリア（基本38XP）を★5で自己評価すると 38×1.5＝57XP獲得。`,
  },
  {
    q: "レベルアップには何XP必要?",
    a: `キャラクターのレベルアップ閾値は技の習得状況に応じて調整していきます。現状はXPを貯めることで着実に成長していきます。`,
  },
  {
    q: "他の生徒と比べてXPが少ない気がする...",
    a: `基礎技を1つずつ丁寧に積み上げることが、結果的に応用技の習得を早めます。焦らず自分のペースで挑戦しましょう。キャラクターの成長は自分自身との対話です。`,
  },
];

export default async function FaqPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/student"
            className="text-blue-600 hover:underline text-sm"
          >
            &larr; ダッシュボードに戻る
          </Link>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          よくある質問（FAQ）
        </h2>
        <div className="space-y-4">
          {FAQ_DATA.map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                  Q{i + 1}
                </span>
                <h3 className="text-base font-bold text-gray-800 leading-snug">
                  {item.q}
                </h3>
              </div>
              <div className="ml-10 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {item.a}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
