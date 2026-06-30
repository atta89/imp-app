import { cn } from "@/lib/utils";

/** Themed progress bar. Pass `value` 0–100 for determinate; omit for indeterminate. */
export function Progress({
  value,
  className,
}: {
  value?: number;
  className?: string;
}) {
  const determinate = typeof value === "number";
  const pct = determinate ? Math.min(100, Math.max(0, value)) : undefined;

  return (
    <div
      role="progressbar"
      aria-valuenow={determinate ? pct : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-brand transition-[width] duration-500 ease-out",
          !determinate &&
            "w-2/5 animate-pulse motion-reduce:animate-none motion-reduce:w-full",
        )}
        style={determinate ? { width: `${pct}%` } : undefined}
      />
    </div>
  );
}
