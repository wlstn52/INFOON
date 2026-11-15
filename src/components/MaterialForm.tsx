"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  addMaterial,
  getServerSnapshot,
  getSnapshot,
  importanceText,
  showMaterial,
  subscribe,
  updateMaterial,
  type Author,
  type Material,
  type MaterialInput,
} from "@/lib/materials";
import {
  CITATION_STYLES,
  formatCitation,
  type CitationStyle,
} from "@/lib/citation";
import { identifierKey } from "@/lib/identifiers";
import type { LookupResult } from "@/lib/lookup";
import AuthorListEditor from "@/components/AuthorListEditor";
import CitationPanel from "@/components/CitationPanel";

const IMPORTANCE_OPTIONS = [5, 4, 3, 2, 1];

type SaveIssue =
  | { kind: "duplicate"; material: Material }
  | { kind: "notFound" };

// 조회 서비스에 실제로 있는 DOI/ISBN인지 확인. 서비스 오류는 막지 않는다.
async function verifyIdentifier(identifier: string) {
  try {
    const res = await fetch(
      `/api/lookup?id=${encodeURIComponent(identifier.trim())}`,
    );
    if (res.ok) return "found";
    if (res.status === 404) return "notFound";
  } catch {}
  return "unknown";
}

const inputClass =
  "min-w-0 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

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
  // 수정 모드의 기존 식별자와 자동 입력으로 확인된 식별자는 다시 조회하지 않는다
  const [verifiedKey, setVerifiedKey] = useState(
    identifierKey(material?.identifier),
  );
  const [checking, setChecking] = useState(false);
  const [issues, setIssues] = useState<SaveIssue[] | null>(null);
  const [previewStyle, setPreviewStyle] = useState<CitationStyle>("apa");

  const idKey = identifierKey(identifier);
  const duplicates = useMemo(
    () =>
      idKey
        ? materials.filter(
            (m) =>
              m.id !== material?.id && identifierKey(m.identifier) === idKey,
          )
        : [],
    [materials, idKey, material?.id],
  );

  function collectData(): MaterialInput {
    return {
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
  }

  function applyLookup({ fields, warnings }: LookupResult) {
    setVerifiedKey(identifierKey(fields.identifier));
    setIssues(null);
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

  async function save(data: MaterialInput) {
    setIssues(null);
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
    setVerifiedKey(null);
    setError("");
    setMessage("자료가 등록되었습니다.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName || !title || !type) {
      setMessage("");
      setError("프로젝트, 자료명, 자료 종류는 필수 입력 항목입니다.");
      return;
    }
    const data = collectData();
    setError("");
    setMessage("");

    // 같은 프로젝트의 중복만 확인을 받고, 다른 프로젝트의 중복은 안내만 한다
    const found: SaveIssue[] = duplicates
      .filter((m) => m.projectName === projectName.trim())
      .map((m) => ({ kind: "duplicate", material: m }));

    if (idKey && idKey !== verifiedKey) {
      setBusy(true);
      setChecking(true);
      const result = await verifyIdentifier(identifier);
      setChecking(false);
      setBusy(false);
      if (result === "found") setVerifiedKey(idKey);
      if (result === "notFound") found.push({ kind: "notFound" });
    }

    if (found.length > 0) {
      setIssues(found);
      return;
    }
    await save(data);
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
          onChange={(e) => {
            setProjectName(e.target.value);
            setIssues(null);
          }}
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
              onChange={(e) => {
                setIdentifier(e.target.value);
                setIssues(null);
              }}
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
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <select
            className={`${inputClass} self-start`}
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
          >
            {IMPORTANCE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {importanceText(n)}
              </option>
            ))}
          </select>
          <span className="text-xs text-zinc-500">
            5 핵심(꼭 인용할 자료) ~ 1 참고만(배경 지식). 중요도순 정렬과 통계에
            쓰입니다.
          </span>
        </div>
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

      {title.trim() && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            인용 미리보기
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="미리보기 인용 양식"
              value={previewStyle}
              onChange={(e) => setPreviewStyle(e.target.value as CitationStyle)}
            >
              {CITATION_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <CitationPanel
            citation={formatCitation(
              {
                ...collectData(),
                id: "preview",
                createdAt: new Date().toISOString().slice(0, 10),
              },
              previewStyle,
            )}
          />
        </div>
      )}

      {duplicates.length > 0 && !issues && (
        <div className="flex flex-col gap-1 rounded border border-zinc-300 p-3 text-sm dark:border-zinc-700">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            같은 DOI/ISBN으로 등록된 자료가 있습니다
          </p>
          {duplicates.map((m) => (
            <DuplicateRow key={m.id} material={m} />
          ))}
        </div>
      )}

      {issues && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded border border-amber-500 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="font-medium">⚠ 저장 전에 확인해 주세요</p>
          {issues.map((issue) =>
            issue.kind === "duplicate" ? (
              <div key={issue.material.id} className="flex flex-col gap-1">
                <p>이 프로젝트에 같은 DOI/ISBN의 자료가 이미 있습니다.</p>
                <DuplicateRow material={issue.material} />
              </div>
            ) : (
              <p key="notFound">
                입력한 DOI/ISBN을 조회 서비스에서 찾지 못했습니다. 오타가 없는지
                확인해 주세요. 국내 도서 ISBN은 조회되지 않을 수 있습니다.
              </p>
            ),
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => save(collectData())}
              className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52]"
            >
              {material ? "그래도 저장" : "그래도 등록"}
            </button>
            <button
              type="button"
              onClick={() => setIssues(null)}
              className="rounded-full border border-zinc-400 px-4 py-1 text-xs"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#1b4965] px-5 py-2 font-medium text-white transition-colors hover:bg-[#163a52] disabled:opacity-60"
        >
          {checking
            ? "DOI/ISBN 확인 중..."
            : busy
              ? "저장 중..."
              : material
                ? "저장"
                : "등록"}
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

function DuplicateRow({ material }: { material: Material }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="min-w-0 break-words">
        {material.title}
        <span className="text-xs opacity-70"> ({material.projectName})</span>
      </span>
      <button
        type="button"
        onClick={() => showMaterial(material.id)}
        className="rounded-full border border-current px-3 py-0.5 text-xs"
      >
        기존 자료 보기
      </button>
    </div>
  );
}
