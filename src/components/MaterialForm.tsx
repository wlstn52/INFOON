"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  addMaterial,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type Material,
} from "@/lib/materials";

const IMPORTANCE_OPTIONS = [1, 2, 3, 4, 5];

const inputClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function MaterialForm() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const materials: Material[] = JSON.parse(raw);
  const projectNames = useMemo(
    () => [...new Set(materials.map((m) => m.projectName))],
    [materials],
  );
  const typeNames = useMemo(
    () => [...new Set(materials.map((m) => m.type))],
    [materials],
  );

  const [projectName, setProjectName] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [importance, setImportance] = useState(3);
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName || !title || !type) {
      setMessage("");
      setError("프로젝트, 자료명, 자료 종류는 필수 입력 항목입니다.");
      return;
    }
    addMaterial({
      projectName,
      title,
      type,
      location,
      importance,
      description,
      author: author || undefined,
      publisher: publisher || undefined,
      year: year || undefined,
      url: url || undefined,
    });
    setProjectName("");
    setTitle("");
    setType("");
    setLocation("");
    setImportance(3);
    setDescription("");
    setAuthor("");
    setPublisher("");
    setYear("");
    setUrl("");
    setError("");
    setMessage("자료가 등록되었습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5">
      <label className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          프로젝트
        </span>
        <input
          className={`${inputClass} flex-1`}
          list="project-options"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <datalist id="project-options">
          {projectNames.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>

      <label className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          자료명
        </span>
        <input
          className={`${inputClass} flex-1`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
        >
          {showDetails ? "− 세부 사항" : "+ 세부 사항"}
        </button>
      </label>

      {showDetails && (
        <div className="flex flex-col gap-3 rounded border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
          <p className="text-xs text-zinc-500">
            인용 생성에 쓰이는 세부 정보입니다. 필요한 자료에만 입력하면
            됩니다.
          </p>
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              저자
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              출판사
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              출판년도
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              URL
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
        </div>
      )}

      <label className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          자료 종류
        </span>
        <input
          className={`${inputClass} flex-1`}
          list="type-options"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <datalist id="type-options">
          {typeNames.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>

      <label className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          저장 위치
        </span>
        <input
          className={`${inputClass} flex-1`}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </label>

      <label className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          중요도
        </span>
        <select
          className={inputClass}
          value={importance}
          onChange={(e) => setImportance(Number(e.target.value))}
        >
          {IMPORTANCE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-4">
        <span className="w-24 shrink-0 pt-2 text-sm text-zinc-600 dark:text-zinc-400">
          자료 설명
        </span>
        <textarea
          className={`${inputClass} h-20 flex-1`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button
        type="submit"
        className="mt-2 self-start rounded-full bg-[#1b4965] px-5 py-2 font-medium text-white transition-colors hover:bg-[#163a52]"
      >
        등록
      </button>
    </form>
  );
}
