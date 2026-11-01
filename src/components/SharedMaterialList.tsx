"use client";

import { useState } from "react";
import BibliographyPanel from "@/components/BibliographyPanel";
import CitationPanel from "@/components/CitationPanel";
import {
  CITATION_STYLES,
  formatCitation,
  type CitationStyle,
} from "@/lib/citation";
import {
  relationLabel,
  type Material,
  type RelationType,
} from "@/lib/materials";

export type SharedMaterial = Material & {
  relations?: { relation: RelationType; outgoing: boolean; title: string }[];
};

export default function SharedMaterialList({
  materials,
}: {
  materials: SharedMaterial[];
}) {
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showBibliography, setShowBibliography] = useState(false);

  if (materials.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        아직 등록된 자료가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowBibliography((v) => !v)}
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
        >
          {showBibliography ? "− 참고문헌 닫기" : "+ 참고문헌·내보내기"}
        </button>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
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
      </div>

      {showBibliography && (
        <BibliographyPanel
          materials={materials}
          style={style}
          fileBase={`INFOON-${materials[0].projectName}`}
        />
      )}

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
            {m.relations && m.relations.length > 0 && (
              <ul className="flex flex-col gap-0.5 text-sm">
                {m.relations.map((r) => (
                  <li
                    key={`${r.relation}-${r.outgoing}-${r.title}`}
                    className="break-words text-zinc-600 dark:text-zinc-400"
                  >
                    <span className="text-xs text-zinc-500">
                      {relationLabel(r.relation, r.outgoing)}:{" "}
                    </span>
                    {r.title}
                  </li>
                ))}
              </ul>
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
