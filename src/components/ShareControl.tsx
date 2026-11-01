"use client";

import { useState } from "react";

type Project = { id: string; name: string; shareToken: string | null };

const buttonClass =
  "rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400";

async function readError(res: Response) {
  const data = await res.json().catch(() => null);
  return data?.error ?? "요청에 실패했습니다.";
}

export default function ShareControl({ projectName }: { projectName: string }) {
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [copied, setCopied] = useState<boolean | null>(null);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setBusy(true);
    setError("");
    setConfirmRenew(false);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(await readError(res));
      const projects: Project[] = await res.json();
      const found = projects.find((p) => p.name === projectName);
      if (!found) throw new Error("프로젝트를 찾을 수 없습니다.");
      setProject(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function changeShare(method: "POST" | "DELETE") {
    if (!project) return;
    setBusy(true);
    setError("");
    setConfirmRenew(false);
    setCopied(null);
    try {
      const res = await fetch(`/api/projects/${project.id}/share`, { method });
      if (!res.ok) throw new Error(await readError(res));
      const { shareToken } = await res.json();
      setProject({ ...project, shareToken });
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const link = project?.shareToken
    ? `${window.location.origin}/share/${project.shareToken}`
    : "";

  async function handleCopy() {
    let ok = true;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      ok = false;
    }
    setCopied(ok);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleOpen}
        className={`${buttonClass} self-start`}
      >
        {open ? "− 공유 닫기" : `+ "${projectName}" 공유`}
      </button>

      {open && (
        <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            링크를 아는 사람은 로그인 없이 이 프로젝트의 자료 목록과 설명을 볼 수
            있습니다. 저장 위치는 공개되지 않습니다.
          </p>

          {busy && !project && (
            <p className="text-xs text-zinc-500">불러오는 중...</p>
          )}

          {project && !project.shareToken && (
            <button
              type="button"
              disabled={busy}
              onClick={() => changeShare("POST")}
              className="self-start rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52] disabled:opacity-60"
            >
              공유 링크 만들기
            </button>
          )}

          {link && (
            <>
              <input
                readOnly
                aria-label="공유 링크"
                value={link}
                onFocus={(e) => e.target.select()}
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full bg-[#1b4965] px-4 py-1 text-xs font-medium text-white transition-colors hover:bg-[#163a52]"
                >
                  링크 복사
                </button>
                {confirmRenew ? (
                  <>
                    <span className="text-xs text-red-600">
                      이전 링크는 더 이상 열리지 않습니다.
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeShare("POST")}
                      className={buttonClass}
                    >
                      새로 만들기
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRenew(false)}
                      className={buttonClass}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmRenew(true)}
                    className={buttonClass}
                  >
                    링크 새로 만들기
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeShare("DELETE")}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-red-600 hover:text-red-600 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-400"
                >
                  공유 중지
                </button>
                {copied !== null && (
                  <span
                    className={`text-xs ${copied ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {copied
                      ? "복사되었습니다."
                      : "복사에 실패했습니다. 직접 선택해서 복사해 주세요."}
                  </span>
                )}
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
