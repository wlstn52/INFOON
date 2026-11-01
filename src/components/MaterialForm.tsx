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
import type { LookupResult } from "@/lib/lookup";
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
      m.identifier ||
      m.journal ||
      m.volume ||
      m.issue ||
      m.pages)
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
  const { materials } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
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
  const [journal, setJournal] = useState(material?.journal ?? "");
  const [volume, setVolume] = useState(material?.volume ?? "");
  const [issue, setIssue] = useState(material?.issue ?? "");
  const [pages, setPages] = useState(material?.pages ?? "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lookupId, setLookupId] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupNote, setLookupNote] = useState<{
    ok: boolean;
    lines: string[];
  } | null>(null);

  function applyLookup({ fields, warnings }: LookupResult) {
    let filled = 0;
    const fill = (
      current: string,
      next: string | undefined,
      set: (v: string) => void,
    ) => {
      if (!current.trim() && next) {
        set(next);
        filled++;
      }
    };
    fill(title, fields.title, setTitle);
    fill(type, fields.type, setType);
    fill(publisher, fields.publisher, setPublisher);
    fill(publishDate, fields.publish_date, setPublishDate);
    fill(year, fields.year, setYear);
    fill(language, fields.language, setLanguage);
    fill(url, fields.url, setUrl);
    fill(organization, fields.organization, setOrganization);
    fill(identifier, fields.identifier, setIdentifier);
    fill(journal, fields.journal, setJournal);
    fill(volume, fields.volume, setVolume);
    fill(issue, fields.issue, setIssue);
    fill(pages, fields.pages, setPages);
    if (authors.length === 0 && fields.authors?.length) {
      setAuthors(fields.authors);
      filled++;
    }
    if (filled > 0) setShowDetails(true);
    setLookupNote({
      ok: true,
      lines: [
        filled > 0
          ? `${filled}개 항목을 채웠습니다. 내용을 확인한 뒤 저장해 주세요.`
          : "새로 채울 빈 항목이 없습니다. 이미 입력한 값은 바꾸지 않습니다.",
        ...warnings,
      ],
    });
  }

  async function handleLookup() {
    if (!lookupId.trim()) {
      setLookupNote({ ok: false, lines: ["DOI 또는 ISBN을 입력해 주세요."] });
      return;
    }
    setLookupBusy(true);
    setLookupNote(null);
    try {
      const res = await fetch(
        `/api/lookup?id=${encodeURIComponent(lookupId.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error);
      applyLookup(data);
    } catch (err) {
      setLookupNote({
        ok: false,
        lines: [
          err instanceof Error && err.message
            ? err.message
            : "정보를 가져오지 못했습니다. 직접 입력해 주세요.",
        ],
      });
    } finally {
      setLookupBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
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
      journal: journal || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
    };
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (material) {
        await updateMaterial(material.id, data);
        onDone?.();
        return;
      }
      await addMaterial(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      return;
    } finally {
      setBusy(false);
    }
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
    setJournal("");
    setVolume("");
    setIssue("");
    setPages("");
    setLookupId("");
    setLookupNote(null);
    setError("");
    setMessage("자료가 등록되었습니다.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-3 ${material ? "" : "p-5"}`}
    >
      <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 dark:bg-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputClass} min-w-48 flex-1`}
            placeholder="DOI 또는 ISBN 입력 (예: 10.1038/nature14539)"
            aria-label="DOI 또는 ISBN"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLookup();
              }
            }}
          />
          <button
            type="button"
            onClick={handleLookup}
            disabled={lookupBusy}
            className="rounded-full border border-[#1b4965] px-4 py-1.5 text-sm font-medium text-[#1b4965] transition-colors hover:bg-[#1b4965] hover:text-white disabled:opacity-60 dark:border-zinc-500 dark:text-zinc-200"
          >
            {lookupBusy ? "찾는 중..." : "자동 입력"}
          </button>
        </div>
        {lookupNote?.lines.map((line) => (
          <p
            key={line}
            className={`text-xs ${lookupNote.ok ? "text-zinc-600 dark:text-zinc-400" : "text-red-600"}`}
          >
            {line}
          </p>
        ))}
      </div>

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
          <label className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              학술지명
            </span>
            <input
              className={`${inputClass} flex-1`}
              placeholder="논문일 때 입력"
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
            />
          </label>
          <div className="flex items-center gap-4">
            <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              권 / 호 / 쪽
            </span>
            <div className="flex min-w-0 flex-1 gap-2">
              <input
                className={`${inputClass} w-0 flex-1`}
                placeholder="권"
                aria-label="권"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
              />
              <input
                className={`${inputClass} w-0 flex-1`}
                placeholder="호"
                aria-label="호"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
              />
              <input
                className={`${inputClass} w-0 flex-1`}
                placeholder="쪽"
                aria-label="쪽"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
              />
            </div>
          </div>
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
          disabled={busy}
          className="rounded-full bg-[#1b4965] px-5 py-2 font-medium text-white transition-colors hover:bg-[#163a52] disabled:opacity-60"
        >
          {busy ? "저장 중..." : material ? "저장" : "등록"}
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
