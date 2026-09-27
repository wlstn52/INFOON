"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type Material,
} from "@/lib/materials";

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
      </div>

      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          조건에 맞는 자료가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-2 rounded border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800"
            >
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
          ))}
        </div>
      )}
    </div>
  );
}
