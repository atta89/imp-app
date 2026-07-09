import {
  ArrowRightLeft,
  RefreshCw,
  UserRound,
  Wrench,
  CircleCheck,
  ClipboardCheck,
  FileText,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { downloadFile } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate, formatRelative } from "@/lib/format";
import { CONDITION_LABEL } from "@/components/assets/condition-badge";
import type { Movement, MovementType, AttachmentMeta } from "@/lib/api/types";
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
  condition_change: ClipboardCheck,
  repair_in: Wrench,
  repair_out: CircleCheck,
};

function describe(m: Movement, lookups: AssetLookups): string {
  const venue = (id?: string) =>
    (id && lookups.venues.get(id)?.name) || "another venue";
  const user = (id?: string) =>
    (id && lookups.users.get(id)?.name) || "someone";
  const status = (s?: string) => (s ? (STATUS_LABEL[s] ?? s) : "—");
  const condition = (c?: string) =>
    c ? (CONDITION_LABEL[c as keyof typeof CONDITION_LABEL] ?? c) : "—";

  switch (m.type) {
    case "transfer":
      return `Transferred from ${venue(m.fromVenueId)} to ${venue(m.toVenueId)}`;
    case "status_change":
      return `Status changed from ${status(m.fromStatus)} to ${status(m.toStatus)}`;
    case "custody_change":
      return `Custody reassigned to ${user(m.toUserId)}`;
    case "condition_change":
      return `Condition changed: ${condition(m.fromCondition)} → ${condition(m.toCondition)}`;
    case "repair_in":
      return "Sent to repair";
    case "repair_out":
      return "Returned from repair";
  }
}

function AttachmentChips({ attachments }: { attachments: AttachmentMeta[] }) {
  async function download(a: AttachmentMeta) {
    try {
      await downloadFile(`/attachments/${a.id}/download`, a.filename);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a) => {
        const Icon = a.contentType.startsWith("image/") ? ImageIcon : FileText;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => download(a)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs transition-colors hover:border-brand-300 hover:bg-gray-25 dark:hover:bg-white/[0.02]"
          >
            <Icon className="size-3.5 shrink-0 text-text-tertiary" />
            <span className="max-w-[12rem] truncate font-medium text-foreground">
              {a.filename}
            </span>
            <span className="shrink-0 text-text-tertiary tabular-nums">
              {formatBytes(a.size)}
            </span>
          </button>
        );
      })}
    </div>
  );
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
              {m.attachments && m.attachments.length > 0 && (
                <AttachmentChips attachments={m.attachments} />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
