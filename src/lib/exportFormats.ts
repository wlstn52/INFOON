import type { Author, Material } from "@/lib/materials";

function displayName(a: Author) {
  return [a.familyName, a.middleName, a.givenName].filter(Boolean).join(" ");
}

function csvCell(value: string | number | undefined) {
  let text = value === undefined ? "" : String(value);
  // Excel이 셀 내용을 수식으로 실행하지 않게 막는다
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_COLUMNS: [string, (m: Material) => string | number | undefined][] = [
  ["프로젝트", (m) => m.projectName],
  ["자료명", (m) => m.title],
  ["자료 종류", (m) => m.type],
  ["저장 위치", (m) => m.location],
  ["중요도", (m) => m.importance],
  ["자료 설명", (m) => m.description],
  ["저자", (m) => m.authors?.map(displayName).join("; ")],
  ["출판사", (m) => m.publisher],
  ["발표 날짜", (m) => m.publish_date],
  ["발표 연도", (m) => m.year],
  ["언어", (m) => m.language],
  ["URL", (m) => m.url],
  ["원문 접근일", (m) => m.access_date],
  ["기관", (m) => m.organization],
  ["식별자", (m) => m.identifier],
  ["학술지명", (m) => m.journal],
  ["권", (m) => m.volume],
  ["호", (m) => m.issue],
  ["쪽", (m) => m.pages],
  ["등록일", (m) => m.createdAt],
];

export function toCsv(materials: Material[]) {
  const rows = [
    CSV_COLUMNS.map(([header]) => csvCell(header)).join(","),
    ...materials.map((m) =>
      CSV_COLUMNS.map(([, read]) => csvCell(read(m))).join(","),
    ),
  ];
  // BOM이 있어야 Excel이 한글을 UTF-8로 읽는다
  return `﻿${rows.join("\r\n")}\r\n`;
}

function latex(text: string) {
  return text
    .replace(/[\\{}]/g, (c) => (c === "\\" ? "\\textbackslash{}" : `\\${c}`))
    .replace(/[&%$#_]/g, (c) => `\\${c}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

const stripBraces = (text: string) => text.replace(/[{}]/g, "");

function entryType(m: Material) {
  if (m.journal) return "article";
  if (m.type === "단행본") return "book";
  if (m.type === "보고서") return "techreport";
  return "misc";
}

function yearOf(m: Material) {
  return m.year?.trim() || m.publish_date?.match(/\d{4}/)?.[0];
}

function citationKey(m: Material, used: Set<string>) {
  const family = m.authors?.[0]?.familyName ?? "";
  const titleWord = m.title.match(/[A-Za-z0-9]+/)?.[0] ?? "";
  const base =
    (family.replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "ref") +
    (yearOf(m) ?? "") +
    titleWord.toLowerCase();
  let key = base;
  for (let n = 2; used.has(key); n++) key = `${base}_${n}`;
  used.add(key);
  return key;
}

export function toBibtex(materials: Material[]) {
  const used = new Set<string>();
  return materials
    .map((m) => {
      const type = entryType(m);
      const authors = m.authors?.length
        ? m.authors
            .map((a) =>
              latex(
                `${a.familyName}, ${[a.givenName, a.middleName].filter(Boolean).join(" ")}`,
              ),
            )
            .join(" and ")
        : m.organization?.trim()
          ? `{${latex(m.organization.trim())}}`
          : undefined;
      const doi = m.identifier?.match(/10\.\d{4,9}\/\S+/)?.[0];
      const isbn = m.identifier?.match(/^\s*isbn[\s:-]*([\dXx-]+)/i)?.[1];
      const publisher =
        m.publisher?.trim() ||
        (type === "techreport" ? m.organization?.trim() : undefined);
      const fields: [string, string | undefined][] = [
        ["author", authors],
        ["title", latex(m.title)],
        ["journal", m.journal && latex(m.journal)],
        ["volume", m.volume && latex(m.volume)],
        ["number", m.issue && latex(m.issue)],
        ["pages", m.pages && latex(m.pages.replace(/(\d)\s*-\s*(\d)/, "$1--$2"))],
        [
          type === "techreport" ? "institution" : "publisher",
          publisher && latex(publisher),
        ],
        ["year", yearOf(m) && latex(yearOf(m)!)],
        ["language", m.language && latex(m.language)],
        // doi, url은 LaTeX에서 원문 그대로 다루므로 중괄호만 제거한다
        ["doi", doi && stripBraces(doi)],
        ["url", m.url && stripBraces(m.url)],
        ["isbn", isbn],
      ];
      const body = fields
        .filter(([, value]) => value)
        .map(([name, value]) => `  ${name} = {${value}}`)
        .join(",\n");
      return `@${type}{${citationKey(m, used)},\n${body}\n}`;
    })
    .join("\n\n")
    .concat("\n");
}

export function downloadText(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[\\/:*?"<>|]/g, "_");
  link.click();
  URL.revokeObjectURL(url);
}
