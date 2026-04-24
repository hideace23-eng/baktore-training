"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<{ token: string; role: string; email: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // 招待トークンの検証
  useEffect(() => {
    const token = searchParams.get("invite");
    if (token) {
      setIsSignUp(true);
      (async () => {
        const { data } = await supabase
          .from("invitations")
          .select("token, role, email, expires_at, used_at")
          .eq("token", token)
          .single();

        if (data && !data.used_at && new Date(data.expires_at) > new Date()) {
          setInvitationInfo({ token: data.token, role: data.role, email: data.email });
          setEmail(data.email);
        } else {
          setError("この招待リンクは無効または期限切れです。");
        }
      })();
    }
  }, [searchParams, supabase]);

  // 店舗一覧を取得
  useEffect(() => {
    if (isSignUp) {
      (async () => {
        const { data } = await supabase
          .from("stores")
          .select("id, name")
          .eq("is_active", true)
          .order("name");
        setStores(data || []);
      })();
    }
  }, [isSignUp, supabase]);

  const roleLabels: Record<string, string> = {
    admin: "店長",
    teacher: "先生",
    student: "生徒",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!storeId && stores.length > 0) {
          setError("所属店舗を選択してください。");
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "student",
              store_id: storeId || null,
              ...(invitationInfo ? { invitation_token: invitationInfo.token } : {}),
            },
          },
        });
        if (error) throw error;
        alert("確認メールを送信しました。メールを確認してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">バクトレ研修</h1>
          <p className="text-gray-500 mt-2">
            {isSignUp ? "新規アカウント登録" : "ログイン"}
          </p>
        </div>

        {invitationInfo && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
            <span className="font-bold">{roleLabels[invitationInfo.role] || invitationInfo.role}</span>として招待されています
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  氏名
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                />
              </div>
              {stores.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属店舗
                  </label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  >
                    <option value="">店舗を選択してください</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
              readOnly={!!invitationInfo}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? "処理中..." : isSignUp ? "登録" : "ログイン"}
          </button>
        </form>

        {!invitationInfo && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {isSignUp
                ? "すでにアカウントをお持ちの方はこちら"
                : "新規登録はこちら"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-main flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
