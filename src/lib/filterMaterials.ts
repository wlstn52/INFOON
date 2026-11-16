import { authorKey, type Material } from "@/lib/materials";

export const ALL = "전체";

export type SortValue = "latest" | "importance" | "title";

export type MaterialFilter = {
  project: string;
  type: string;
  tag: string;
  author: string | null; // authorKey, 없으면 전체
  query: string;
  sort: SortValue;
};

const normalize = (s: string) => s.normalize("NFC").toLowerCase();

function searchableText(m: Material) {
  const authors = (m.authors ?? []).flatMap((a) => [
    [a.givenName, a.middleName, a.familyName].filter(Boolean).join(" "),
    // 한글 이름을 붙여 쓴 검색어(김진수)도 찾을 수 있게 한다
    [a.familyName, a.middleName, a.givenName].filter(Boolean).join(""),
  ]);
  return normalize(
    [
      m.title,
      m.description,
      m.journal,
      m.publisher,
      m.organization,
      m.identifier,
      ...authors,
      ...(m.tags ?? []),
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

export function matchesQuery(m: Material, query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const text = searchableText(m);
  return terms.every((term) => text.includes(term));
}

export function hasTag(m: Material, tag: string) {
  const target = normalize(tag);
  return (m.tags ?? []).some((t) => normalize(t) === target);
}

export function hasAuthor(m: Material, key: string) {
  return (m.authors ?? []).some((a) => authorKey(a) === key);
}

export function filterMaterials(materials: Material[], filter: MaterialFilter) {
  const filtered = materials.filter(
    (m) =>
      (filter.project === ALL || m.projectName === filter.project) &&
      (filter.type === ALL || m.type === filter.type) &&
      (filter.tag === ALL || hasTag(m, filter.tag)) &&
      (!filter.author || hasAuthor(m, filter.author)) &&
      matchesQuery(m, filter.query),
  );
  if (filter.sort === "latest") {
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else if (filter.sort === "importance") {
    filtered.sort((a, b) => b.importance - a.importance);
  } else {
    filtered.sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }
  return filtered;
}
