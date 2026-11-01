import type { Material } from "@/lib/materials";

type Row = { label: string; count: number };

const MAX_ROWS = 6;

function countBy(materials: Material[], read: (m: Material) => string): Row[] {
  const counts = new Map<string, number>();
  for (const m of materials) {
    const key = read(m);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const rows = [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
  if (rows.length <= MAX_ROWS) return rows;
  const rest = rows.slice(MAX_ROWS - 1);
  return [
    ...rows.slice(0, MAX_ROWS - 1),
    { label: `기타 ${rest.length}개`, count: rest.reduce((n, r) => n + r.count, 0) },
  ];
}

function BarGroup({ title, rows }: { title: string; rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {title}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.label}
            title={`${row.label}: ${row.count}건`}
            className="grid grid-cols-[4.5rem_1fr] items-center gap-2 text-xs"
          >
            <span className="truncate text-zinc-600 dark:text-zinc-400">
              {row.label}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              {row.count > 0 && (
                <span
                  className="h-3 rounded-r bg-[#2a7ab0] dark:bg-[#4896cb]"
                  style={{ width: `calc((100% - 2rem) * ${row.count / max})` }}
                />
              )}
              <span className="tabular-nums">{row.count}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MaterialStats({
  materials,
  showProjects,
}: {
  materials: Material[];
  showProjects: boolean;
}) {
  const importance = [5, 4, 3, 2, 1].map((level) => ({
    label: `중요도 ${level}`,
    count: materials.filter((m) => m.importance === level).length,
  }));

  return (
    <div
      className={`grid gap-5 rounded bg-zinc-100 p-3 dark:bg-zinc-800 ${
        showProjects ? "sm:grid-cols-3" : "sm:grid-cols-2"
      }`}
    >
      <BarGroup title="중요도별" rows={importance} />
      <BarGroup title="종류별" rows={countBy(materials, (m) => m.type)} />
      {showProjects && (
        <BarGroup
          title="프로젝트별"
          rows={countBy(materials, (m) => m.projectName)}
        />
      )}
    </div>
  );
}
