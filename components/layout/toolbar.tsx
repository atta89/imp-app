import { cn } from "@/lib/utils";

/**
 * Filters + search + bulk-actions row above a table or grid.
 * `left` holds search/filters, `right` holds actions; `selection` (when a
 * bulk selection is active) replaces the left side with a contextual bar.
 */
export function Toolbar({
  left,
  right,
  selection,
  className,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
  selection?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {selection ?? left}
      </div>
      {right && (
        <div className="flex flex-wrap items-center gap-2">{right}</div>
      )}
    </div>
  );
}
