"use client";

import { useEffect, useState } from "react";
import type { CitationStats } from "@/lib/citationStats";

// 같은 DOI를 다시 열거나 동시에 열 때 외부 서비스를 반복 호출하지 않도록
// 결과와 진행 중인 요청을 페이지 안에서만 기억한다
const cache = new Map<string, CitationStats>();
const pending = new Map<string, Promise<CitationStats>>();

function requestStats(doi: string) {
  let request = pending.get(doi);
  if (!request) {
    request = fetch(`/api/citations?doi=${encodeURIComponent(doi)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error);
        cache.set(doi, data as CitationStats);
        return data as CitationStats;
      })
      .finally(() => pending.delete(doi));
    pending.set(doi, request);
  }
  return request;
}

// 반올림하면 0%나 100%가 되는 경우에도 실제로 0이 아님을 드러낸다
function percent(part: number, total: number) {
  if (total === 0) return "-";
  const p = (part / total) * 100;
  if (part > 0 && p < 1) return "<1%";
  if (part < total && p > 99) return ">99%";
  return `${Math.round(p)}%`;
}

export default function CitationStatsPanel({ doi }: { doi: string }) {
  const [stats, setStats] = useState<CitationStats | null>(
    cache.get(doi) ?? null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (cache.has(doi)) return;
    let active = true;
    requestStats(doi)
      .then((data) => {
        if (active) setStats(data);
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error && err.message
              ? err.message
              : "피인용 정보를 가져오지 못했습니다.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [doi]);

  return (
    <div className="flex flex-col gap-2 rounded bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : !stats ? (
        <p className="text-zinc-500">OpenAlex에서 불러오는 중...</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-zinc-500">전체 피인용</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {stats.total.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">타인 인용</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {stats.others.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  {percent(stats.others, stats.total)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">자기 인용</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {stats.self.toLocaleString()}
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  {percent(stats.self, stats.total)}
                </span>
              </dd>
            </div>
          </dl>
          <p className="text-xs text-zinc-500">
            OpenAlex 기준. 자기 인용은 인용한 논문의 저자 중에 이 논문의 저자가
            한 명이라도 있는 경우입니다.
            {stats.partial &&
              ` 저자가 많아 앞의 ${stats.authorCount}명만 비교했으므로 자기 인용은 실제보다 적게 잡힐 수 있습니다.`}
            {stats.total === 0 &&
              " 국내 학술지는 인용 정보가 수록되지 않아 0으로 나올 수 있습니다."}{" "}
            <a
              href={`https://openalex.org/works/${stats.workId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#1b4965]"
            >
              OpenAlex에서 보기
            </a>
          </p>
        </>
      )}
    </div>
  );
}
