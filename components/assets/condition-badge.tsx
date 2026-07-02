import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AssetCondition } from "@/lib/api/types";

type BadgeColor = "info" | "success" | "warning" | "error";

const CONDITION: Record<
  AssetCondition,
  { label: string; color: BadgeColor }
> = {
  new: { label: "New", color: "info" },
  good: { label: "Good", color: "success" },
  fair: { label: "Fair", color: "warning" },
  poor: { label: "Poor", color: "error" },
};

/**
 * Asset physical condition. Text + dot (never color alone) so it stays
 * distinguishable for colour-blind users and screen readers.
 */
export function ConditionBadge({
  condition,
  className,
}: {
  condition: AssetCondition;
  className?: string;
}) {
  const meta = CONDITION[condition];
  if (!meta) return null;
  return (
    <Badge color={meta.color} dot className={cn(className)}>
      {meta.label}
    </Badge>
  );
}

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  new: CONDITION.new.label,
  good: CONDITION.good.label,
  fair: CONDITION.fair.label,
  poor: CONDITION.poor.label,
};
