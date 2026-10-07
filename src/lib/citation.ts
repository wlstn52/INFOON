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

function period(s: string) {
  return /[.?!]$/.test(s) ? s : `${s}.`;
}

function doiUrl(identifier?: string) {
  const m = identifier?.match(/10\.\d{4,9}\/\S+/);
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

function apaAuthors(list: Author[]) {
  const names = list.map((a) => nameInverted(a, true));
  if (names.length === 1) return names[0];
  if (names.length <= 20) {
    return `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  }
  return `${names.slice(0, 19).join(", ")}, . . . ${names[names.length - 1]}`;
}

function mlaAuthors(list: Author[]) {
  if (list.length >= 3) return `${nameInverted(list[0], false)}, et al.`;
  if (list.length === 2) {
    return `${nameInverted(list[0], false)}, and ${nameNatural(list[1], false)}`;
  }
  return nameInverted(list[0], false);
}

function chicagoAuthors(list: Author[]) {
  const shown = list.length > 10 ? list.slice(0, 7) : list;
  const names = shown.map((a, i) =>
    i === 0 ? nameInverted(a, false) : nameNatural(a, false),
  );
  if (list.length > 10) return `${names.join(", ")}, et al.`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]}, and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function ieeeAuthors(list: Author[]) {
  if (list.length > 6) return `${nameNatural(list[0], true)} et al.`;
  const names = list.map((a) => nameNatural(a, true));
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function prepare(m: Material) {
  const authors = m.authors ?? [];
  const org = m.organization?.trim() || undefined;
  const publisher = m.publisher?.trim() || undefined;
  return {
    authors,
    org,
    // 저자가 없으면 기관이 저자 자리를 차지하고, 저자가 있으면 기관이 발행처 역할을 한다
    byline: authors.length ? undefined : org,
    publisher: publisher ?? (authors.length ? org : undefined),
    title: m.title.trim(),
    link: doiUrl(m.identifier) ?? (m.url?.trim() || undefined),
    date: parseDate(m.publish_date, m.year),
    accessed: m.access_date?.trim() ? parseDate(m.access_date) : undefined,
  };
}

function apa(m: Material) {
  const p = prepare(m);
  const d = hasFullDate(p.date)
    ? `${p.date.year}, ${MONTH_FULL[p.date.month - 1]} ${p.date.day}`
    : (p.date.year ?? "n.d.");
  const author = p.authors.length ? apaAuthors(p.authors) : p.byline;
  const parts = author
    ? [period(author), `(${d}).`, period(p.title)]
    : [period(p.title), `(${d}).`];
  if (p.publisher) parts.push(period(p.publisher));
  if (p.link) parts.push(p.link);
  return parts.join(" ");
}

function mla(m: Material) {
  const p = prepare(m);
  const parts: string[] = [];
  const author = p.authors.length ? mlaAuthors(p.authors) : undefined;
  if (author) parts.push(period(author));
  parts.push(period(p.title));
  const date = hasFullDate(p.date)
    ? `${p.date.day} ${MONTH_MLA[p.date.month - 1]} ${p.date.year}`
    : p.date.year;
  const container = [p.publisher ?? p.byline, date].filter(Boolean).join(", ");
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
  const author = p.authors.length ? chicagoAuthors(p.authors) : p.byline;
  if (author) parts.push(period(author));
  parts.push(period(p.title));
  const date = hasFullDate(p.date)
    ? `${MONTH_FULL[p.date.month - 1]} ${p.date.day}, ${p.date.year}`
    : (p.date.year ?? "n.d.");
  parts.push(period([p.publisher, date].filter(Boolean).join(", ")));
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
  const author = p.authors.length ? ieeeAuthors(p.authors) : p.byline;
  const rest = [p.publisher, p.date.year].filter(Boolean).join(", ");
  const title = /[.?!]$/.test(p.title)
    ? `"${p.title}"`
    : `"${p.title}${rest ? "," : "."}"`;
  let text = `${author ? `${author}, ` : ""}${title}${rest ? ` ${rest}.` : ""}`;
  if (p.link) {
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

export function formatCitation(m: Material, style: CitationStyle): string {
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
