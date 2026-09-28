"use client";

import { useState } from "react";
import type { Author } from "@/lib/materials";

const smallInputClass =
  "rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function formatAuthor(a: Author) {
  return [a.familyName, a.middleName, a.givenName].filter(Boolean).join(" ");
}

export default function AuthorListEditor({
  authors,
  onChange,
}: {
  authors: Author[];
  onChange: (authors: Author[]) => void;
}) {
  const [familyName, setFamilyName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [givenName, setGivenName] = useState("");

  function handleAdd() {
    if (!familyName || !givenName) return;
    onChange([
      ...authors,
      { familyName, middleName: middleName || undefined, givenName },
    ]);
    setFamilyName("");
    setMiddleName("");
    setGivenName("");
  }

  function handleRemove(index: number) {
    onChange(authors.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        저자 목록
      </span>

      {authors.length > 0 && (
        <ul className="flex flex-col gap-1">
          {authors.map((a, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded bg-zinc-100 px-3 py-1.5 text-sm dark:bg-zinc-800"
            >
              {formatAuthor(a)}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-xs text-zinc-500 hover:text-red-600"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${smallInputClass} w-24`}
          placeholder="성"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
        />
        <input
          className={`${smallInputClass} w-24`}
          placeholder="미들 네임"
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
        />
        <input
          className={`${smallInputClass} w-24`}
          placeholder="이름"
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:border-[#1b4965] hover:text-[#1b4965] dark:border-zinc-700 dark:text-zinc-400"
        >
          + 저자 추가
        </button>
      </div>
    </div>
  );
}
