"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  deleteMaterial,
  getServerSnapshot,
  getSnapshot,
  subscribe,
} from "@/lib/materials";
import {
  CITATION_STYLES,
  formatCitation,
  type CitationStyle,
} from "@/lib/citation";
import { ALL, filterMaterials, type SortValue } from "@/lib/filterMaterials";
import BibliographyPanel from "@/components/BibliographyPanel";
import CitationPanel from "@/components/CitationPanel";
import MaterialForm from "@/components/MaterialForm";
import MaterialStats from "@/components/MaterialStats";
import ProjectManager from "@/components/ProjectManager";
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

type ToolPanel = "stats" | "bibliography" | "projects" | null;

export default function MaterialBrowser() {
  const { status, materials } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [selectedProject, setSelectedProject] = useState(ALL);
  const [selectedType, setSelectedType] = useState(ALL);
  const [query, setQuery] = useState("");
  const [toolPanel, setToolPanel] = useState<ToolPanel>(null);
  const [sort, setSort] = useState<SortValue>("latest");
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

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

  // 마지막 자료를 지우거나 옮겨서 선택지가 사라지면 "전체"로 되돌린다
  const project = projects.includes(selectedProject) ? selectedProject : ALL;
  const type = types.includes(selectedType) ? selectedType : ALL;

  const visible = useMemo(
    () => filterMaterials(materials, { project, type, query, sort }),
    [materials, project, type, query, sort],
  );

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
            const citation = isOpen ? formatCitation(m, citationStyle) : "";
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
