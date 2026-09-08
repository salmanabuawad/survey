import { cn } from "@/lib/utils";

/**
 * Native ARIA rather than a headless library: a single meter with an accessible
 * name is all this needs, and it keeps the client bundle small.
 */
export function Progress({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn(
        "h-3 w-full overflow-hidden rounded-full bg-cream-200 ring-1 ring-cream-200/80",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-l from-coral-400 via-teal-500 to-violet-500 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
