import type { Author, MaterialInput } from "@/lib/materials";

export type LookupFields = Partial<
  Omit<MaterialInput, "projectName" | "location" | "importance" | "description">
>;

export type LookupResult = {
  fields: LookupFields;
  warnings: string[];
};

export type ParsedIdentifier =
  | { kind: "doi"; value: string }
  | { kind: "isbn"; value: string };

const MAX_AUTHORS = 100;
const USER_AGENT = "INFOON/0.1 (https://github.com/wlstn52/INFOON)";
const TIMEOUT_MS = 8000;
const MAX_CHARS = 5_000_000;

// DOI 소유자가 임의의 주소로 리다이렉트시킬 수 있으므로 메타데이터 서버만 따라간다
const DOI_HOSTS = new Set([
  "doi.org",
  "api.crossref.org",
  "data.crossref.org",
  "data.crosscite.org",
  "api.datacite.org",
  "data.datacite.org",
  "data.medra.org",
  "doi.or.kr",
]);

function validIsbn10(s: string) {
  const sum = [...s].reduce(
    (acc, c, i) => acc + (c === "X" ? 10 : Number(c)) * (10 - i),
    0,
  );
  return sum % 11 === 0;
}

function validIsbn13(s: string) {
  const sum = [...s].reduce(
    (acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return sum % 10 === 0;
}

// doi.org 주소, "doi:" 접두사, 하이픈이 포함된 ISBN도 받아들인다
export function parseIdentifier(raw: string): ParsedIdentifier | null {
  const text = raw.trim();
  const doi = text.match(/10\.\d{4,9}\/[^\s"<>]+/)?.[0].replace(/[.,;]+$/, "");
  if (doi) return { kind: "doi", value: doi };

  const isbn = text
    .replace(/^isbn(-1[03])?:?/i, "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn) && validIsbn10(isbn)) {
    return { kind: "isbn", value: isbn };
  }
  if (/^\d{13}$/.test(isbn) && validIsbn13(isbn)) {
    return { kind: "isbn", value: isbn };
  }
  return null;
}

// 외부 응답의 문자열 정리. 제목에 <i>, &amp; 같은 마크업이 섞여 온다.
function clean(v: unknown): string | undefined {
  const first = Array.isArray(v) ? v[0] : v;
  if (typeof first !== "string" && typeof first !== "number") return undefined;
  const text = String(first)
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text || undefined;
}

const obj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

const TYPE_MAP: Record<string, string> = {
  "journal-article": "논문",
  "article-journal": "논문",
  "paper-conference": "논문",
  "proceedings-article": "논문",
  "posted-content": "논문",
  article: "논문",
  book: "단행본",
  monograph: "단행본",
  "edited-book": "단행본",
  "reference-book": "단행본",
  chapter: "단행본",
  "book-chapter": "단행본",
  report: "보고서",
  "article-newspaper": "기사",
  "article-magazine": "기사",
};

// 이 유형에서만 container-title이 학술지/정기간행물을 뜻한다 (책의 장은 책 제목이다)
const JOURNAL_TYPES = new Set([
  "journal-article",
  "article-journal",
  "paper-conference",
  "proceedings-article",
  "article-newspaper",
  "article-magazine",
]);

function capAuthors(people: Author[], warnings: string[]) {
  if (people.length <= MAX_AUTHORS) return people;
  warnings.push(
    `저자가 ${people.length}명이라 앞의 ${MAX_AUTHORS - 1}명과 마지막 저자만 가져왔습니다.`,
  );
  return [...people.slice(0, MAX_AUTHORS - 1), people[people.length - 1]];
}

function issuedDate(m: Record<string, unknown>) {
  const issued = obj(m.issued ?? m.published);
  const parts = Array.isArray(issued["date-parts"])
    ? issued["date-parts"][0]
    : undefined;
  if (!Array.isArray(parts)) return {};
  const [y, mo, d] = parts.map((p) => clean(p));
  if (!y || !/^\d{4}$/.test(y)) return {};
  if (!mo) return { year: y };
  const month = mo.padStart(2, "0");
  return {
    year: y,
    publish_date: d ? `${y}-${month}-${d.padStart(2, "0")}` : `${y}-${month}`,
  };
}

// doi.org의 CSL JSON 응답 (Crossref, DataCite 등 등록기관과 무관하게 같은 형식)
export function fromCsl(raw: unknown, doi: string): LookupResult | null {
  const m = obj(raw);
  const title = clean(m.title);
  if (!title) return null;

  const warnings: string[] = [];
  const people: Author[] = [];
  let organization: string | undefined;
  for (const entry of Array.isArray(m.author) ? m.author : []) {
    const a = obj(entry);
    const family = clean(a.family);
    const given = clean(a.given);
    if (family && given) {
      people.push({
        familyName: family.slice(0, 100),
        givenName: given.slice(0, 100),
      });
    } else {
      organization ??= clean(a.literal) ?? clean(a.name) ?? family ?? given;
    }
  }

  const cslType = clean(m.type) ?? "";
  const url = clean(m.URL);
  const isJournal = JOURNAL_TYPES.has(cslType);

  return {
    warnings,
    fields: {
      title,
      type: TYPE_MAP[cslType],
      authors: people.length ? capAuthors(people, warnings) : undefined,
      organization,
      publisher: clean(m.publisher),
      language: clean(m.language),
      identifier: doi,
      url: url && /^https?:\/\//.test(url) && !/doi\.org\//i.test(url) ? url : undefined,
      journal: isJournal ? clean(m["container-title"]) : undefined,
      volume: clean(m.volume),
      issue: clean(m.issue),
      pages: clean(m.page),
      ...issuedDate(m),
    },
  };
}

const KOREAN_COMPOUND_SURNAMES = new Set([
  "남궁", "황보", "제갈", "선우", "독고", "서문", "사공", "동방",
]);

// 이름이 한 문자열로만 오므로 성과 이름은 추정이다
function splitName(name: string): Author | null {
  const words = name.trim().split(/\s+/);
  if (words.length > 1) {
    return {
      familyName: words[words.length - 1].slice(0, 100),
      givenName: words.slice(0, -1).join(" ").slice(0, 100),
    };
  }
  if (/^[가-힣]{2,}$/.test(name)) {
    const size = KOREAN_COMPOUND_SURNAMES.has(name.slice(0, 2)) && name.length > 2 ? 2 : 1;
    return { familyName: name.slice(0, size), givenName: name.slice(size) };
  }
  return null;
}

export function fromOpenLibrary(raw: unknown, isbn: string): LookupResult | null {
  const m = obj(raw);
  const title = clean(m.title);
  if (!title) return null;

  const warnings = [
    "ISBN 정보는 누락되거나 틀린 경우가 있습니다. 저자(번역자가 섞일 수 있음)와 제목을 확인해 주세요.",
  ];
  const people: Author[] = [];
  let organization: string | undefined;
  for (const entry of Array.isArray(m.authors) ? m.authors : []) {
    const name = clean(obj(entry).name);
    if (!name) continue;
    const person = splitName(name);
    if (person) people.push(person);
    else organization ??= name;
  }

  const subtitle = clean(m.subtitle);
  const publishers = Array.isArray(m.publishers) ? m.publishers : [];

  return {
    warnings,
    fields: {
      title: subtitle ? `${title}: ${subtitle}` : title,
      type: "단행본",
      authors: people.length ? capAuthors(people, warnings) : undefined,
      organization,
      publisher: clean(obj(publishers[0]).name),
      year: clean(m.publish_date)?.match(/\d{4}/)?.[0],
      identifier: `ISBN ${isbn}`,
    },
  };
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (text.length > MAX_CHARS) throw new Error("response too large");
  return JSON.parse(text);
}

async function fetchDoi(doi: string) {
  const path = doi.split("/").map(encodeURIComponent).join("/");
  let url = `https://doi.org/${path}`;

  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: {
        Accept: "application/vnd.citationstyles.csl+json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, url);
      if (next.protocol !== "https:" || !DOI_HOSTS.has(next.hostname)) {
        return null;
      }
      url = next.href;
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`DOI lookup failed: ${res.status}`);
    if (!res.headers.get("content-type")?.includes("json")) return null;
    return fromCsl(await readJson(res), doi);
  }
  return null;
}

async function fetchIsbn(isbn: string) {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(`ISBN lookup failed: ${res.status}`);
  const data = obj(await readJson(res));
  return fromOpenLibrary(data[`ISBN:${isbn}`], isbn);
}

export function lookupIdentifier(id: ParsedIdentifier) {
  return id.kind === "doi" ? fetchDoi(id.value) : fetchIsbn(id.value);
}
