"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  deleteMaterial,
  getServerSnapshot,
  getSnapshot,
  authorKey,
  authorLabel,
  IMPORTANCE_LABELS,
  onShowMaterial,
  setFavoriteAuthors,
  showMaterial,
  subscribe,
  type FavoriteAuthor,
} from "@/lib/materials";
import {
  CITATION_STYLES,
  formatCitationRich,
  type CitationStyle,
} from "@/lib/citation";
import { ALL, filterMaterials, type SortValue } from "@/lib/filterMaterials";
import BibliographyPanel from "@/components/BibliographyPanel";
import CitationPanel from "@/components/CitationPanel";
import MaterialForm from "@/components/MaterialForm";
import MaterialStats from "@/components/MaterialStats";
import ProjectManager from "@/components/ProjectManager";
import RelationGraph from "@/components/RelationGraph";
import RelationPanel from "@/components/RelationPanel";
import ShareControl from "@/components/ShareControl";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "importance", label: "중요도순" },
  { value: "title", label: "이름순" },
];

const selectClass =
  "rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

const toggleClass =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400";

const chipClass =
  "rounded-full px-2 py-0.5 text-xs transition-colors";

type ToolPanel = "stats" | "bibliography" | "projects" | "graph" | null;

export default function MaterialBrowser() {
  const { status, materials, relations, favoriteAuthors } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [selectedProject, setSelectedProject] = useState(ALL);
  const [selectedType, setSelectedType] = useState(ALL);
  const [selectedTag, setSelectedTag] = useState(ALL);
  const [authorFilter, setAuthorFilter] = useState<FavoriteAuthor | null>(null);
  const [favoriteError, setFavoriteError] = useState("");
  const [query, setQuery] = useState("");
  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [sort, setSort] = useState<SortValue>("latest");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa");
  const [openId, setOpenId] = useState<string | null>(null);
  const [relationsOpenId, setRelationsOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // 다른 컴포넌트가 특정 자료를 보여 달라고 하면 필터를 풀고 그 카드로 스크롤한다
  useEffect(
    () =>
      onShowMaterial((id) => {
        setSelectedProject(ALL);
        setSelectedType(ALL);
        setSelectedTag(ALL);
        setAuthorFilter(null);
        setQuery("");
        setHighlightId(id);
        setTimeout(() => {
          document
            .getElementById(`material-${id}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
        setTimeout(
          () => setHighlightId((current) => (current === id ? null : current)),
          2500,
        );
      }),
    [],
  );

  async function handleDelete(id: string) {
    setDeleteError("");
    try {
      await deleteMaterial(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "삭제에 실패했습니다.",
      );
    }
  }

  const projects = useMemo(
    () => [ALL, ...new Set(materials.map((m) => m.projectName))],
    [materials],
  );
  const types = useMemo(
    () => [ALL, ...new Set(materials.map((m) => m.type))],
    [materials],
  );
  const tags = useMemo(
    () => [
      ALL,
      ...[...new Set(materials.flatMap((m) => m.tags ?? []))].sort((a, b) =>
        a.localeCompare(b, "ko"),
      ),
    ],
    [materials],
  );

  // 마지막 자료를 지우거나 옮겨서 선택지가 사라지면 "전체"로 되돌린다
  const project = projects.includes(selectedProject) ? selectedProject : ALL;
  const type = types.includes(selectedType) ? selectedType : ALL;
  const tag = tags.includes(selectedTag) ? selectedTag : ALL;

  const visible = useMemo(
    () =>
      filterMaterials(materials, {
        project,
        type,
        tag,
        author: authorFilter?.key ?? null,
        query,
        sort,
      }),
    [materials, project, type, tag, authorFilter, query, sort],
  );

  const isFavorite = (key: string) => favoriteAuthors.some((f) => f.key === key);

  async function toggleFavorite(author: FavoriteAuthor) {
    setFavoriteError("");
    try {
      await setFavoriteAuthors(
        isFavorite(author.key)
          ? favoriteAuthors.filter((f) => f.key !== author.key)
          : [...favoriteAuthors, author],
      );
    } catch (err) {
      setFavoriteError(
        err instanceof Error ? err.message : "관심 저자를 저장하지 못했습니다.",
      );
    }
  }

  const toggleTool = (panel: Exclude<ToolPanel, null>) =>
    setToolPanel((current) => (current === panel ? null : panel));

  return (
    <div className="flex flex-col gap-4 p-5">
      <input
        type="search"
        className={`${selectClass} w-full`}
        placeholder="제목, 저자, 설명, 학술지, 출판사, 식별자로 검색"
        aria-label="자료 검색"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <select
          className={selectClass}
          aria-label="프로젝트"
          value={project}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          aria-label="정렬"
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
          aria-label="자료 종류"
          value={type}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {tags.length > 1 && (
          <select
            className={selectClass}
            aria-label="태그"
            value={tag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t === ALL ? "태그 전체" : `#${t}`}
              </option>
            ))}
          </select>
        )}
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

      {status === "ready" && (favoriteAuthors.length > 0 || authorFilter) && (
        <div className="flex flex-col gap-2">
          {favoriteAuthors.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="mr-1">관심 저자</span>
              {favoriteAuthors.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() =>
                    setAuthorFilter(authorFilter?.key === f.key ? null : f)
                  }
                  aria-pressed={authorFilter?.key === f.key}
                  className={`${chipClass} ${
                    authorFilter?.key === f.key
                      ? "bg-[#1b4965] text-white"
                      : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                  }`}
                >
                  ★ {f.label}
                </button>
              ))}
            </div>
          )}
          {authorFilter && (
            <div className="flex flex-wrap items-center gap-2 rounded bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
              <span>
                저자 <strong>{authorFilter.label}</strong>의 자료만 보는 중
              </span>
              <button
                type="button"
                onClick={() => toggleFavorite(authorFilter)}
                className={toggleClass}
              >
                {isFavorite(authorFilter.key) ? "★ 관심 저자 해제" : "☆ 관심 저자로 등록"}
              </button>
              <button
                type="button"
                onClick={() => setAuthorFilter(null)}
                className={toggleClass}
              >
                × 저자 필터 해제
              </button>
            </div>
          )}
          {favoriteError && <p className="text-sm text-red-600">{favoriteError}</p>}
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-zinc-600 dark:text-zinc-400">
              자료 {visible.length}건
              {visible.length !== materials.length &&
                ` / 전체 ${materials.length}건`}
            </span>
            {materials.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => toggleTool("stats")}
                  className={toggleClass}
                >
                  {toolPanel === "stats" ? "− 통계 닫기" : "+ 통계"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleTool("bibliography")}
                  className={toggleClass}
                >
                  {toolPanel === "bibliography"
                    ? "− 참고문헌 닫기"
                    : "+ 참고문헌·내보내기"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleTool("graph")}
                  className={toggleClass}
                >
                  {toolPanel === "graph" ? "− 관계 그래프 닫기" : "+ 관계 그래프"}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => toggleTool("projects")}
              className={toggleClass}
            >
              {toolPanel === "projects"
                ? "− 프로젝트 관리 닫기"
                : "+ 프로젝트 관리"}
            </button>
          </div>
          {toolPanel === "stats" && materials.length > 0 && (
            <MaterialStats materials={visible} showProjects={project === ALL} />
          )}
          {toolPanel === "bibliography" && materials.length > 0 && (
            <BibliographyPanel
              materials={visible}
              style={citationStyle}
              fileBase={project === ALL ? "INFOON" : `INFOON-${project}`}
            />
          )}
          {toolPanel === "graph" && materials.length > 0 && (
            <RelationGraph
              materials={visible}
              relations={relations}
              onSelect={showMaterial}
            />
          )}
          {toolPanel === "projects" && (
            <ProjectManager
              materials={materials}
              onRenamed={(before, after) =>
                setSelectedProject((current) =>
                  current === before ? after : current,
                )
              }
            />
          )}
        </>
      )}

      {status === "ready" && project !== ALL && (
        <ShareControl key={project} projectName={project} />
      )}

      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

      {status === "loading" ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          자료를 불러오는 중...
        </p>
      ) : status === "unauthenticated" ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          자료를 보려면{" "}
          <Link href="/login" className="font-medium text-[#1b4965]">
            로그인
          </Link>
          해 주세요.
        </p>
      ) : status === "error" ? (
        <p className="py-6 text-center text-sm text-red-600">
          자료를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
        </p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          {materials.length === 0
            ? "등록된 자료가 없습니다. 위에서 새 자료를 등록해 보세요."
            : "조건에 맞는 자료가 없습니다."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((m) => {
            const isOpen = openId === m.id;
            const citation = isOpen ? formatCitationRich(m, citationStyle) : "";
            const relationCount = relations.filter(
              (r) => r.sourceId === m.id || r.targetId === m.id,
            ).length;
            const relationsOpen = relationsOpenId === m.id;
            if (editingId === m.id) {
              return (
                <div
                  key={m.id}
                  className="rounded border border-[#1b4965] p-4"
                >
                  <MaterialForm
                    material={m}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              );
            }
            return (
              <div
                key={m.id}
                id={`material-${m.id}`}
                className={`flex flex-col gap-2 rounded border p-3 transition-shadow ${
                  highlightId === m.id
                    ? "border-[#1b4965] ring-2 ring-[#1b4965] dark:border-sky-400 dark:ring-sky-400"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-zinc-500">
                      {[
                        m.projectName,
                        m.type,
                        `중요도 ${IMPORTANCE_LABELS[m.importance] ?? m.importance}`,
                        m.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600 sm:max-w-xs sm:text-right dark:text-zinc-400">
                    {m.description}
                  </p>
                </div>

                {!!(m.authors?.length || m.tags?.length) && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {m.authors?.slice(0, 3).map((a) => {
                      const key = authorKey(a);
                      return (
                        <button
                          key={key}
                          type="button"
                          title="이 저자의 자료만 보기"
                          aria-label={`저자 ${authorLabel(a)}의 자료만 보기`}
                          onClick={() =>
                            setAuthorFilter({ key, label: authorLabel(a) })
                          }
                          className={`${chipClass} border border-zinc-300 text-zinc-700 hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-300`}
                        >
                          {isFavorite(key) && "★ "}
                          {authorLabel(a)}
                        </button>
                      );
                    })}
                    {(m.authors?.length ?? 0) > 3 && (
                      <span className="text-zinc-500">
                        외 {(m.authors?.length ?? 0) - 3}명
                      </span>
                    )}
                    {m.tags?.map((t) => (
                      <button
                        key={t}
                        type="button"
                        title="이 태그의 자료만 보기"
                        aria-label={`태그 ${t}의 자료만 보기`}
                        onClick={() => setSelectedTag(t)}
                        className={`${chipClass} bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700`}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : m.id)}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
                  >
                    {isOpen ? "− 인용 닫기" : "+ 인용"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRelationsOpenId(relationsOpen ? null : m.id)
                    }
                    className={toggleClass}
                  >
                    {relationsOpen
                      ? "− 관계 닫기"
                      : `+ 관계${relationCount > 0 ? ` ${relationCount}` : ""}`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingId(m.id)}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
                  >
                    수정
                  </button>

                  {confirmDeleteId === m.id ? (
                    <>
                      <span className="text-xs text-red-600">
                        정말 삭제할까요?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
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

                {isOpen && <CitationPanel citation={citation} />}
                {relationsOpen && (
                  <RelationPanel
                    material={m}
                    materials={materials}
                    relations={relations}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
