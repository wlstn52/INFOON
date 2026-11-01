"use client";

import { useState } from "react";
import CitationPanel from "@/components/CitationPanel";
import {
  CITATION_STYLES,
  formatCitation,
  type CitationStyle,
} from "@/lib/citation";
import type { Material } from "@/lib/materials";

export default function SharedMaterialList({
  materials,
}: {
  materials: Material[];
}) {
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [openId, setOpenId] = useState<string | null>(null);

  if (materials.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        아직 등록된 자료가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 self-end text-sm text-zinc-600 dark:text-zinc-400">
        인용 양식
        <select
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={style}
          onChange={(e) => setStyle(e.target.value as CitationStyle)}
        >
          {CITATION_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {materials.map((m) => {
        const isOpen = openId === m.id;
        const source = m.journal ?? m.publisher ?? m.organization;
        const meta = [m.type, m.year, source].filter(Boolean).join(" · ");
        return (
          <div
            key={m.id}
            className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-zinc-500">{meta}</p>
            </div>
            {m.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {m.description}
              </p>
            )}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : m.id)}
              className="self-start rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
            >
              {isOpen ? "− 인용 닫기" : "+ 인용"}
            </button>
            {isOpen && <CitationPanel citation={formatCitation(m, style)} />}
          </div>
        );
      })}
    </div>
  );
}
