export type ParsedIdentifier =
  | { kind: "doi"; value: string }
  | { kind: "isbn"; value: string };

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

function isbn10to13(isbn10: string) {
  const body = `978${isbn10.slice(0, 9)}`;
  const sum = [...body].reduce(
    (acc, c, i) => acc + Number(c) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return `${body}${(10 - (sum % 10)) % 10}`;
}

// 같은 자료인지 비교하기 위한 키. DOI는 대소문자를 구분하지 않고, ISBN-10과 ISBN-13은 같은 책이다.
export function identifierKey(raw?: string): string | null {
  if (!raw) return null;
  const id = parseIdentifier(raw);
  if (!id) return null;
  if (id.kind === "doi") return `doi:${id.value.toLowerCase()}`;
  return `isbn:${id.value.length === 10 ? isbn10to13(id.value) : id.value}`;
}
