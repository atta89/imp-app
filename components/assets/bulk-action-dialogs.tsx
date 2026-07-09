"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

import {
  useBulkAssign,
  useBulkTransfer,
  useBulkChangeStatus,
  useBulkQrPdf,
  useBulkUpdateCondition,
} from "@/lib/api/hooks";
import { attachmentErrors, errorMessage } from "@/lib/api/errors";
import type { AttachmentErrorCode } from "@/lib/api/errors";
import type {
  AssetCondition,
  AssetStatus,
  BulkActionResponse,
  BulkActionResult,
  BulkAssignResponse,
  BulkConditionResult,
  User,
  Venue,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { CONDITION_LABEL } from "@/components/assets/condition-badge";
import { AttachmentPicker } from "@/components/attachments/attachment-picker";
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
  errorLabelFor,
}: {
  result: BulkActionResponse;
  resolveTag: ResolveTag;
  /** Optional per-code label override; falls back to the shared ERROR_LABEL map. */
  errorLabelFor?: (code: string | undefined) => string;
}) {
  const labelOf = errorLabelFor ?? errorLabel;
  const failures = result.results.filter((r) => !r.ok);

  // Batch-wide synthetic row → one top-line message, not a per-row group.
  const batchWide =
    failures.length === 1 && failures[0].assetId === SYNTHETIC_ID;

  if (batchWide) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-400/20 dark:bg-error-400/10 dark:text-error-300">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{labelOf(failures[0].error)}</span>
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
                {labelOf(code)}
              </span>
              <Badge color="gray">{rows.length}</Badge>
            </div>
            <p className="mt-1.5 wrap-break-word text-xs text-text-secondary tabular-nums">
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
  attachmentIds: z.array(z.string()).max(5, "Up to 5 files").optional(),
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
  const [attachErrors, setAttachErrors] = React.useState<
    Record<string, AttachmentErrorCode>
  >({});
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { toVenueId: "", expectedReturnDate: "", notes: "" },
  });

  useResetOnOpen(open, () => {
    reset({ toVenueId: "", expectedReturnDate: "", notes: "", attachmentIds: [] });
    setResult(null);
    setAttachErrors({});
  });

  async function onSubmit(values: TransferValues) {
    setAttachErrors({});
    try {
      const res = await mutation.mutateAsync({
        assetIds,
        toVenueId: values.toVenueId,
        expectedReturnDate: values.expectedReturnDate
          ? new Date(values.expectedReturnDate).toISOString()
          : undefined,
        notes: values.notes || undefined,
        attachmentIds: values.attachmentIds?.length
          ? values.attachmentIds
          : undefined,
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
      const attErrs = attachmentErrors(e);
      if (Object.keys(attErrs).length) {
        setAttachErrors(attErrs);
        return;
      }
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
            <FormRow
              label="Attachments"
              helper="Applied to every selected asset · up to 5 files · 10 MB each"
              error={errors.attachmentIds?.message}
            >
              <AttachmentPicker
                onChange={(ids) =>
                  setValue("attachmentIds", ids, { shouldValidate: true })
                }
                serverErrors={attachErrors}
                disabled={mutation.isPending}
              />
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

// ── Bulk reassign custody ─────────────────────────────────────────────────────

// Per-row error copy the assign endpoint returns; overrides the shared map
// with the wording the spec asked for on this surface.
const ASSIGN_ERROR_LABEL: Record<string, string> = {
  not_found: "Asset no longer exists",
  forbidden: "You don’t have access to this asset",
  duplicate_id: "Duplicate asset in selection",
};
const assignErrorLabel = (code: string | undefined) =>
  (code && ASSIGN_ERROR_LABEL[code]) || errorLabel(code);

const BULK_ASSIGN_CAP = 500;

const assignSchema = z.object({
  responsibleUserId: z.string().min(1, "Choose a responsible person"),
  notes: z.string().optional(),
  attachmentIds: z.array(z.string()).max(5, "Up to 5 files").optional(),
});
type AssignValues = z.infer<typeof assignSchema>;

/** Adapts a BulkAssignResponse to the shape BulkFailureReport expects. */
function toFailureShape(res: BulkAssignResponse): BulkActionResponse {
  const failed = res.results.filter((r) => !r.ok).length;
  return {
    total: res.total,
    succeeded: res.updated,
    failed,
    results: res.results,
  };
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  assetIds,
  users,
  resolveTag,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetIds: string[];
  users: User[];
  resolveTag: ResolveTag;
  onDone: () => void;
}) {
  const mutation = useBulkAssign();
  const [result, setResult] = React.useState<BulkAssignResponse | null>(null);
  // Server-message banner for global 400s (unknown/inactive user, empty, over-cap).
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [attachErrors, setAttachErrors] = React.useState<
    Record<string, AttachmentErrorCode>
  >({});
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { responsibleUserId: "", notes: "" },
  });

  useResetOnOpen(open, () => {
    reset({ responsibleUserId: "", notes: "", attachmentIds: [] });
    setResult(null);
    setGlobalError(null);
    setAttachErrors({});
  });

  async function onSubmit(values: AssignValues) {
    setAttachErrors({});
    setGlobalError(null);
    // Client-side guards — fail fast before the network call.
    if (assetIds.length === 0) {
      setError("responsibleUserId", { message: "No assets selected." });
      return;
    }
    if (assetIds.length > BULK_ASSIGN_CAP) {
      setGlobalError(
        `Too many assets — reassign at most ${BULK_ASSIGN_CAP} at a time.`,
      );
      return;
    }
    try {
      const res = await mutation.mutateAsync({
        assetIds,
        responsibleUserId: values.responsibleUserId,
        notes: values.notes || undefined,
        attachmentIds: values.attachmentIds?.length
          ? values.attachmentIds
          : undefined,
      });
      const hasFailure = res.results.some((r) => !r.ok);
      if (!hasFailure) {
        const parts = [
          `${res.updated} reassigned`,
          res.skippedNoOp > 0
            ? `${res.skippedNoOp} already assigned (skipped)`
            : null,
        ].filter(Boolean);
        toast.success(parts.join(", ") + ".", {
          description:
            "One digest email is on its way to the new custodian.",
        });
        onDone();
        onOpenChange(false);
      } else {
        setResult(res);
      }
    } catch (e) {
      const attErrs = attachmentErrors(e);
      if (Object.keys(attErrs).length) {
        setAttachErrors(attErrs);
        return;
      }
      const msg = errorMessage(e);
      setGlobalError(msg);
      toast.error(msg);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {result ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Reassignment results</DialogTitle>
            </DialogHeader>
            <BulkFailureReport
              result={toFailureShape(result)}
              resolveTag={resolveTag}
              errorLabelFor={assignErrorLabel}
            />
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
              <DialogTitle>
                Reassign custody — {assetIds.length} asset
                {assetIds.length === 1 ? "" : "s"}
              </DialogTitle>
              <DialogDescription>
                Change who is accountable for every selected asset. One digest
                email is sent to the new custodian summarizing everything they
                just picked up.
              </DialogDescription>
            </DialogHeader>
            {globalError ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-400/20 dark:bg-error-400/10 dark:text-error-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{globalError}</span>
              </div>
            ) : null}
            <FormRow
              label="Responsible person"
              htmlFor="bulk-responsible"
              required
              error={errors.responsibleUserId?.message}
            >
              <Select
                id="bulk-responsible"
                className="w-full"
                {...register("responsibleUserId")}
              >
                <option value="">Select a person…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.position}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow label="Notes" htmlFor="bulk-assign-notes">
              <Textarea
                id="bulk-assign-notes"
                placeholder="Optional"
                {...register("notes")}
              />
            </FormRow>
            <FormRow
              label="Attachments"
              helper="Applied to every selected asset · up to 5 files · 10 MB each"
              error={errors.attachmentIds?.message}
            >
              <AttachmentPicker
                onChange={(ids) =>
                  setValue("attachmentIds", ids, { shouldValidate: true })
                }
                serverErrors={attachErrors}
                disabled={mutation.isPending}
              />
            </FormRow>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Reassigning…" : "Reassign"}
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
  attachmentIds: z.array(z.string()).max(5, "Up to 5 files").optional(),
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
  const [attachErrors, setAttachErrors] = React.useState<
    Record<string, AttachmentErrorCode>
  >({});
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<StatusValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: "available", reason: "" },
  });

  useResetOnOpen(open, () => {
    reset({ status: "available", reason: "", attachmentIds: [] });
    setResult(null);
    setAttachErrors({});
  });

  async function onSubmit(values: StatusValues) {
    setAttachErrors({});
    try {
      const res = await mutation.mutateAsync({
        assetIds,
        status: values.status,
        reason: values.reason || undefined,
        attachmentIds: values.attachmentIds?.length
          ? values.attachmentIds
          : undefined,
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
      const attErrs = attachmentErrors(e);
      if (Object.keys(attErrs).length) {
        setAttachErrors(attErrs);
        return;
      }
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
            <FormRow
              label="Attachments"
              helper="Applied to every selected asset · up to 5 files · 10 MB each"
              error={errors.attachmentIds?.message}
            >
              <AttachmentPicker
                onChange={(ids) =>
                  setValue("attachmentIds", ids, { shouldValidate: true })
                }
                serverErrors={attachErrors}
                disabled={mutation.isPending}
              />
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

// ── Bulk update condition ─────────────────────────────────────────────────────

const CONDITIONS: {
  value: AssetCondition;
  selectedClass: string;
}[] = [
  {
    value: "new",
    selectedClass:
      "bg-info-50 text-info-700 border-info-200 dark:bg-info-400/15 dark:text-info-300 dark:border-info-400/40",
  },
  {
    value: "good",
    selectedClass:
      "bg-success-50 text-success-700 border-success-200 dark:bg-success-400/15 dark:text-success-300 dark:border-success-400/40",
  },
  {
    value: "fair",
    selectedClass:
      "bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-400/15 dark:text-warning-300 dark:border-warning-400/40",
  },
  {
    value: "poor",
    selectedClass:
      "bg-error-50 text-error-700 border-error-200 dark:bg-error-400/15 dark:text-error-300 dark:border-error-400/40",
  },
];

const SKIP_REASON: Record<string, string> = {
  unchanged: "Already this condition",
  forbidden: "Not permitted for your role/venues",
  not_found: "Asset not found",
};
const skipLabel = (code: string | undefined) =>
  (code && SKIP_REASON[code]) || code || "Unknown reason";

const conditionSchema = z.object({
  condition: z.enum(["new", "good", "fair", "poor"]),
  notes: z.string().optional(),
  attachmentIds: z.array(z.string()).max(5, "Up to 5 files").optional(),
});
type ConditionValues = z.infer<typeof conditionSchema>;

/** Result view for bulk condition — grouped list of skipped assets. */
function BulkConditionSummary({
  result,
  resolveTag,
}: {
  result: BulkConditionResult;
  resolveTag: ResolveTag;
}) {
  const groups = new Map<string, { id: string }[]>();
  for (const s of result.skipped) {
    const arr = groups.get(s.reason);
    if (arr) arr.push({ id: s.id });
    else groups.set(s.reason, [{ id: s.id }]);
  }
  const allSkipped = result.updated === 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {allSkipped
            ? "Nothing updated"
            : `${result.updated} updated · ${result.skipped.length} skipped`}
        </p>
        <Badge color={allSkipped ? "warning" : "gray"}>
          {result.skipped.length} skipped
        </Badge>
      </div>
      <p className="text-xs text-text-tertiary">
        {allSkipped
          ? "None of the selected assets needed a change, or you don’t have permission."
          : "Successfully-updated assets are already reflected in the list."}
      </p>
      <ul className="max-h-64 space-y-3 overflow-y-auto">
        {[...groups.entries()].map(([code, rows]) => (
          <li key={code} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {skipLabel(code)}
              </span>
              <Badge color="gray">{rows.length}</Badge>
            </div>
            <p className="mt-1.5 wrap-break-word text-xs text-text-secondary tabular-nums">
              {rows.map((r) => resolveTag(r.id)).join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BulkUpdateConditionDialog({
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
  const mutation = useBulkUpdateCondition();
  const [result, setResult] = React.useState<BulkConditionResult | null>(null);
  const [attachErrors, setAttachErrors] = React.useState<
    Record<string, AttachmentErrorCode>
  >({});
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConditionValues>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { condition: "good", notes: "" },
  });

  useResetOnOpen(open, () => {
    reset({ condition: "good", notes: "", attachmentIds: [] });
    setResult(null);
    setAttachErrors({});
  });

  const selected = watch("condition");

  async function onSubmit(values: ConditionValues) {
    setAttachErrors({});
    try {
      const res = await mutation.mutateAsync({
        assetIds,
        condition: values.condition,
        notes: values.notes || undefined,
        attachmentIds: values.attachmentIds?.length
          ? values.attachmentIds
          : undefined,
      });
      // Fully successful: quick confirmation, close, clear selection.
      if (res.skipped.length === 0) {
        toast.success(
          `${res.updated} asset${res.updated === 1 ? "" : "s"} updated to ${CONDITION_LABEL[values.condition]}.`,
        );
        onDone();
        onOpenChange(false);
        return;
      }
      // Partial or all-skipped: toast summary + inline breakdown so the user
      // can see which rows were skipped and why.
      if (res.updated === 0) {
        toast.warning(
          `No assets updated — all ${res.skipped.length} skipped.`,
          { description: describeSkipped(res.skipped) },
        );
      } else {
        toast.success(
          `${res.updated} updated · ${res.skipped.length} skipped.`,
          { description: describeSkipped(res.skipped) },
        );
      }
      setResult(res);
    } catch (e) {
      const attErrs = attachmentErrors(e);
      if (Object.keys(attErrs).length) {
        setAttachErrors(attErrs);
        return;
      }
      toast.error(errorMessage(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {result ? (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Condition update results</DialogTitle>
            </DialogHeader>
            <BulkConditionSummary result={result} resolveTag={resolveTag} />
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
              <DialogTitle>
                Update condition for {assetIds.length} asset
                {assetIds.length === 1 ? "" : "s"}
              </DialogTitle>
              <DialogDescription>
                Assets that are already at the selected condition are left
                alone. The change is logged per-asset.
              </DialogDescription>
            </DialogHeader>
            <FormRow
              label="Condition"
              required
              error={errors.condition?.message}
            >
              <div
                role="radiogroup"
                aria-label="Condition"
                className="inline-flex w-full items-stretch rounded-lg border border-input bg-card p-1"
              >
                {CONDITIONS.map((c) => {
                  const active = selected === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() =>
                        setValue("condition", c.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      className={cn(
                        "flex-1 rounded-md border border-transparent px-3 py-1.5 text-sm font-medium transition-colors outline-none",
                        "focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:border-brand-300",
                        "dark:focus-visible:ring-brand-400/30 dark:focus-visible:border-brand-400",
                        active
                          ? c.selectedClass
                          : "text-text-secondary hover:bg-gray-50 dark:hover:bg-white/6",
                      )}
                    >
                      {CONDITION_LABEL[c.value]}
                    </button>
                  );
                })}
              </div>
            </FormRow>
            <FormRow
              label="Notes"
              htmlFor="bulk-condition-notes"
              helper="Applied to every affected asset’s history entry (optional)."
            >
              <Textarea
                id="bulk-condition-notes"
                placeholder="e.g. quarterly inventory check"
                {...register("notes")}
              />
            </FormRow>
            <FormRow
              label="Attachments"
              helper="Applied to every affected asset · up to 5 files · 10 MB each"
              error={errors.attachmentIds?.message}
            >
              <AttachmentPicker
                onChange={(ids) =>
                  setValue("attachmentIds", ids, { shouldValidate: true })
                }
                serverErrors={attachErrors}
                disabled={mutation.isPending}
              />
            </FormRow>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Updating…"
                  : `Update ${assetIds.length}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Compact skip breakdown for the toast description. */
function describeSkipped(
  skipped: BulkConditionResult["skipped"],
): string {
  const counts = new Map<string, number>();
  for (const s of skipped) counts.set(s.reason, (counts.get(s.reason) ?? 0) + 1);
  return [...counts.entries()]
    .map(([code, n]) => `${n} ${skipLabel(code).toLowerCase()}`)
    .join(" · ");
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
