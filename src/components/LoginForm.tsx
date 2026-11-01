"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth";

export default function LoginForm({ confirmFailed }: { confirmFailed: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    confirmFailed
      ? "자동 로그인에 실패했습니다. 이메일 인증은 완료됐을 수 있으니 아래에서 로그인해 보세요."
      : "",
  );
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-center text-2xl font-bold tracking-tight text-[#1b4965]">
        로그인
      </h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-lg border border-black/10 p-5 dark:border-white/10"
      >
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            type="email"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            type="password"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-full bg-[#1b4965] px-4 py-2 font-medium text-white transition-colors hover:bg-[#163a52] disabled:opacity-60"
        >
          {busy ? "로그인 중..." : "로그인"}
        </button>
        <p className="text-center text-sm text-zinc-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-[#1b4965]">
            회원가입
          </Link>
        </p>
      </form>
    </main>
  );
}
