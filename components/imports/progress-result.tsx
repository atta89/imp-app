"use client";

import * as React from "react";
import Link from "next/link";
import {
  PackageCheck,
  CircleCheck,
  CircleX,
  Download,
  RotateCw,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/layout/empty-state";
import { errorMessage } from "@/lib/api/errors";
import { isTerminal, downloadImportReport } from "@/lib/api/import-hooks";
import type { ImportJob, ImportJobCounts } from "@/lib/api/types";

function CountGrid({ counts }: { counts: ImportJobCounts }) {
  const items = [
    { label: "POs created", value: counts.posCreated },
    { label: "Assets created", value: counts.assetsCreated },
    { label: "Rows skipped", value: counts.rowsSkipped },
    { label: "Rows errored", value: counts.rowsErrored },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-border bg-gray-25 p-3 dark:bg-white/2"
        >
          <p className="text-display-sm tabular-nums text-foreground">{it.value}</p>
          <p className="text-xs text-text-secondary">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

export function ProgressResult({
  jobId,
  job,
  isError,
  onRetry,
  onStartAnother,
}: {
  jobId: string;
  job: ImportJob | undefined;
  isError: boolean;
  onRetry: () => void;
  onStartAnother: () => void;
}) {
  const [downloading, setDownloading] = React.useState(false);

  async function handleReport() {
    setDownloading(true);
    try {
      await downloadImportReport(jobId);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  // Couldn't reach the job status endpoint.
  if (isError && !job) {
    return (
      <Card>
        <EmptyState
          icon={AlertTriangle}
          tone="error"
          title="Lost track of the import"
          description="Couldn’t fetch the job status. The import may still be running on the server."
          action={
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RotateCw className="size-4" />
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  const terminal = isTerminal(job?.status);

  // ── Importing (live progress) ──
  if (!terminal) {
    const counts = job?.counts;
    const pct =
      counts && counts.posTotal > 0
        ? Math.round((counts.posCreated / counts.posTotal) * 100)
        : undefined;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Importing…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {counts
                  ? `${counts.posCreated} of ${counts.posTotal} purchase orders`
                  : "Starting…"}
              </span>
              {pct !== undefined && (
                <span className="font-medium tabular-nums text-foreground">
                  {pct}%
                </span>
              )}
            </div>
            <Progress value={pct} />
          </div>
          {counts && <CountGrid counts={counts} />}
          <p className="text-xs text-text-tertiary">
            One transaction per PO — large files take a moment. You can leave this
            page; the import keeps running on the server.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Result (terminal) ──
  const success = job?.status === "completed";
  const counts = job?.counts;

  return (
    <Card>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span
            className={
              success
                ? "flex size-11 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-400/15 dark:text-success-400"
                : "flex size-11 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-400/15 dark:text-error-400"
            }
          >
            {success ? (
              <CircleCheck className="size-6" />
            ) : (
              <CircleX className="size-6" />
            )}
          </span>
          <div>
            <h2 className="text-title-lg text-foreground">
              {success
                ? "Import complete"
                : job?.status === "rolled_back"
                  ? "Import rolled back"
                  : "Import failed"}
            </h2>
            <p className="text-sm text-text-secondary">
              {success
                ? "Purchase orders and assets were created."
                : "No partial data was left in an inconsistent state."}
            </p>
          </div>
        </div>

        {counts && <CountGrid counts={counts} />}

        <p className="text-xs text-text-tertiary">
          New asset tags are listed in the result report.
        </p>

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="secondary" onClick={handleReport} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Preparing…" : "Download result report"}
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            {success && (
              <>
                <Button variant="link" size="sm" asChild>
                  <Link href="/assets">
                    View assets
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/purchase-orders">View purchase orders</Link>
                </Button>
              </>
            )}
            <Button onClick={onStartAnother}>
              <PackageCheck className="size-4" />
              Start another import
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
