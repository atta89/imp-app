"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  useBulkIdsJob,
  useBulkJob,
  isBulkJobTerminal,
  fetchBulkJobIdsResult,
} from "@/lib/api/bulk-hooks";
import { errorMessage } from "@/lib/api/errors";
import type { AssetListFilters, BulkJob } from "@/lib/api/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Seed for the "first N" input when the match total is unknown. */
const DEFAULT_COUNT = 100;

/** Percent complete from committed batches; undefined → indeterminate. */
function jobPct(job: BulkJob | undefined): number | undefined {
  if (!job) return undefined;
  const { batchesTotal, batchesDone } = job.progress;
  if (batchesTotal > 0) return Math.round((batchesDone / batchesTotal) * 100);
  return undefined;
}

const bannerClass =
  "rounded-xl border border-orange-200 bg-orange-25 px-4 py-2.5 text-sm text-text-secondary dark:border-orange-400/20 dark:bg-orange-400/10";

/**
 * Gmail-style "select everything that matches" affordance. Once the whole
 * current page is selected, this strip offers to expand the selection to *all*
 * assets matching the applied filters (across every page) via the async
 * `POST /assets/bulk/ids` export. Progress is shown inline as a bar — no dialog.
 *
 * `listFilters` must be the same filter values fed to `GET /assets` (minus
 * pagination) so the expanded selection matches the list exactly; the backend
 * re-applies the identical filter + venue scoping.
 */
export function SelectMatchingBanner({
  listFilters,
  total,
  pageCount,
  selectedCount,
  allPageSelected,
  onSelected,
  onClear,
}: {
  listFilters: AssetListFilters;
  /** Total matching count from the list query (across all pages). */
  total: number;
  /** Rows on the current page (for the "All N on this page" copy). */
  pageCount: number;
  selectedCount: number;
  /** True when every row on the current page is selected. */
  allPageSelected: boolean;
  onSelected: (assetIds: string[]) => void;
  onClear: () => void;
}) {
  const mutation = useBulkIdsJob();
  const [phase, setPhase] = React.useState<"idle" | "running" | "done">("idle");
  const [job, setJob] = React.useState<BulkJob | null>(null);
  // The limit requested for the in-flight job: null = "all matching", a number =
  // "first N". Captured at enqueue so the completion handler phrases it correctly.
  const [requested, setRequested] = React.useState<number | null>(null);
  const [countInput, setCountInput] = React.useState("");

  const jobQuery = useBulkJob(job?.id);
  const liveJob = jobQuery.data ?? job ?? undefined;
  const terminal = isBulkJobTerminal(liveJob?.status);

  // Collapse back to the idle prompt when the page selection is broken (the user
  // cleared it or deselected a row). setState-during-render — lint-clean, no effect.
  const [prevAllSel, setPrevAllSel] = React.useState(allPageSelected);
  if (allPageSelected !== prevAllSel) {
    setPrevAllSel(allPageSelected);
    if (!allPageSelected && phase !== "running") {
      setPhase("idle");
      setJob(null);
    }
  }

  // Consume the completed artifact exactly once when the job settles.
  const handledRef = React.useRef(false);
  React.useEffect(() => {
    if (!job || !terminal || handledRef.current) return;
    handledRef.current = true;
    const settled = liveJob!;

    (async () => {
      if (settled.status !== "completed") {
        toast.error("Couldn’t build the selection. Please try again.");
        setPhase("idle");
        setJob(null);
        return;
      }
      try {
        const result = await fetchBulkJobIdsResult(job.id);
        if ("state" in result) {
          toast.error(
            result.state === "expired"
              ? "This selection expired before it could be read. Please try again."
              : "The selection isn’t ready yet. Please try again.",
          );
          setPhase("idle");
          setJob(null);
          return;
        }

        onSelected(result.assetIds);
        const { count, truncated } = result;
        if (count === 0) {
          toast.info("No assets match the current filters.");
          setPhase("idle");
        } else {
          if (requested === null && truncated) {
            // "All matching" hit the server cap — flag the shortfall.
            toast.warning(
              `More assets matched than the limit — selected the first ${count}.`,
            );
          } else if (requested !== null && count < requested) {
            // "First N" but fewer matched — note it, not a truncation.
            toast.info(`Only ${count} asset${count === 1 ? "" : "s"} matched.`);
          }
          setPhase("done");
        }
        setJob(null);
      } catch (e) {
        toast.error(errorMessage(e));
        setPhase("idle");
        setJob(null);
      }
    })();
  }, [job, terminal, liveJob, requested, onSelected]);

  async function enqueue(limit: number | null) {
    handledRef.current = false;
    setRequested(limit);
    setPhase("running");
    try {
      const enqueued = await mutation.mutateAsync({
        filters: listFilters,
        ...(limit !== null ? { limit } : {}),
      });
      setJob(enqueued);
    } catch (e) {
      toast.error(errorMessage(e));
      setPhase("idle");
    }
  }

  // Empty input falls back to a sensible default; the backend caps anything
  // above ASSET_IDS_MAX_LIMIT and reports it (surfaced as a toast on 400).
  const defaultN = Math.max(1, Math.min(total > 0 ? total : DEFAULT_COUNT, DEFAULT_COUNT));
  const rawCount = countInput.trim();
  const parsedCount = rawCount === "" ? defaultN : Number(rawCount);
  const countValid = Number.isInteger(parsedCount) && parsedCount >= 1;

  // ── Running: inline progress bar, no dialog ──
  if (phase === "running") {
    const pct = jobPct(liveJob);
    return (
      <div className={`${bannerClass} space-y-2 py-3`}>
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          <span>Selecting all matching assets…</span>
          {pct !== undefined && (
            <span className="font-medium tabular-nums text-foreground">
              {pct}%
            </span>
          )}
        </div>
        <Progress value={pct} />
      </div>
    );
  }

  // ── Done: the requested set is selected ──
  if (phase === "done") {
    if (!allPageSelected) return null; // selection changed out from under us
    const countEl = (
      <span className="font-semibold text-foreground">{selectedCount}</span>
    );
    return (
      <div className={`${bannerClass} flex flex-wrap items-center justify-center gap-x-2 gap-y-1`}>
        <span>
          {requested === null ? (
            <>All {countEl} matching asset{selectedCount === 1 ? "" : "s"} are selected.</>
          ) : (
            <>{countEl} asset{selectedCount === 1 ? "" : "s"} selected.</>
          )}
        </span>
        <Button variant="link" size="sm" onClick={onClear}>
          Clear selection
        </Button>
      </div>
    );
  }

  // ── Idle prompt: page fully selected and more matches exist elsewhere ──
  if (!allPageSelected || total <= selectedCount) return null;
  return (
    <div className={`${bannerClass} flex flex-wrap items-center justify-center gap-x-2 gap-y-2`}>
      <span>
        All <span className="font-semibold text-foreground">{pageCount}</span> on
        this page are selected.
      </span>
      <Button
        variant="link"
        size="sm"
        onClick={() => enqueue(null)}
        disabled={mutation.isPending}
      >
        Select all {total} matching
      </Button>
      <span className="text-text-tertiary">or</span>
      <div className="flex items-center gap-1.5">
        <label htmlFor="select-matching-count">first</label>
        <Input
          id="select-matching-count"
          type="number"
          min={1}
          max={total}
          step={1}
          inputMode="numeric"
          placeholder={String(defaultN)}
          value={countInput}
          onChange={(e) => setCountInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && countValid && !mutation.isPending) {
              enqueue(parsedCount);
            }
          }}
          aria-label="Number of assets to select"
          className="h-8 w-20"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => enqueue(parsedCount)}
          disabled={mutation.isPending || !countValid}
        >
          Select
        </Button>
      </div>
    </div>
  );
}
