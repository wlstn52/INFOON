"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  signOut,
  subscribe,
} from "@/lib/auth";

export default function SiteHeader() {
  const router = useRouter();
  const { loading, user: session } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-[#1b4965]">
            INFOON
          </span>
          <span className="hidden text-sm text-zinc-500 sm:inline">
            연구 및 교육 자료 정리, 열람 서비스
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <a href="#materials" className="text-zinc-600 hover:text-[#1b4965] dark:text-zinc-400">
            자료 확인하기
          </a>
          <a href="#new-material" className="text-zinc-600 hover:text-[#1b4965] dark:text-zinc-400">
            새 자료 등록
          </a>
          {loading ? null : session ? (
            <div className="flex items-center gap-3">
              <span className="text-zinc-600 dark:text-zinc-400">
                {session.name}님
              </span>
              <button
                onClick={handleLogout}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[#1b4965] px-4 py-1.5 text-white transition-colors hover:bg-[#163a52]"
            >
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
