import type { Author, Material } from "@/lib/materials";

export const CITATION_STYLES = [
  { value: "apa", label: "APA 7" },
  { value: "mla", label: "MLA 9" },
  { value: "chicago", label: "Chicago 17" },
  { value: "ieee", label: "IEEE" },
] as const;

export type CitationStyle = (typeof CITATION_STYLES)[number]["value"];

const HANGUL = /[ㄱ-ㆎ가-힣]/;

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_MLA = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
];
const MONTH_IEEE = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
  "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec.",
];

type ParsedDate = { year?: string; month?: number; day?: number; raw?: string };

function parseDate(raw?: string, year?: string): ParsedDate {
  const text = raw?.trim() || undefined;
  const m = text?.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) {
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: m[1], month, day, raw: text };
    }
  }
  return { year: year?.trim() || text?.match(/\d{4}/)?.[0], raw: text };
}

function hasFullDate(d: ParsedDate): d is Required<Omit<ParsedDate, "raw">> & ParsedDate {
  return !!(d.year && d.month && d.day);
}

// 인용 안의 강조 구간 표시. 영문 자료는 이탤릭, 국문 자료는 굵게 쓴다.
const ITALIC = ["", ""] as const;
const BOLD = ["", ""] as const;
const MARKS = /[-]/g;

const stripMarks = (s: string) => s.replace(MARKS, "");

function emph(text: string | undefined, korean: boolean) {
  if (!text) return text;
  const [open, close] = korean ? BOLD : ITALIC;
  return `${open}${text}${close}`;
}

function period(s: string) {
  return /[.?!]$/.test(stripMarks(s)) ? s : `${s}.`;
}

const DOI = /10\.\d{4,9}\/\S+/;

function doiUrl(identifier?: string) {
  const m = identifier?.match(DOI);
  return m ? `https://doi.org/${m[0]}` : undefined;
}

const words = (s?: string) => (s ?? "").split(/\s+/).filter(Boolean);

function initials(...names: (string | undefined)[]) {
  return names
    .flatMap(words)
    .map((w) =>
      w
        .split("-")
        .filter(Boolean)
        .map((p) => `${p[0].toUpperCase()}.`)
        .join("-"),
    )
    .join(" ");
}

const isHangul = (a: Author) => HANGUL.test(a.familyName + a.givenName);

// 국문 자료 판단: 첫 저자가 한글 이름이면, 저자가 없으면 기관명이나 제목이 한글이면 국문으로 본다
export function isKoreanMaterial(m: Material) {
  const first = m.authors?.[0];
  if (first) return isHangul(first);
  return HANGUL.test(m.organization ?? "") || HANGUL.test(m.title);
}

function koreanName(a: Author) {
  return [a.familyName, a.middleName, a.givenName].filter(Boolean).join("");
}

// "Smith, John A." (abbreviate → "Smith, J. A.")
function nameInverted(a: Author, abbreviate: boolean) {
  if (isHangul(a)) return koreanName(a);
  const rest = abbreviate
    ? initials(a.givenName, a.middleName)
    : [a.givenName, a.middleName].filter(Boolean).join(" ");
  return `${a.familyName}, ${rest}`;
}

// "John A. Smith" (abbreviate → "J. A. Smith")
function nameNatural(a: Author, abbreviate: boolean) {
  if (isHangul(a)) return koreanName(a);
  const first = abbreviate
    ? initials(a.givenName, a.middleName)
    : [a.givenName, a.middleName].filter(Boolean).join(" ");
  return `${first} ${a.familyName}`;
}

// 한국심리학회 계열 규정: 국문 저자는 쉼표로만 잇고 &를 쓰지 않는다
function apaAuthors(list: Author[], korean: boolean) {
  const names = list.map((a) => nameInverted(a, true));
  if (names.length === 1) return names[0];
  if (korean) {
    return names.length <= 20
      ? names.join(", ")
      : `${names.slice(0, 19).join(", ")}, . . . ${names[names.length - 1]}`;
  }
  if (names.length <= 20) {
    return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  }
  return `${names.slice(0, 19).join(", ")}, . . . ${names[names.length - 1]}`;
}

function mlaAuthors(list: Author[], korean: boolean) {
  if (korean) {
    if (list.length >= 3) return `${nameInverted(list[0], false)} 외`;
    return list.map((a) => nameInverted(a, false)).join(", ");
  }
  if (list.length >= 3) return `${nameInverted(list[0], false)}, et al.`;
  if (list.length === 2) {
    return `${nameInverted(list[0], false)}, and ${nameNatural(list[1], false)}`;
  }
  return nameInverted(list[0], false);
}

function chicagoAuthors(list: Author[], korean: boolean) {
  const shown = list.length > 10 ? list.slice(0, 7) : list;
  const names = shown.map((a, i) =>
    i === 0 ? nameInverted(a, false) : nameNatural(a, false),
  );
  if (korean) {
    return list.length > 10 ? `${names.join(", ")} 외` : names.join(", ");
  }
  if (list.length > 10) return `${names.join(", ")}, et al.`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function ieeeAuthors(list: Author[], korean: boolean) {
  if (list.length > 6) {
    return `${nameNatural(list[0], true)} ${korean ? "외" : "et al."}`;
  }
  const names = list.map((a) => nameNatural(a, true));
  if (korean) return names.join(", ");
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

// 사용자 입력에 강조 표시 문자가 섞여 있으면 서식이 깨지므로 미리 지운다
function sanitize(m: Material): Material {
  return JSON.parse(JSON.stringify(m), (_key, value) =>
    typeof value === "string" ? stripMarks(value) : value,
  );
}

function prepare(raw: Material) {
  const m = sanitize(raw);
  const authors = m.authors ?? [];
  const org = m.organization?.trim() || undefined;
  const publisher = m.publisher?.trim() || undefined;
  return {
    korean: isKoreanMaterial(m),
    standalone: m.type === "단행본" || m.type === "보고서",
    doi: m.identifier?.match(DOI)?.[0],
    authors,
    org,
    // 저자가 없으면 기관이 저자 자리를 차지하고, 저자가 있으면 기관이 발행처 역할을 한다
    byline: authors.length ? undefined : org,
    publisher: publisher ?? (authors.length ? org : undefined),
    title: m.title.trim(),
    link: doiUrl(m.identifier) ?? (m.url?.trim() || undefined),
    date: parseDate(m.publish_date, m.year),
    accessed: m.access_date?.trim() ? parseDate(m.access_date) : undefined,
    journal: m.journal?.trim() || undefined,
    volume: m.volume?.trim() || undefined,
    issue: m.issue?.trim() || undefined,
    pages: m.pages?.trim() || undefined,
  };
}

function quoted(title: string, ending: "." | ",") {
  return /[.?!]$/.test(title) ? `"${title}"` : `"${title}${ending}"`;
}

function apa(m: Material) {
  const p = prepare(m);
  const author = p.authors.length ? apaAuthors(p.authors, p.korean) : p.byline;
  if (p.journal) {
    const issue = p.issue ? `(${p.issue})` : "";
    const volume = p.volume || issue
      ? `${emph(p.volume, p.korean) ?? ""}${issue}`
      : undefined;
    const source = [emph(p.journal, p.korean), volume, p.pages]
      .filter(Boolean)
      .join(", ");
    const year = `(${p.date.year ?? "n.d."}).`;
    const parts = author
      ? [period(author), year, period(p.title), period(source)]
      : [period(p.title), year, period(source)];
    if (p.link) parts.push(p.link);
    return parts.join(" ");
  }
  const d = hasFullDate(p.date)
    ? `${p.date.year}, ${MONTH_FULL[p.date.month - 1]} ${p.date.day}`
    : (p.date.year ?? "n.d.");
  const title = period(emph(p.title, p.korean)!);
  const parts = author
    ? [period(author), `(${d}).`, title]
    : [title, `(${d}).`];
  if (p.publisher) parts.push(period(p.publisher));
  if (p.link) parts.push(p.link);
  return parts.join(" ");
}

function mla(m: Material) {
  const p = prepare(m);
  const parts: string[] = [];
  const author = p.authors.length ? mlaAuthors(p.authors, p.korean) : undefined;
  if (author) parts.push(period(author));
  parts.push(
    p.journal ? quoted(p.title, ".") : period(emph(p.title, p.korean)!),
  );
  const date = hasFullDate(p.date)
    ? `${p.date.day} ${MONTH_MLA[p.date.month - 1]} ${p.date.year}`
    : p.date.year;
  const container = p.journal
    ? [
        emph(p.journal, p.korean),
        p.volume && `vol. ${p.volume}`,
        p.issue && `no. ${p.issue}`,
        date,
        p.pages && `pp. ${p.pages}`,
      ]
        .filter(Boolean)
        .join(", ")
    : [p.publisher ?? p.byline, date].filter(Boolean).join(", ");
  if (container) parts.push(period(container));
  if (p.link) parts.push(`${p.link}.`);
  if (p.accessed) {
    const a = p.accessed;
    const text = hasFullDate(a)
      ? `${a.day} ${MONTH_MLA[a.month - 1]} ${a.year}`
      : (a.year ?? a.raw);
    parts.push(`Accessed ${text}.`);
  }
  return parts.join(" ");
}

function chicago(m: Material) {
  const p = prepare(m);
  const parts: string[] = [];
  const author = p.authors.length
    ? chicagoAuthors(p.authors, p.korean)
    : p.byline;
  if (author) parts.push(period(author));
  if (p.journal) {
    const issue = p.issue ? `, no. ${p.issue}` : "";
    const volume = p.volume ? ` ${p.volume}` : "";
    const pages = p.pages ? `: ${p.pages}` : "";
    parts.push(quoted(p.title, "."));
    parts.push(
      `${emph(p.journal, p.korean)}${volume}${issue} (${p.date.year ?? "n.d."})${pages}.`,
    );
  } else {
    parts.push(period(emph(p.title, p.korean)!));
    const date = hasFullDate(p.date)
      ? `${MONTH_FULL[p.date.month - 1]} ${p.date.day}, ${p.date.year}`
      : (p.date.year ?? "n.d.");
    parts.push(period([p.publisher, date].filter(Boolean).join(", ")));
  }
  if (p.accessed) {
    const a = p.accessed;
    const text = hasFullDate(a)
      ? `${MONTH_FULL[a.month - 1]} ${a.day}, ${a.year}`
      : (a.year ?? a.raw);
    parts.push(`Accessed ${text}.`);
  }
  if (p.link) parts.push(`${p.link}.`);
  return parts.join(" ");
}

function ieee(m: Material) {
  const p = prepare(m);
  const author = p.authors.length ? ieeeAuthors(p.authors, p.korean) : p.byline;
  const rest = p.journal
    ? [
        emph(p.journal, p.korean),
        p.volume && `vol. ${p.volume}`,
        p.issue && `no. ${p.issue}`,
        p.pages && `pp. ${p.pages}`,
        p.date.year,
      ]
        .filter(Boolean)
        .join(", ")
    : [p.publisher, p.date.year].filter(Boolean).join(", ");
  // 책과 보고서 제목은 강조, 논문과 기사 제목은 따옴표로 쓴다
  const title =
    p.standalone && !p.journal
      ? period(emph(p.title, p.korean)!)
      : quoted(p.title, rest ? "," : ".");
  let text = `${author ? `${author}, ` : ""}${title}${rest ? ` ${rest}.` : ""}`;
  if (p.journal && p.doi) {
    text += ` doi: ${p.doi}.`;
  } else if (p.link) {
    text += ` [Online]. Available: ${p.link}`;
    if (p.accessed) {
      const a = p.accessed;
      const when = hasFullDate(a)
        ? `${MONTH_IEEE[a.month - 1]} ${a.day}, ${a.year}`
        : (a.year ?? a.raw);
      text += ` (accessed ${when}).`;
    }
  }
  return text;
}

// 강조 표시가 들어 있는 인용. 화면과 서식 복사에 쓴다.
export function formatCitationRich(m: Material, style: CitationStyle): string {
  switch (style) {
    case "apa":
      return apa(m);
    case "mla":
      return mla(m);
    case "chicago":
      return chicago(m);
    case "ieee":
      return ieee(m);
  }
}

// 서식 없는 인용 (TXT 저장 등)
export function formatCitation(m: Material, style: CitationStyle): string {
  return stripMarks(formatCitationRich(m, style));
}

export function toPlainCitation(rich: string) {
  return stripMarks(rich);
}

export type CitationRun = { text: string; italic: boolean; bold: boolean };

export function toCitationRuns(rich: string): CitationRun[] {
  const runs: CitationRun[] = [];
  let italic = false;
  let bold = false;
  for (const piece of rich.split(/([-])/)) {
    if (piece === ITALIC[0]) italic = true;
    else if (piece === ITALIC[1]) italic = false;
    else if (piece === BOLD[0]) bold = true;
    else if (piece === BOLD[1]) bold = false;
    else if (piece) runs.push({ text: piece, italic, bold });
  }
  return runs;
}

// 속성값 없이 텍스트로만 쓰므로 &, <, >만 바꾸면 된다
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Word, 한글, 구글 문서에 붙여넣을 때 서식이 유지되는 HTML
export function toCitationHtml(rich: string) {
  return toCitationRuns(rich)
    .map(({ text, italic, bold }) => {
      let html = escapeHtml(text);
      if (italic) html = `<i>${html}</i>`;
      if (bold) html = `<b>${html}</b>`;
      return html;
    })
    .join("");
}
