"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CircleCheck,
  CircleX,
  AlertTriangle,
  Download,
  RotateCw,
  Loader2,
} from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { errorMessage } from "@/lib/api/errors";
import {
  useBulkJob,
  useInvalidateAfterBulkJob,
  isBulkJobTerminal,
  downloadBulkJobResult,
} from "@/lib/api/bulk-hooks";
import type { BulkJob, BulkJobCounts, BulkJobRowError } from "@/lib/api/types";

/** assetId → human asset tag (falls back to a short id when unknown). */
export type ResolveTag = (assetId: string) => string;

const TYPE_NOUN: Record<BulkJob["type"], string> = {
  transfer: "transfer",
  status: "status change",
  assign: "reassignment",
  condition: "condition update",
  qr: "label render",
  ids: "asset selection",
};

function CountGrid({ counts }: { counts: BulkJobCounts }) {
  const items = [
    { label: "Total", value: counts.total },
    { label: "Succeeded", value: counts.succeeded },
    { label: "Failed", value: counts.failed },
    { label: "Skipped", value: counts.skipped },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border bg-gray-25 p-3 dark:bg-white/2"
        >
          <p className="text-display-sm tabular-nums text-foreground">
            {it.value}
          </p>
          <p className="text-xs text-text-secondary">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Percent complete from committed batches, falling back to processed rows. */
function progressPct(job: BulkJob | undefined): number | undefined {
  if (!job) return undefined;
  const { batchesTotal, batchesDone } = job.progress;
  if (batchesTotal > 0) return Math.round((batchesDone / batchesTotal) * 100);
  const { total, succeeded, failed, skipped } = job.counts;
  if (total > 0)
    return Math.round(((succeeded + failed + skipped) / total) * 100);
  return undefined;
}

// Human labels for the stable per-row error codes a job can surface in errors[].
// These are genuine execution failures — not-found/forbidden/no-op rows are
// counted as skips, not listed here.
const ROW_ERROR_LABEL: Record<string, string> = {
  not_found: "Asset not found",
  forbidden: "Not permitted for your role/venues",
  dest_venue_forbidden: "Destination venue not permitted",
  dest_venue_not_found: "Destination venue not found",
  dest_not_found: "Destination venue not found",
  invalid_transition: "Illegal status change for current state",
  same_venue: "Already at the destination venue",
  duplicate_id: "Duplicated in the selection",
  batch_too_large: "Too many assets for one batch",
};
const rowErrorLabel = (code: string) => ROW_ERROR_LABEL[code] ?? code;

function ErrorsTable({
  job,
  resolveTag,
}: {
  job: BulkJob;
  resolveTag?: ResolveTag;
}) {
  const columns: Column<BulkJobRowError>[] = [
    {
      id: "asset",
      header: "Asset",
      className: "min-w-[120px]",
      cell: (e) => (
        <span className="font-medium tabular-nums text-foreground">
          {resolveTag ? resolveTag(e.assetId) : e.assetId.slice(-6)}
        </span>
      ),
    },
    {
      id: "code",
      header: "Reason",
      className: "min-w-[200px]",
      cell: (e) => (
        <span className="text-foreground">
          {rowErrorLabel(e.code)}{" "}
          <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs text-text-secondary">
            {e.code}
          </code>
        </span>
      ),
    },
    {
      id: "message",
      header: "Message",
      className: "min-w-[220px]",
      cell: (e) => (
        <span className="text-error-700 dark:text-error-300">{e.message}</span>
      ),
    },
  ];
  return (
    <div className="space-y-2">
      <DataTable
        columns={columns}
        data={job.errors}
        getRowId={(e) => `${e.assetId}-${e.code}`}
      />
      {job.errorsTruncated && (
        <p className="text-xs text-text-tertiary">
          Showing the first {job.errors.length} errors — more occurred than are
          retained.
        </p>
      )}
    </div>
  );
}

/** Download button + 404/410 handling for a completed QR job. */
function QrResultDownload({
  jobId,
  onRerun,
}: {
  jobId: string;
  onRerun?: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [expired, setExpired] = React.useState(false);

  async function handleDownload() {
    setBusy(true);
    try {
      const outcome = await downloadBulkJobResult(jobId);
      if (outcome === "not_ready") {
        toast.info("Labels are still being prepared — try again in a moment.");
      } else if (outcome === "expired") {
        setExpired(true);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (expired) {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2.5 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700 dark:border-warning-400/20 dark:bg-warning-400/10 dark:text-warning-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            This label PDF has expired and is no longer available. Re-run the QR
            job to generate a fresh one.
          </span>
        </div>
        {onRerun && (
          <Button variant="secondary" onClick={onRerun}>
            <RotateCw className="size-4" />
            Re-run QR job
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button onClick={handleDownload} disabled={busy}>
      <Download className="size-4" />
      {busy ? "Preparing…" : "Download labels PDF"}
    </Button>
  );
}

export function BulkJobProgress({
  jobId,
  initialJob,
  resolveTag,
  onRerunQr,
  footer,
}: {
  jobId: string;
  /** Seed from the enqueue response so counts show before the first poll. */
  initialJob?: BulkJob;
  resolveTag?: ResolveTag;
  /** Called when a user asks to re-run an expired QR job. */
  onRerunQr?: () => void;
  /** Extra actions rendered in the terminal footer (e.g. "Start another"). */
  footer?: React.ReactNode;
}) {
  const query = useBulkJob(jobId);
  const job = query.data ?? initialJob;
  const invalidate = useInvalidateAfterBulkJob();

  const terminal = isBulkJobTerminal(job?.status);

  // Refresh asset/dashboard data once, when the job settles.
  const invalidatedRef = React.useRef(false);
  React.useEffect(() => {
    if (terminal && !invalidatedRef.current) {
      invalidatedRef.current = true;
      invalidate();
    }
  }, [terminal, invalidate]);

  // Couldn't reach the job endpoint and have nothing to show.
  if (query.isError && !job) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-400/20 dark:bg-error-400/10 dark:text-error-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Couldn’t fetch the job status. It may still be running on the server.
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
          <RotateCw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }

  const noun = job ? TYPE_NOUN[job.type] : "job";

  // ── Running / queued ──
  if (!terminal) {
    const pct = progressPct(job);
    const queued = job?.status === "queued" || !job;
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text-secondary">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              {queued ? "Queued — waiting for a worker…" : `Running ${noun}…`}
            </span>
            {pct !== undefined && (
              <span className="font-medium tabular-nums text-foreground">
                {pct}%
              </span>
            )}
          </div>
          <Progress value={pct} />
        </div>
        {job && <CountGrid counts={job.counts} />}
        <p className="text-xs text-text-tertiary">
          This runs in the background in batches and keeps going on the server
          even if you close this dialog.
        </p>
      </div>
    );
  }

  // ── Terminal ──
  const status = job!.status;
  const isQr = job!.type === "qr";
  const success = status === "completed";
  const withErrors = status === "completed_with_errors";

  const tone = success ? "success" : withErrors ? "warning" : "error";
  const Icon = success ? CircleCheck : withErrors ? AlertTriangle : CircleX;
  const iconClass =
    tone === "success"
      ? "bg-success-50 text-success-600 dark:bg-success-400/15 dark:text-success-400"
      : tone === "warning"
        ? "bg-warning-50 text-warning-600 dark:bg-warning-400/15 dark:text-warning-400"
        : "bg-error-50 text-error-600 dark:bg-error-400/15 dark:text-error-400";

  const heading = success
    ? "Done"
    : withErrors
      ? "Completed with errors"
      : "Job failed";
  const { succeeded, failed, skipped } = job!.counts;
  const subline = success
    ? `${succeeded} applied${skipped > 0 ? ` · ${skipped} skipped` : ""}.`
    : withErrors
      ? `${succeeded} applied · ${failed} failed${skipped > 0 ? ` · ${skipped} skipped` : ""}.`
      : "No rows were applied.";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-11 items-center justify-center rounded-full ${iconClass}`}
        >
          <Icon className="size-6" />
        </span>
        <div>
          <h2 className="text-title-lg text-foreground">{heading}</h2>
          <p className="text-sm text-text-secondary">{subline}</p>
        </div>
      </div>

      <CountGrid counts={job!.counts} />

      {!isQr && skipped > 0 && (
        <p className="text-xs text-text-tertiary">
          Skipped assets were left unchanged — deleted, outside your venue scope,
          or already in the target state. These aren’t errors.
        </p>
      )}

      {isQr && success && (
        <QrResultDownload jobId={jobId} onRerun={onRerunQr} />
      )}

      {(withErrors || status === "failed") && job!.errors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Row errors</p>
            <Badge color={withErrors ? "warning" : "error"}>
              {job!.errors.length}
              {job!.errorsTruncated ? "+" : ""}
            </Badge>
          </div>
          <ErrorsTable job={job!} resolveTag={resolveTag} />
        </div>
      )}

      {footer}
    </div>
  );
}
