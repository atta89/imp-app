import {
  ArrowRightLeft,
  RefreshCw,
  UserRound,
  Wrench,
  CircleCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/format";
import type { Movement, MovementType } from "@/lib/api/types";
import type { AssetLookups } from "@/lib/assets/view";

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  in_use: "In use",
  in_repair: "In repair",
  retired: "Retired",
  lost: "Lost",
};

const ICONS: Record<MovementType, LucideIcon> = {
  transfer: ArrowRightLeft,
  status_change: RefreshCw,
  custody_change: UserRound,
  repair_in: Wrench,
  repair_out: CircleCheck,
};

function describe(m: Movement, lookups: AssetLookups): string {
  const venue = (id?: string) =>
    (id && lookups.venues.get(id)?.name) || "another venue";
  const user = (id?: string) =>
    (id && lookups.users.get(id)?.name) || "someone";
  const status = (s?: string) => (s ? (STATUS_LABEL[s] ?? s) : "—");

  switch (m.type) {
    case "transfer":
      return `Transferred from ${venue(m.fromVenueId)} to ${venue(m.toVenueId)}`;
    case "status_change":
      return `Status changed from ${status(m.fromStatus)} to ${status(m.toStatus)}`;
    case "custody_change":
      return `Custody reassigned to ${user(m.toUserId)}`;
    case "repair_in":
      return "Sent to repair";
    case "repair_out":
      return "Returned from repair";
  }
}

export function HistoryTimeline({
  movements,
  lookups,
}: {
  movements: Movement[];
  lookups: AssetLookups;
}) {
  return (
    <ol className="relative space-y-6">
      {movements.map((m, i) => {
        const Icon = ICONS[m.type] ?? RefreshCw;
        const last = i === movements.length - 1;
        const actor = lookups.users.get(m.performedBy)?.name;
        return (
          <li key={m.id} className="relative flex gap-4">
            {/* guide line */}
            {!last && (
              <span
                aria-hidden
                className="absolute left-[15px] top-9 bottom-[-24px] w-px bg-border"
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                "bg-gray-100 text-gray-600 dark:bg-white/6 dark:text-gray-300",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <p className="text-sm font-medium text-foreground">
                {describe(m, lookups)}
              </p>
              {(m.reason || m.notes) && (
                <p className="mt-0.5 text-sm text-text-secondary">
                  {m.reason || m.notes}
                </p>
              )}
              <p className="mt-1 text-xs text-text-tertiary">
                <span title={formatDate(m.performedAt)}>
                  {formatRelative(m.performedAt)}
                </span>
                {actor ? ` · by ${actor}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
