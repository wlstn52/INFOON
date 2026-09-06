"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/mockAuth";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !password) {
      setError("아이디와 비밀번호를 모두 입력해 주세요.");
      return;
    }
    try {
      login(id, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
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
          아이디
          <input
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
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
          className="mt-2 rounded-full bg-[#1b4965] px-4 py-2 font-medium text-white transition-colors hover:bg-[#163a52]"
        >
          로그인
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
