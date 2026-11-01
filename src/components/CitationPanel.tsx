"use client";

import { useState } from "react";

export default function CitationPanel({ citation }: { citation: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);

  async function handleCopy() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(citation);
    } catch {
      ok = false;
    }
    setCopied(ok);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
      <p className="break-words text-sm">{citation}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52]"
        >
          복사
        </button>
        {copied !== null && (
          <span
            className={`text-xs ${copied ? "text-emerald-600" : "text-red-600"}`}
          >
            {copied
              ? "복사되었습니다."
              : "복사에 실패했습니다. 직접 선택해서 복사해 주세요."}
          </span>
        )}
      </div>
    </div>
  );
}
