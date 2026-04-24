import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";

const SECTIONS = [
  { id: "hello", title: "こんにちは！" },
  { id: "about", title: "バクトレってなに？" },
  { id: "xp", title: "レベルとXP" },
  { id: "categories", title: "わざのカテゴリー" },
  { id: "checks", title: "チェックのつけかた" },
  { id: "prereq", title: "ぜんていわざって？" },
  { id: "skilltree", title: "スキルツリーの見かた" },
  { id: "teacher", title: "先生がチェックしてくれたとき" },
  { id: "help", title: "こまったら？" },
];

export default async function GuidePage() {
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
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-pink-50 to-blue-50">
      <Header profile={profile} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/student"
            className="text-blue-600 hover:underline text-sm"
          >
            ← ダッシュボードにもどる
          </Link>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2">
          🎪 <ruby>使<rp>(</rp><rt>つか</rt><rp>)</rp></ruby>いかたガイド 🎪
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          アクロくんといっしょに見てみよう！
        </p>

        {/* アクロくん吹き出し */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-8 border-2 border-yellow-300 relative">
          <div className="flex items-start gap-3">
            <div className="text-4xl flex-shrink-0">🤸</div>
            <div>
              <p className="font-bold text-yellow-700 text-sm mb-1">アクロくん</p>
              <p className="text-sm text-gray-700">
                やあ！ぼくはアクロくん！このページで、バクトレの<ruby>使<rp>(</rp><rt>つか</rt><rp>)</rp></ruby>いかたを<ruby>全部<rp>(</rp><rt>ぜんぶ</rt><rp>)</rp></ruby>おしえるよ！
                <br />
                <span className="text-yellow-600 font-bold">下の目もくじ</span>からすきなところにジャンプできるよ 🚀
              </p>
            </div>
          </div>
        </div>

        {/* 目次 */}
        <nav className="bg-white rounded-2xl shadow-md p-5 mb-10 border-2 border-blue-200">
          <p className="text-sm font-bold text-blue-500 tracking-wider mb-3">
            📋 もくじ
          </p>
          <ol className="space-y-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-blue-600 hover:underline hover:text-blue-800 flex items-center gap-2"
                >
                  <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-8">
          {/* 1. こんにちは！ */}
          <section id="hello">
            <div className="rounded-2xl bg-gradient-to-br from-yellow-200 via-yellow-100 to-orange-100 p-6 shadow-md border border-yellow-300">
              <h3 className="text-xl font-bold text-yellow-800 mb-3">
                👋 1. こんにちは！
              </h3>
              <div className="bg-white/70 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">🤸</div>
                  <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                    <p className="font-bold text-lg text-yellow-700">
                      ようこそバクトレへ！🎉
                    </p>
                    <p>
                      ぼくはアクロくん！きみの<ruby>練習<rp>(</rp><rt>れんしゅう</rt><rp>)</rp></ruby>をおうえんするよ！
                    </p>
                    <p>
                      バクトレは、アクロバットの<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>を<ruby>楽<rp>(</rp><rt>たの</rt><rp>)</rp></ruby>しくおぼえられるアプリだよ。
                      いっしょにがんばろう！💪
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. バクトレってなに？ */}
          <section id="about">
            <div className="rounded-2xl bg-gradient-to-br from-pink-200 via-pink-100 to-rose-100 p-6 shadow-md border border-pink-300">
              <h3 className="text-xl font-bold text-pink-800 mb-3">
                🤔 2. バクトレってなに？
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>
                  バクトレは、<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>の<ruby>練習<rp>(</rp><rt>れんしゅう</rt><rp>)</rp></ruby>をゲームみたいに<ruby>楽<rp>(</rp><rt>たの</rt><rp>)</rp></ruby>しくできるしくみだよ！
                </p>
                <div className="bg-white/70 rounded-xl p-4 space-y-2 border border-pink-200">
                  <p>✅ <ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>をれんしゅうしたらチェックをつける</p>
                  <p>⬆️ チェックすると<ruby>経験値<rp>(</rp><rt>けいけんち</rt><rp>)</rp></ruby>（XP）がもらえる</p>
                  <p>🌟 XPがたまるとレベルアップ！</p>
                  <p>🗺️ スキルツリーで次の<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>がわかる</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-pink-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-pink-700 font-bold">
                      まいにちちょっとずつれんしゅうして、どんどん<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>をおぼえよう！すごいね！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. レベルとXP */}
          <section id="xp">
            <div className="rounded-2xl bg-gradient-to-br from-green-200 via-emerald-100 to-teal-100 p-6 shadow-md border border-green-300">
              <h3 className="text-xl font-bold text-green-800 mb-3">
                ⚡ 3. レベルとXP
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>
                  RPGゲームとおなじで、<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>のれんしゅうをするとXP（<ruby>経験値<rp>(</rp><rt>けいけんち</rt><rp>)</rp></ruby>）がもらえるよ！
                </p>

                <div className="bg-white/70 rounded-xl p-4 border border-green-200">
                  <p className="font-bold text-green-700 mb-2">🎮 ゲームとおなじしくみ！</p>
                  <div className="space-y-2">
                    <p>🟢 かんたんな<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>（<ruby>前転<rp>(</rp><rt>ぜんてん</rt><rp>)</rp></ruby>など）→ すこしXPゲット</p>
                    <p>🟡 ふつうの<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>（<ruby>側転<rp>(</rp><rt>そくてん</rt><rp>)</rp></ruby>など）→ もっとXPゲット</p>
                    <p>🔴 むずかしい<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>（バク<ruby>転<rp>(</rp><rt>てん</rt><rp>)</rp></ruby>など）→ いっぱいXPゲット！</p>
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-4 border border-green-200">
                  <p className="font-bold text-green-700 mb-2">🐣 キャラクターがそだつ！</p>
                  <div className="flex flex-wrap items-center gap-2 text-lg">
                    <span className="bg-green-100 rounded-lg px-3 py-1">🥚 タマゴ</span>
                    <span>→</span>
                    <span className="bg-yellow-100 rounded-lg px-3 py-1">🐥 ひよこ</span>
                    <span>→</span>
                    <span className="bg-orange-100 rounded-lg px-3 py-1">🧒 こども</span>
                    <span>→</span>
                    <span className="bg-blue-100 rounded-lg px-3 py-1">🧑 わかもの</span>
                    <span>→</span>
                    <span className="bg-purple-100 rounded-lg px-3 py-1">🌟 プロ</span>
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-3 border border-green-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-green-700 font-bold">
                      たくさんれんしゅうして、キャラクターをそだてよう！がんばろう！🔥
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 技のカテゴリー */}
          <section id="categories">
            <div className="rounded-2xl bg-gradient-to-br from-indigo-200 via-indigo-100 to-blue-100 p-6 shadow-md border border-indigo-300">
              <h3 className="text-xl font-bold text-indigo-800 mb-3">
                🏷️ 4. <ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>のカテゴリー
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                <ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>は6つのなかまにわかれているよ！
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-purple-500 text-white p-4 text-center shadow-md">
                  <p className="text-2xl mb-1">🟣</p>
                  <p className="font-bold">ベース</p>
                  <p className="text-xs opacity-90"><ruby>基本<rp>(</rp><rt>きほん</rt><rp>)</rp></ruby>のうごき</p>
                </div>
                <div className="rounded-xl bg-blue-500 text-white p-4 text-center shadow-md">
                  <p className="text-2xl mb-1">🔵</p>
                  <p className="font-bold">フロント</p>
                  <p className="text-xs opacity-90"><ruby>前<rp>(</rp><rt>まえ</rt><rp>)</rp></ruby>まわり<ruby>系<rp>(</rp><rt>けい</rt><rp>)</rp></ruby></p>
                </div>
                <div className="rounded-xl bg-red-500 text-white p-4 text-center shadow-md">
                  <p className="text-2xl mb-1">🔴</p>
                  <p className="font-bold">バック</p>
                  <p className="text-xs opacity-90"><ruby>後<rp>(</rp><rt>うし</rt><rp>)</rp></ruby>ろまわり<ruby>系<rp>(</rp><rt>けい</rt><rp>)</rp></ruby></p>
                </div>
                <div className="rounded-xl bg-green-500 text-white p-4 text-center shadow-md">
                  <p className="text-2xl mb-1">🟢</p>
                  <p className="font-bold">サイド</p>
                  <p className="text-xs opacity-90">よこまわり<ruby>系<rp>(</rp><rt>けい</rt><rp>)</rp></ruby></p>
                </div>
                <div className="rounded-xl bg-gradient-to-r from-pink-500 to-blue-500 text-white p-4 text-center shadow-md">
                  <p className="text-2xl mb-1">🌈</p>
                  <p className="font-bold">コンボ</p>
                  <p className="text-xs opacity-90"><ruby>組<rp>(</rp><rt>く</rt><rp>)</rp></ruby>みあわせ<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby></p>
                </div>
                <div className="rounded-xl bg-lime-500 text-white p-4 text-center shadow-md">
                  <p className="text-2xl mb-1">✨</p>
                  <p className="font-bold">スペシャル</p>
                  <p className="text-xs opacity-90"><ruby>特別<rp>(</rp><rt>とくべつ</rt><rp>)</rp></ruby>な<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby></p>
                </div>
              </div>
              <div className="bg-white/70 rounded-xl p-3 mt-4 border border-indigo-200">
                <div className="flex items-start gap-2">
                  <span className="text-2xl flex-shrink-0">🤸</span>
                  <p className="text-indigo-700 font-bold text-sm">
                    まずはベースからはじめて、すきなカテゴリーにちょうせんしよう！
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 5. チェックのつけかた */}
          <section id="checks">
            <div className="rounded-2xl bg-gradient-to-br from-amber-200 via-amber-100 to-yellow-100 p-6 shadow-md border border-amber-300">
              <h3 className="text-xl font-bold text-amber-800 mb-3">
                ✅ 5. チェックのつけかた
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <div className="bg-white/70 rounded-xl p-4 border border-amber-200 space-y-2">
                  <p className="font-bold text-amber-700">📱 タップでかんたん！</p>
                  <p>1️⃣ <ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>のページをひらく</p>
                  <p>2️⃣ できたこうもくの□をタップ！</p>
                  <p>3️⃣ チェック ✅ がつくよ！</p>
                </div>

                <div className="bg-white/70 rounded-xl p-4 border border-amber-200">
                  <p className="font-bold text-amber-700 mb-2">⭐ ★のいみ（じこひょうか）</p>
                  <p className="mb-2">
                    じぶんが「どのくらいできたかな？」を★でつけられるよ！
                    <br />
                    ★がおおいほど、もらえるXPがふえる！
                  </p>
                  <div className="space-y-1.5 bg-amber-50 rounded-lg p-3">
                    <p>⭐ ★1つ → ふつう（×1.0ばい）</p>
                    <p>⭐⭐ ★2つ → まあまあ（×1.1ばい）</p>
                    <p>⭐⭐⭐ ★3つ → いいかんじ！（×1.25ばい）</p>
                    <p>⭐⭐⭐⭐ ★4つ → すごい！（×1.4ばい）</p>
                    <p>⭐⭐⭐⭐⭐ ★5つ → <ruby>完璧<rp>(</rp><rt>かんぺき</rt><rp>)</rp></ruby>！（×1.5ばい）</p>
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-3 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-amber-700 font-bold">
                      ★5つをめざしてれんしゅうしよう！すごいね！✨
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 6. 前提技って？ */}
          <section id="prereq">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-200 via-cyan-100 to-sky-100 p-6 shadow-md border border-cyan-300">
              <h3 className="text-xl font-bold text-cyan-800 mb-3">
                🔓 6. <ruby>前提<rp>(</rp><rt>ぜんてい</rt><rp>)</rp></ruby><ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>って？
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>
                  ゲームとおなじで、<ruby>前<rp>(</rp><rt>まえ</rt><rp>)</rp></ruby>のステージをクリアしないとつぎにすすめないよ！
                </p>

                <div className="bg-white/70 rounded-xl p-4 border border-cyan-200">
                  <p className="font-bold text-cyan-700 mb-2">🎮 たとえばこんなかんじ！</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-green-400 text-white rounded-full px-3 py-1 text-xs font-bold">クリア✅</span>
                      <span>ブリッジ</span>
                    </div>
                    <div className="text-center text-lg">⬇️</div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-400 text-white rounded-full px-3 py-1 text-xs font-bold">クリア✅</span>
                      <span><ruby>後転倒立<rp>(</rp><rt>こうてんとうりつ</rt><rp>)</rp></ruby></span>
                    </div>
                    <div className="text-center text-lg">⬇️</div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-400 text-white rounded-full px-3 py-1 text-xs font-bold">クリア✅</span>
                      <span><ruby>後方転回<rp>(</rp><rt>こうほうてんかい</rt><rp>)</rp></ruby></span>
                    </div>
                    <div className="text-center text-lg">⬇️</div>
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-400 text-white rounded-full px-3 py-1 text-xs font-bold animate-pulse">アンロック🔓</span>
                      <span className="font-bold">バク<ruby>転<rp>(</rp><rt>てん</rt><rp>)</rp></ruby>！</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-3 border border-cyan-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-cyan-700 font-bold">
                      この<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>をクリアすると<ruby>次<rp>(</rp><rt>つぎ</rt><rp>)</rp></ruby>の<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>がひらく！コツコツすすめよう！🔑
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. スキルツリーの見かた */}
          <section id="skilltree">
            <div className="rounded-2xl bg-gradient-to-br from-violet-200 via-violet-100 to-purple-100 p-6 shadow-md border border-violet-300">
              <h3 className="text-xl font-bold text-violet-800 mb-3">
                🗺️ 7. スキルツリーの見かた
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>
                  スキルツリーは<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>の<ruby>地図<rp>(</rp><rt>ちず</rt><rp>)</rp></ruby>みたいなもの！ぼうけんマップとおなじだよ！
                </p>
                <div className="bg-white/70 rounded-xl p-4 border border-violet-200 space-y-2">
                  <p>🟢 <span className="font-bold text-green-600">みどり</span> → もうクリアした<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby></p>
                  <p>🟡 <span className="font-bold text-yellow-600">きいろ</span> → いまちょうせんできる<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby></p>
                  <p>🔒 <span className="font-bold text-gray-500">グレー</span> → まだロックされている<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby></p>
                </div>
                <div className="text-center">
                  <Link
                    href="/dashboard/skill-tree"
                    className="inline-block bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-full px-6 py-3 shadow-md text-sm transition-colors"
                  >
                    🗺️ スキルツリーを見にいく！
                  </Link>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-violet-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-violet-700 font-bold">
                      マップをひらいて、つぎにめざす<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>をさがそう！ぼうけんのはじまりだ！🏴‍☠️
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 8. 先生がチェックしてくれたとき */}
          <section id="teacher">
            <div className="rounded-2xl bg-gradient-to-br from-rose-200 via-rose-100 to-pink-100 p-6 shadow-md border border-rose-300">
              <h3 className="text-xl font-bold text-rose-800 mb-3">
                👨‍🏫 8. <ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>がチェックしてくれたとき
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <p>
                  <ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>がきみの<ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>を見て「できたね！」とおもったら、<ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>がかわりにチェックをつけてくれることがあるよ！
                </p>
                <div className="bg-white/70 rounded-xl p-4 border border-rose-200 space-y-2">
                  <p>📝 <ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>チェック → じどうでXPがもらえる！</p>
                  <p>🎯 <ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>の<ruby>評価<rp>(</rp><rt>ひょうか</rt><rp>)</rp></ruby>だから★もいっしょにつく！</p>
                  <p>🤩 ダッシュボードにもどるとXPがふえてる！</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-rose-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-rose-700 font-bold">
                      <ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>に見てもらえるように、<ruby>練習<rp>(</rp><rt>れんしゅう</rt><rp>)</rp></ruby>をがんばろう！やったね！🙌
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 9. こまったら？ */}
          <section id="help">
            <div className="rounded-2xl bg-gradient-to-br from-teal-200 via-teal-100 to-emerald-100 p-6 shadow-md border border-teal-300">
              <h3 className="text-xl font-bold text-teal-800 mb-3">
                🆘 9. こまったら？
              </h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                <div className="bg-white/70 rounded-xl p-4 border border-teal-200 space-y-3">
                  <p className="font-bold text-teal-700">こまったときは…</p>
                  <p>
                    🙋 <ruby>技<rp>(</rp><rt>わざ</rt><rp>)</rp></ruby>のやりかたがわからない → <span className="font-bold"><ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>にきこう！</span>
                  </p>
                  <p>
                    📱 アプリのそうさがわからない → <span className="font-bold"><ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>にきこう！</span>
                  </p>
                  <p>
                    ❓ よくあるしつもんを見たい →{" "}
                    <Link
                      href="/dashboard/faq"
                      className="text-teal-600 hover:underline font-bold"
                    >
                      FAQページへ 📖
                    </Link>
                  </p>
                </div>
                <div className="bg-white/70 rounded-xl p-3 border border-teal-200">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl flex-shrink-0">🤸</span>
                    <p className="text-teal-700 font-bold">
                      はずかしがらないでだいじょうぶ！<ruby>先生<rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>はいつでもたすけてくれるよ！
                      <br />
                      <ruby>無理<rp>(</rp><rt>むり</rt><rp>)</rp></ruby>せず、じぶんのペースでちょうせんしよう！💖
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* フッターメッセージ */}
        <div className="mt-10 text-center bg-white rounded-2xl shadow-md p-6 border-2 border-yellow-300">
          <p className="text-3xl mb-2">🤸✨🎪</p>
          <p className="font-bold text-lg text-yellow-700 mb-1">
            さあ、れんしゅうをはじめよう！
          </p>
          <p className="text-sm text-gray-600">
            アクロくんはいつもきみをおうえんしてるよ！
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/student"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-full px-8 py-3 shadow-md text-sm transition-colors"
            >
              🏠 ダッシュボードにもどる
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
