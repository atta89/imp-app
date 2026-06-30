import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type AssetStatus =
  | "available"
  | "in_use"
  | "in_repair"
  | "retired"
  | "lost";

type BadgeColor = "gray" | "brand" | "success" | "warning" | "error" | "info";

interface StatusBadgeProps {
  status: AssetStatus;
  /** currentVenue !== homeVenue */
  away?: boolean;
  /** Name of the current venue, shown when away. */
  venueName?: string;
  /** expectedReturnDate is in the past. */
  overdue?: boolean;
  className?: string;
}

/**
 * Combines lifecycle status + location into one label per PRD §4.
 * Renders an Overdue indicator alongside when `overdue`.
 */
export function StatusBadge({
  status,
  away = false,
  venueName,
  overdue = false,
  className,
}: StatusBadgeProps) {
  const { label, color, dot } = resolve(status, away, venueName);

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5", className)}>
      <Badge
        color={color}
        dot={dot}
        // Retired reads more muted (Gray 400 / lighter tint) on dark.
        className={
          status === "retired" ? "dark:bg-white/6 dark:text-gray-400" : undefined
        }
      >
        {label}
      </Badge>
      {overdue && (
        <Badge
          color="error"
          className="gap-1 dark:bg-error-400/20 dark:border-error-400/40"
        >
          <AlertTriangle className="size-3" />
          Overdue
        </Badge>
      )}
    </span>
  );
}

function resolve(
  status: AssetStatus,
  away: boolean,
  venueName?: string,
): { label: string; color: BadgeColor; dot: boolean } {
  const at = venueName ? `at ${venueName}` : "away";
  switch (status) {
    case "in_use":
      return away
        ? { label: `In use — ${at}`, color: "brand", dot: true }
        : { label: "In use — home venue", color: "info", dot: true };
    case "available":
      return away
        ? { label: `Available — ${at}`, color: "gray", dot: true }
        : { label: "Available — home venue", color: "gray", dot: true };
    case "in_repair":
      return { label: "In repair", color: "warning", dot: true };
    case "retired":
      return { label: "Retired", color: "gray", dot: false };
    case "lost":
      return { label: "Lost", color: "error", dot: true };
  }
}
