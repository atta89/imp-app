"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import {
  useBulkTransfer,
  useBulkChangeStatus,
  useBulkQrPdf,
} from "@/lib/api/hooks";
import { errorMessage } from "@/lib/api/errors";
import type {
  AssetStatus,
  BulkActionResponse,
  BulkActionResult,
  Venue,
} from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormRow } from "@/components/layout/form";

const STATUS_LABEL: Record<AssetStatus, string> = {
  available: "Available",
  in_use: "In use",
  in_repair: "In repair",
  retired: "Retired",
  lost: "Lost",
};
const STATUSES: AssetStatus[] = [
  "available",
  "in_use",
  "in_repair",
  "retired",
  "lost",
];

// Human labels for the stable per-row error codes the backend returns.
const ERROR_LABEL: Record<string, string> = {
  not_found: "Asset not found",
  forbidden: "Not permitted for your role/venues",
  dest_venue_forbidden: "Destination venue not permitted",
  invalid_transition: "Illegal status change for current state",
  same_venue: "Already at the destination venue",
  duplicate_id: "Duplicated in the selection",
  dest_venue_not_found: "Destination venue not found",
  dest_not_found: "Destination venue not found",
  batch_too_large: "Too many assets — the batch limit is 500",
};
const errorLabel = (code: string | undefined) =>
  (code && ERROR_LABEL[code]) || code || "Unknown error";

const SYNTHETIC_ID = "000000000000000000000000";

export type ResolveTag = (assetId: string) => string;

/** Shared (within this file only) failure report for transfer + status results. */
function BulkFailureReport({
  result,
  resolveTag,
}: {
  result: BulkActionResponse;
  resolveTag: ResolveTag;
}) {
  const failures = result.results.filter((r) => !r.ok);

  // Batch-wide synthetic row → one top-line message, not a per-row group.
  const batchWide =
    failures.length === 1 && failures[0].assetId === SYNTHETIC_ID;

  if (batchWide) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-400/20 dark:bg-error-400/10 dark:text-error-300">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{errorLabel(failures[0].error)}</span>
      </div>
    );
  }

  // Group by error code.
  const groups = new Map<string, BulkActionResult[]>();
  for (const f of failures) {
    const key = f.error ?? "unknown";
    const arr = groups.get(key);
    if (arr) arr.push(f);
    else groups.set(key, [f]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {result.succeeded > 0
            ? `${result.failed} of ${result.total} couldn’t be processed`
            : `None of the ${result.total} could be processed`}
        </p>
        <Badge color="error">{result.failed} failed</Badge>
      </div>
      <p className="text-xs text-text-tertiary">
        Nothing was changed — the batch is applied all-or-nothing. Fix the items
        below and try again.
      </p>
      <ul className="max-h-64 space-y-3 overflow-y-auto">
        {[...groups.entries()].map(([code, rows]) => (
          <li
            key={code}
            className="rounded-lg border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {errorLabel(code)}
              </span>
              <Badge color="gray">{rows.length}</Badge>
            </div>
            <p className="mt-1.5 break-words text-xs text-text-secondary tabular-nums">
              {rows.map((r) => resolveTag(r.assetId)).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useResetOnOpen(open: boolean, fn: () => void) {
  React.useEffect(() => {
    if (open) fn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

// ── Bulk transfer ─────────────────────────────────────────────────────────────

const transferSchema = z.object({
  toVenueId: z.string().min(1, "Choose a destination venue"),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
});
type TransferValues = z.infer<typeof transferSchema>;

export function BulkTransferDialog({
  open,
  onOpenChange,
  assetIds,
  venues,
  resolveTag,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
  venues: Venue[];
  resolveTag: ResolveTag;
  onDone: () => void;
}) {
  const mutation = useBulkTransfer();
  const [result, setResult] = React.useState<BulkActionResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { toVenueId: "", expectedReturnDate: "", notes: "" },
  });

  useResetOnOpen(open, () => {
    reset({ toVenueId: "", expectedReturnDate: "", notes: "" });
    setResult(null);
  });

  async function onSubmit(values: TransferValues) {
    try {
      const res = await mutation.mutateAsync({
        assetIds,
        toVenueId: values.toVenueId,
        expectedReturnDate: values.expectedReturnDate
          ? new Date(values.expectedReturnDate).toISOString()
          : undefined,
        notes: values.notes || undefined,
      });
      if (res.failed === 0) {
        toast.success(
          `${res.succeeded} asset${res.succeeded === 1 ? "" : "s"} transferred.`,
        );
        onDone();
        onOpenChange(false);
      } else {
        setResult(res);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {result ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Transfer results</DialogTitle>
            </DialogHeader>
            <BulkFailureReport result={result} resolveTag={resolveTag} />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setResult(null)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  onDone();
                  onOpenChange(false);
                }}
              >
                Clear selection &amp; close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Transfer {assetIds.length} assets</DialogTitle>
              <DialogDescription>
                Move every selected asset to one venue.
              </DialogDescription>
            </DialogHeader>
            <FormRow
              label="Destination venue"
              htmlFor="bulk-venue"
              required
              error={errors.toVenueId?.message}
            >
              <Select id="bulk-venue" className="w-full" {...register("toVenueId")}>
                <option value="">Select a venue…</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow
              label="Expected return date"
              htmlFor="bulk-return"
              helper="Applied to assets not returning home. Leave blank for a permanent move."
            >
              <Input
                id="bulk-return"
                type="date"
                {...register("expectedReturnDate")}
              />
            </FormRow>
            <FormRow label="Notes" htmlFor="bulk-notes">
              <Textarea id="bulk-notes" placeholder="Optional" {...register("notes")} />
            </FormRow>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Transferring…" : "Transfer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk change status ────────────────────────────────────────────────────────

const statusSchema = z.object({
  status: z.enum(["available", "in_use", "in_repair", "retired", "lost"]),
  reason: z.string().optional(),
});
type StatusValues = z.infer<typeof statusSchema>;

export function BulkChangeStatusDialog({
  open,
  onOpenChange,
  assetIds,
  resolveTag,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
  resolveTag: ResolveTag;
  onDone: () => void;
}) {
  const mutation = useBulkChangeStatus();
  const [result, setResult] = React.useState<BulkActionResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StatusValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: "available", reason: "" },
  });

  useResetOnOpen(open, () => {
    reset({ status: "available", reason: "" });
    setResult(null);
  });

  async function onSubmit(values: StatusValues) {
    try {
      const res = await mutation.mutateAsync({
        assetIds,
        status: values.status,
        reason: values.reason || undefined,
      });
      if (res.failed === 0) {
        toast.success(
          `${res.succeeded} asset${res.succeeded === 1 ? "" : "s"} updated.`,
        );
        onDone();
        onOpenChange(false);
      } else {
        setResult(res);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {result ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Status change results</DialogTitle>
            </DialogHeader>
            <BulkFailureReport result={result} resolveTag={resolveTag} />
            <DialogFooter>
              <Button variant="secondary" onClick={() => setResult(null)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  onDone();
                  onOpenChange(false);
                }}
              >
                Clear selection &amp; close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Change status — {assetIds.length} assets</DialogTitle>
              <DialogDescription>
                Each asset is validated individually; illegal transitions are
                reported back.
              </DialogDescription>
            </DialogHeader>
            <FormRow
              label="New status"
              htmlFor="bulk-status"
              required
              error={errors.status?.message}
            >
              <Select id="bulk-status" className="w-full" {...register("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow label="Reason" htmlFor="bulk-reason">
              <Textarea id="bulk-reason" placeholder="Optional" {...register("reason")} />
            </FormRow>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating…" : "Change status"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk print labels ─────────────────────────────────────────────────────────

export function BulkPrintLabelsDialog({
  open,
  onOpenChange,
  assetIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
}) {
  const mutation = useBulkQrPdf();

  async function handlePrint() {
    try {
      const blob = await mutation.mutateAsync({ assetIds });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "asset-labels.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Labels ready — downloading.");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Print labels</DialogTitle>
          <DialogDescription>
            Generate a printable PDF of QR labels for {assetIds.length} asset
            {assetIds.length === 1 ? "" : "s"} (18 per A4 page).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handlePrint} disabled={mutation.isPending}>
            {mutation.isPending ? "Preparing…" : "Download PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
