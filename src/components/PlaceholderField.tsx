export default function PlaceholderField({
  label,
  tall = false,
}: {
  label: string;
  tall?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-24 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      <div
        className={`flex-1 rounded border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 ${
          tall ? "h-20" : "h-9"
        }`}
      />
    </div>
  );
}
