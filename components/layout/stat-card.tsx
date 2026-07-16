import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type StatTone = "gray" | "info" | "brand" | "warning" | "error" | "success";

const TONES: Record<StatTone, { tint: string; icon: string }> = {
  gray: {
    tint: "bg-gray-100 dark:bg-white/6",
    icon: "text-gray-700 dark:text-gray-300",
  },
  info: {
    tint: "bg-info-50 dark:bg-info-400/15",
    icon: "text-info-600 dark:text-info-400",
  },
  brand: {
    tint: "bg-orange-50 dark:bg-orange-400/15",
    icon: "text-orange-700 dark:text-orange-400",
  },
  warning: {
    tint: "bg-warning-50 dark:bg-warning-400/15",
    icon: "text-warning-600 dark:text-warning-400",
  },
  error: {
    tint: "bg-error-50 dark:bg-error-400/15",
    icon: "text-error-600 dark:text-error-400",
  },
  success: {
    tint: "bg-success-50 dark:bg-success-400/15",
    icon: "text-success-600 dark:text-success-400",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "gray",
  hint,
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatTone;
  hint?: string;
  loading?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            t.tint,
          )}
        >
          <Icon className={cn("size-5", t.icon)} />
        </span>
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="text-display-sm tabular-nums text-foreground">{value}</p>
        )}
        {hint && !loading && (
          <p className="mt-1 text-xs text-text-tertiary">{hint}</p>
        )}
      </div>
    </Card>
  );
}
