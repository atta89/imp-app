import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Featured-icon empty state: icon + heading + one-line description + optional CTA.
 * Use `tone="error"` for failure states (pair with a Retry action).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "brand" | "error";
  className?: string;
}) {
  const tint =
    tone === "error"
      ? "bg-error-50 text-error-600 dark:bg-error-400/15 dark:text-error-400"
      : tone === "brand"
        ? "bg-brand-50 text-brand-600 dark:bg-brand-400/15 dark:text-brand-400"
        : "bg-gray-100 text-gray-500 dark:bg-white/6 dark:text-gray-400";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          tint,
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-text-tertiary">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
