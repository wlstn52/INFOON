"use client";

import { useId, useState } from "react";

const MAX_TAGS = 10;
const MAX_LENGTH = 30;

export default function TagInput({
  tags,
  onChange,
  suggestions,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const uid = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  // 여러 개를 한 번에 추가한다 (쉼표로 구분해 붙여넣은 경우 포함).
  // 추가하지 못한 항목이 있으면 입력칸에 남겨 고칠 수 있게 한다.
  function commit(raws: string[], rest = "") {
    const next = [...tags];
    const rejected: string[] = [];
    let message = "";
    for (const raw of raws) {
      const tag = raw.trim().normalize("NFC");
      if (!tag) continue;
      if (next.some((t) => t.toLowerCase() === tag.toLowerCase())) continue;
      if (tag.length > MAX_LENGTH) {
        message = `태그는 ${MAX_LENGTH}자 이하로 입력해 주세요.`;
        rejected.push(tag);
      } else if (next.length >= MAX_TAGS) {
        message = `태그는 ${MAX_TAGS}개까지 달 수 있습니다.`;
        rejected.push(tag);
      } else {
        next.push(tag);
      }
    }
    if (next.length !== tags.length) onChange(next);
    setDraft([...rejected, rest].filter(Boolean).join(", "));
    setError(message);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5 rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
          >
            #{tag}
            <button
              type="button"
              aria-label={`${tag} 태그 지우기`}
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-zinc-500 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
          placeholder={tags.length ? "" : "입력 후 Enter 또는 쉼표"}
          aria-label="태그 추가"
          list={`${uid}-tags`}
          value={draft}
          onChange={(e) => {
            const parts = e.target.value.split(",");
            if (parts.length > 1) commit(parts.slice(0, -1), parts[parts.length - 1]);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit([draft]);
            } else if (e.key === "Backspace" && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => commit([draft])}
        />
        <datalist id={`${uid}-tags`}>
          {suggestions
            .filter((s) => !tags.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
