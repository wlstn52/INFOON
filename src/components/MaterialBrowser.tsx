"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  deleteMaterial,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type Material,
} from "@/lib/materials";
import {
  CITATION_STYLES,
  formatCitation,
  type CitationStyle,
} from "@/lib/citation";

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "importance", label: "중요도순" },
  { value: "title", label: "이름순" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const selectClass =
  "rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function MaterialBrowser() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const materials: Material[] = JSON.parse(raw);

  const [project, setProject] = useState("전체");
  const [type, setType] = useState("전체");
  const [sort, setSort] = useState<SortValue>("latest");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ id: string; ok: boolean } | null>(
    null,
  );

  async function handleCopy(id: string, text: string) {
    let ok = true;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      ok = false;
    }
    setCopied({ id, ok });
    setTimeout(() => setCopied((c) => (c?.id === id ? null : c)), 2000);
  }

  const projects = useMemo(
    () => ["전체", ...new Set(materials.map((m) => m.projectName))],
    [materials],
  );
  const types = useMemo(
    () => ["전체", ...new Set(materials.map((m) => m.type))],
    [materials],
  );

  const visible = useMemo(() => {
    const filtered = materials.filter(
      (m) =>
        (project === "전체" || m.projectName === project) &&
        (type === "전체" || m.type === type),
    );
    const sorted = [...filtered];
    if (sort === "latest") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "importance") {
      sorted.sort((a, b) => b.importance - a.importance);
    } else {
      sorted.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    }
    return sorted;
  }, [materials, project, type, sort]);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-3">
        <select
          className={selectClass}
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          인용 양식
          <select
            className={selectClass}
            value={citationStyle}
            onChange={(e) => setCitationStyle(e.target.value as CitationStyle)}
          >
            {CITATION_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          조건에 맞는 자료가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((m) => {
            const isOpen = openId === m.id;
            const citation = isOpen ? formatCitation(m, citationStyle) : "";
            return (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-zinc-500">
                      {m.projectName} · {m.type} · {m.location}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600 sm:max-w-xs sm:text-right dark:text-zinc-400">
                    {m.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : m.id)}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
                  >
                    {isOpen ? "− 인용 닫기" : "+ 인용"}
                  </button>

                  {confirmDeleteId === m.id ? (
                    <>
                      <span className="text-xs text-red-600">
                        정말 삭제할까요?
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          deleteMaterial(m.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
                      >
                        삭제
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(m.id)}
                      className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-red-600 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400"
                    >
                      삭제
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
                    <p className="break-words text-sm">{citation}</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, citation)}
                        className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52]"
                      >
                        복사
                      </button>
                      {copied?.id === m.id && (
                        <span
                          className={`text-xs ${copied.ok ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {copied.ok
                            ? "복사되었습니다."
                            : "복사에 실패했습니다. 직접 선택해서 복사해 주세요."}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
