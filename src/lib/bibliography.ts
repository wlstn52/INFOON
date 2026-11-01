import { formatCitation, type CitationStyle } from "@/lib/citation";
import type { Material } from "@/lib/materials";

const HANGUL_START = /^[ㄱ-ㆎ가-힣]/;

function sortKey(m: Material) {
  const first = m.authors?.[0];
  const name = first
    ? [first.familyName, first.givenName, first.middleName]
        .filter(Boolean)
        .join(" ")
    : m.organization?.trim() || m.title;
  return name.trim().normalize("NFC");
}

// 한글 자료를 먼저, 그다음 영문 자료를 가나다/ABC순으로 정렬한다
function compare(a: Material, b: Material) {
  const keyA = sortKey(a);
  const keyB = sortKey(b);
  const groupA = HANGUL_START.test(keyA) ? 0 : 1;
  const groupB = HANGUL_START.test(keyB) ? 0 : 1;
  return (
    groupA - groupB ||
    keyA.localeCompare(keyB, "ko", { sensitivity: "base" }) ||
    (a.year ?? "").localeCompare(b.year ?? "") ||
    a.title.localeCompare(b.title, "ko")
  );
}

export function buildBibliography(materials: Material[], style: CitationStyle) {
  const entries = [...materials]
    .sort(compare)
    .map((m) => formatCitation(m, style));
  return style === "ieee"
    ? entries.map((entry, i) => `[${i + 1}] ${entry}`)
    : entries;
}
