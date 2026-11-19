// OpenAlex(공개 학술 데이터베이스)로 피인용을 자기 인용과 타인 인용으로 나눈다.
// 자기 인용: 인용한 논문의 저자 중에 원래 논문의 저자가 한 명이라도 있는 경우.

export type CitationStats = {
  workId: string; // 예: W1234567890
  total: number; // OpenAlex에 수록된 인용 논문 수
  self: number;
  others: number;
  authorCount: number; // 비교에 쓴 저자 수
  partial: boolean; // 저자가 너무 많아 일부만 비교한 경우
};

const API = "https://api.openalex.org";
const USER_AGENT = "INFOON/0.1 (https://github.com/wlstn52/INFOON)";
const TIMEOUT_MS = 8000;
// OpenAlex 필터의 OR 조건은 값 개수에 제한이 있어 저자는 이만큼만 비교한다
const MAX_AUTHORS = 50;

const WORK_ID = /^W\d+$/;
const AUTHOR_ID = /^A\d+$/;

const lastSegment = (url: unknown) =>
  typeof url === "string" ? (url.split("/").pop() ?? "") : "";

async function getJson(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

async function countCiting(workId: string, authorIds?: string[]) {
  const filter = authorIds
    ? `cites:${workId},authorships.author.id:${authorIds.join("|")}`
    : `cites:${workId}`;
  const data = await getJson(
    `${API}/works?filter=${filter}&per_page=1&select=id`,
  );
  const count = (data?.meta as { count?: unknown } | undefined)?.count;
  if (typeof count !== "number") throw new Error("OpenAlex: no count");
  return count;
}

export async function lookupCitationStats(
  doi: string,
): Promise<CitationStats | null> {
  const path = doi.split("/").map(encodeURIComponent).join("/");
  const work = await getJson(
    `${API}/works/doi:${path}?select=id,authorships`,
  );
  if (!work) return null;

  const workId = lastSegment(work.id);
  if (!WORK_ID.test(workId)) return null;

  // 응답에서 꺼낸 ID는 필터 문자열에 그대로 들어가므로 형식을 확인한다
  const authorIds = [
    ...new Set(
      (Array.isArray(work.authorships) ? work.authorships : [])
        .map((a) => lastSegment((a as { author?: { id?: unknown } })?.author?.id))
        .filter((id) => AUTHOR_ID.test(id)),
    ),
  ];
  const compared = authorIds.slice(0, MAX_AUTHORS);

  const [total, self] = await Promise.all([
    countCiting(workId),
    compared.length ? countCiting(workId, compared) : Promise.resolve(0),
  ]);

  return {
    workId,
    total,
    self,
    others: total - self,
    authorCount: compared.length,
    partial: authorIds.length > MAX_AUTHORS,
  };
}
