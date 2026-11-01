"use client";

import { useState } from "react";
import { buildBibliography } from "@/lib/bibliography";
import { CITATION_STYLES, type CitationStyle } from "@/lib/citation";
import { downloadText, toBibtex, toCsv } from "@/lib/exportFormats";
import type { Material } from "@/lib/materials";

const buttonClass =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400";

export default function BibliographyPanel({
  materials,
  style,
  fileBase,
}: {
  materials: Material[];
  style: CitationStyle;
  fileBase: string;
}) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const entries = buildBibliography(materials, style);
  const text = entries.join("\n");
  const styleLabel = CITATION_STYLES.find((s) => s.value === style)?.label;

  async function handleCopy() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopied(ok);
    setTimeout(() => setCopied(null), 2000);
  }

  if (entries.length === 0) {
    return (
      <p className="rounded bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-zinc-800">
        현재 목록에 자료가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          현재 목록 {entries.length}건 · {styleLabel}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52]"
        >
          전체 복사
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(`${fileBase}-참고문헌.txt`, `${text}\n`, "text/plain;charset=utf-8")
          }
          className={buttonClass}
        >
          TXT 저장
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(`${fileBase}.bib`, toBibtex(materials), "application/x-bibtex;charset=utf-8")
          }
          className={buttonClass}
        >
          BibTeX 저장
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(`${fileBase}.csv`, toCsv(materials), "text/csv;charset=utf-8")
          }
          className={buttonClass}
        >
          CSV 저장
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
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto text-sm">
        {entries.map((entry) => (
          <li key={entry} className="break-words">
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}
