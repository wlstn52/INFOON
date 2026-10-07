"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  addMaterial,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateMaterial,
  type Author,
  type Material,
} from "@/lib/materials";
import AuthorListEditor from "@/components/AuthorListEditor";

const IMPORTANCE_OPTIONS = [1, 2, 3, 4, 5];

const inputClass =
  "rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function hasDetails(m?: Material) {
  return !!(
    m &&
    (m.authors?.length ||
      m.publisher ||
      m.publish_date ||
      m.year ||
      m.language ||
      m.url ||
      m.access_date ||
      m.organization ||
      m.identifier)
  );
}

// material이 주어지면 수정 모드, 없으면 새 자료 등록 모드
export default function MaterialForm({
  material,
  onDone,
}: {
  material?: Material;
  onDone?: () => void;
}) {
  const uid = useId();
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

  const [projectName, setProjectName] = useState(material?.projectName ?? "");
  const [title, setTitle] = useState(material?.title ?? "");
  const [type, setType] = useState(material?.type ?? "");
  const [location, setLocation] = useState(material?.location ?? "");
  const [importance, setImportance] = useState(material?.importance ?? 3);
  const [description, setDescription] = useState(material?.description ?? "");
  const [showDetails, setShowDetails] = useState(hasDetails(material));
  const [authors, setAuthors] = useState<Author[]>(material?.authors ?? []);
  const [publisher, setPublisher] = useState(material?.publisher ?? "");
  const [publishDate, setPublishDate] = useState(material?.publish_date ?? "");
  const [year, setYear] = useState(material?.year ?? "");
  const [language, setLanguage] = useState(material?.language ?? "");
  const [url, setUrl] = useState(material?.url ?? "");
  const [accessDate, setAccessDate] = useState(material?.access_date ?? "");
  const [organization, setOrganization] = useState(
    material?.organization ?? "",
  );
  const [identifier, setIdentifier] = useState(material?.identifier ?? "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName || !title || !type) {
      setMessage("");
      setError("프로젝트, 자료명, 자료 종류는 필수 입력 항목입니다.");
      return;
    }
    const data = {
      projectName,
      title,
      type,
      location,
      importance,
      description,
      authors: authors.length > 0 ? authors : undefined,
      publisher: publisher || undefined,
      publish_date: publishDate || undefined,
      year: year || undefined,
      language: language || undefined,
      url: url || undefined,
      access_date: accessDate || undefined,
      organization: organization || undefined,
      identifier: identifier || undefined,
    };
    if (material) {
      updateMaterial(material.id, data);
      onDone?.();
      return;
    }
    addMaterial(data);
    setProjectName("");
    setTitle("");
    setType("");
    setLocation("");
    setImportance(3);
    setDescription("");
    setAuthors([]);
    setPublisher("");
    setPublishDate("");
    setYear("");
    setLanguage("");
    setUrl("");
    setAccessDate("");
    setOrganization("");
    setIdentifier("");
    setError("");
    setMessage("자료가 등록되었습니다.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 ${material ? "" : "p-5"}`}
    >
      <label className="flex items-center gap-4">
        <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          프로젝트
        </span>
        <input
          className={`${inputClass} flex-1`}
          list={`${uid}-project`}
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <datalist id={`${uid}-project`}>
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
          <AuthorListEditor authors={authors} onChange={setAuthors} />
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
              발표 날짜
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
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
              언어
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
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
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              원문 접근일
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={accessDate}
              onChange={(e) => setAccessDate(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              기관
            </span>
            <input
              className={`${inputClass} flex-1`}
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              식별자
            </span>
            <input
              className={`${inputClass} flex-1`}
              placeholder="DOI, ISBN 등"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
          list={`${uid}-type`}
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <datalist id={`${uid}-type`}>
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

      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-[#1b4965] px-5 py-2 font-medium text-white transition-colors hover:bg-[#163a52]"
        >
          {material ? "저장" : "등록"}
        </button>
        {material && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}
