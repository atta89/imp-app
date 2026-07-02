import Link from "next/link";
import { MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";
import { ResponsibleCell } from "@/components/assets/responsible-cell";
import { formatRelative } from "@/lib/format";
import type { AssetRow } from "@/lib/assets/view";

/** Mobile (phone) representation of an asset row — stacked card. */
export function AssetCard({
  asset,
  selected,
  onSelectedChange,
}: {
  asset: AssetRow;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
}) {
  return (
    <Card
      className={cn(
        "p-4",
        selected && "ring-2 ring-brand-200 dark:ring-brand-400/40",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelectedChange}
          aria-label={`Select ${asset.assetTag}`}
          className="mt-1"
        />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/assets/${asset.id}`} className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {asset.name}
              </p>
              <p className="text-xs text-text-tertiary tabular-nums">
                {asset.assetTag} · {asset.categoryName}
              </p>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge
              status={asset.status}
              away={asset.away}
              venueName={asset.away ? asset.currentVenueName : undefined}
              overdue={asset.isOverdue}
            />
            <ConditionBadge condition={asset.condition} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MapPin className="size-3.5 text-text-tertiary" />
            <span className="truncate">
              {asset.away
                ? `${asset.homeVenueName} → ${asset.currentVenueName}`
                : asset.homeVenueName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
            <ResponsibleCell
              name={asset.responsibleName}
              position={asset.responsiblePosition}
            />
            <span className="shrink-0 text-xs text-text-tertiary">
              {formatRelative(asset.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
