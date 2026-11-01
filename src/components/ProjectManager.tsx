"use client";

import { useEffect, useState } from "react";
import { refreshMaterials, type Material } from "@/lib/materials";

type Project = {
  id: string;
  name: string;
  goal: string;
  shareToken: string | null;
};

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const buttonClass =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400";

async function readError(res: Response) {
  const data = await res.json().catch(() => null);
  return data?.error ?? "요청에 실패했습니다.";
}

function ProjectRow({
  project,
  materialCount,
  onSaved,
  onDeleted,
}: {
  project: Project;
  materialCount: number;
  onSaved: (before: Project, after: Project) => void;
  onDeleted: (project: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [goal, setGoal] = useState(project.goal);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const changed = name.trim() !== project.name || goal.trim() !== project.goal;

  async function handleSave() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const updated: Project = await res.json();
      setName(updated.name);
      setGoal(updated.goal);
      setSaved(true);
      onSaved(project, updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res));
      onDeleted(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제하지 못했습니다.");
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <span>자료 {materialCount}건</span>
        {project.shareToken && <span>· 공유 중</span>}
      </div>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        프로젝트 이름
        <input
          className={inputClass}
          value={name}
          maxLength={200}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        프로젝트 목표
        <textarea
          className={`${inputClass} h-16`}
          value={goal}
          maxLength={1000}
          placeholder={
            project.shareToken
              ? "공유 페이지에도 표시됩니다"
              : "이 프로젝트로 하려는 일"
          }
          onChange={(e) => {
            setGoal(e.target.value);
            setSaved(false);
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !changed || !name.trim()}
          onClick={handleSave}
          className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52] disabled:opacity-50"
        >
          저장
        </button>
        {saved && <span className="text-xs text-emerald-600">저장되었습니다.</span>}
        {confirmDelete ? (
          <>
            <span className="text-xs text-red-600">
              자료 {materialCount}건
              {project.shareToken && "과 공유 링크"}도 함께 삭제됩니다. 되돌릴 수
              없습니다.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              프로젝트 삭제
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className={buttonClass}
            >
              취소
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-red-600 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            삭제
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}

export default function ProjectManager({
  materials,
  onRenamed,
}: {
  materials: Material[];
  onRenamed: (before: string, after: string) => void;
}) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/projects")
      .then(async (res) => {
        if (!res.ok) throw new Error(await readError(res));
        return res.json();
      })
      .then((data: Project[]) => {
        if (active) setProjects(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : "프로젝트를 불러오지 못했습니다.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function handleSaved(before: Project, after: Project) {
    setProjects(
      (list) => list?.map((p) => (p.id === after.id ? after : p)) ?? null,
    );
    if (before.name !== after.name) {
      onRenamed(before.name, after.name);
      refreshMaterials();
    }
  }

  function handleDeleted(project: Project) {
    setProjects((list) => list?.filter((p) => p.id !== project.id) ?? null);
    refreshMaterials();
  }

  return (
    <div className="flex flex-col gap-3 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!projects && !error && (
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      )}
      {projects?.length === 0 && (
        <p className="text-sm text-zinc-500">
          프로젝트가 없습니다. 자료를 등록하면 만들어집니다.
        </p>
      )}
      {projects && projects.length > 0 && (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              materialCount={
                materials.filter((m) => m.projectName === p.name).length
              }
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
