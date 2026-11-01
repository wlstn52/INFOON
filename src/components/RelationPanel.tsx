"use client";

import { useMemo, useState } from "react";
import {
  addRelation,
  deleteRelation,
  relationLabel,
  type Material,
  type MaterialRelation,
} from "@/lib/materials";

type Choice = "cites-out" | "cites-in" | "related";

const CHOICES: { value: Choice; label: string }[] = [
  { value: "cites-out", label: "이 자료가 인용함" },
  { value: "cites-in", label: "이 자료를 인용함" },
  { value: "related", label: "관련 있음" },
];

const selectClass =
  "min-w-0 rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900";

export default function RelationPanel({
  material,
  materials,
  relations,
}: {
  material: Material;
  materials: Material[];
  relations: MaterialRelation[];
}) {
  const [choice, setChoice] = useState<Choice>("cites-out");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mine = relations.filter(
    (r) => r.sourceId === material.id || r.targetId === material.id,
  );

  // 같은 프로젝트 자료를 먼저 보여 준다
  const groups = useMemo(() => {
    const others = materials.filter((m) => m.id !== material.id);
    const names = [...new Set(others.map((m) => m.projectName))].sort((a, b) =>
      a === material.projectName
        ? -1
        : b === material.projectName
          ? 1
          : a.localeCompare(b, "ko"),
    );
    return names.map((name) => ({
      name,
      items: others.filter((m) => m.projectName === name),
    }));
  }, [materials, material.id, material.projectName]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      setTargetId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function handleAdd() {
    if (!targetId) {
      setError("연결할 자료를 골라 주세요.");
      return;
    }
    run(() =>
      choice === "cites-in"
        ? addRelation(targetId, material.id, "cites")
        : addRelation(
            material.id,
            targetId,
            choice === "related" ? "related" : "cites",
          ),
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
      {mine.length === 0 ? (
        <p className="text-xs text-zinc-500">연결된 자료가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {mine.map((r) => {
            const outgoing = r.sourceId === material.id;
            const other = materials.find(
              (m) => m.id === (outgoing ? r.targetId : r.sourceId),
            );
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 break-words">
                  <span className="text-xs text-zinc-500">
                    {relationLabel(r.relation, outgoing)}:{" "}
                  </span>
                  {other?.title ?? "(찾을 수 없음)"}
                  {other && other.projectName !== material.projectName && (
                    <span className="text-xs text-zinc-500">
                      {" "}
                      · {other.projectName}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => deleteRelation(r.id))}
                  className="shrink-0 text-xs text-zinc-500 hover:text-red-600 disabled:opacity-60"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {groups.length === 0 ? (
        <p className="text-xs text-zinc-500">
          연결하려면 자료가 2개 이상 있어야 합니다.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectClass}
            aria-label="관계 종류"
            value={choice}
            onChange={(e) => setChoice(e.target.value as Choice)}
          >
            {CHOICES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className={`${selectClass} flex-1`}
            aria-label="연결할 자료"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">연결할 자료 선택</option>
            {groups.map((g) => (
              <optgroup key={g.name} label={g.name}>
                {g.items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={handleAdd}
            className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52] disabled:opacity-60"
          >
            연결
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
