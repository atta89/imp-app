"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { ApiError, attachmentErrors } from "@/lib/api/errors";
import type { AttachmentErrorCode } from "@/lib/api/errors";
import {
  useAssignCustody,
  useChangeAssetStatus,
  useCreateRepair,
  useTransferAsset,
  useUpdateAssetCondition,
} from "@/lib/api/hooks";
import type {
  AssetCondition,
  AssetStatus,
  User,
  Venue,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";
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
import { FormRow } from "@/components/layout/form";
import { AttachmentPicker } from "@/components/attachments/attachment-picker";

/** Map an ApiError's field errors onto the form; toast anything else. Returns handled. */
function applyError(
  error: unknown,
  setError: (name: string, e: { message: string }) => void,
  fields: string[],
): void {
  const apiFields = error instanceof ApiError ? error.fields : undefined;
  let handled = false;
  if (apiFields) {
    for (const f of fields) {
      if (apiFields[f]) {
        setError(f, { message: apiFields[f] });
        handled = true;
      }
    }
  }
  if (!handled) {
    toast.error(error instanceof Error ? error.message : "Something went wrong.");
  }
}

function useResetOnOpen(open: boolean, reset: () => void) {
  // Fire only when `open` toggles. Callers pass an inline arrow (new identity
  // each render); depending on it would re-run every render and, since the
  // callback calls form.reset(), loop infinitely. Mirrors the bulk dialogs' helper.
  React.useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

// ── Change status ─────────────────────────────────────────────────────────────

const statusSchema = z.object({ reason: z.string().optional() });

export function ChangeStatusDialog({
  assetId,
  open,
  onOpenChange,
  targetStatus,
  title,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStatus: AssetStatus;
  title: string;
}) {
  const mutation = useChangeAssetStatus(assetId);
  const { register, handleSubmit, reset, setError } = useForm<{ reason?: string }>(
    { resolver: zodResolver(statusSchema), defaultValues: { reason: "" } },
  );
  useResetOnOpen(open, reset);

  async function onSubmit(values: { reason?: string }) {
    try {
      await mutation.mutateAsync({ status: targetStatus, reason: values.reason });
      toast.success(`${title} — done.`);
      onOpenChange(false);
    } catch (e) {
      applyError(e, setError as never, ["reason", "status"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Record a reason for this change (optional). Every change is logged.
            </DialogDescription>
          </DialogHeader>
          <FormRow label="Reason" htmlFor="reason">
            <Textarea
              id="reason"
              placeholder="e.g. deployed for the Q3 event"
              {...register("reason")}
            />
          </FormRow>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Transfer ──────────────────────────────────────────────────────────────────

const transferSchema = z.object({
  toVenueId: z.string().min(1, "Choose a destination venue"),
  expectedReturnDate: z.string().optional(),
  notes: z.string().optional(),
  attachmentIds: z.array(z.string()).max(5, "Up to 5 files").optional(),
});
type TransferValues = z.infer<typeof transferSchema>;

export function TransferDialog({
  assetId,
  open,
  onOpenChange,
  venues,
  currentVenueId,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues: Venue[];
  currentVenueId: string;
}) {
  const mutation = useTransferAsset(assetId);
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
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toVenueId: "",
      expectedReturnDate: "",
      notes: "",
      attachmentIds: [],
    },
  });
  useResetOnOpen(open, () => {
    reset();
    setAttachErrors({});
  });

  async function onSubmit(values: TransferValues) {
    setAttachErrors({});
    try {
      await mutation.mutateAsync({
        toVenueId: values.toVenueId,
        expectedReturnDate: values.expectedReturnDate
          ? new Date(values.expectedReturnDate).toISOString()
          : undefined,
        notes: values.notes || undefined,
        attachmentIds: values.attachmentIds?.length
          ? values.attachmentIds
          : undefined,
      });
      toast.success("Asset transferred.");
      onOpenChange(false);
    } catch (e) {
      const attErrs = attachmentErrors(e);
      if (Object.keys(attErrs).length) {
        setAttachErrors(attErrs);
        return;
      }
      applyError(e, setError as never, [
        "toVenueId",
        "expectedReturnDate",
        "notes",
      ]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Transfer asset</DialogTitle>
            <DialogDescription>
              Move this asset to another venue. Set an expected return date for a
              temporary loan.
            </DialogDescription>
          </DialogHeader>
          <FormRow
            label="Destination venue"
            htmlFor="toVenueId"
            required
            error={errors.toVenueId?.message}
          >
            <Select id="toVenueId" className="w-full" {...register("toVenueId")}>
              <option value="">Select a venue…</option>
              {venues
                .filter((v) => v.id !== currentVenueId)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </Select>
          </FormRow>
          <FormRow
            label="Expected return date"
            htmlFor="expectedReturnDate"
            helper="Leave blank for a permanent move."
          >
            <Input
              id="expectedReturnDate"
              type="date"
              {...register("expectedReturnDate")}
            />
          </FormRow>
          <FormRow label="Notes" htmlFor="notes">
            <Textarea id="notes" placeholder="Optional" {...register("notes")} />
          </FormRow>
          <FormRow
            label="Attachments"
            helper="Up to 5 files · JPEG, PNG, WebP or PDF · 10 MB each"
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
      </DialogContent>
    </Dialog>
  );
}

// ── Assign custody ──────────────────────────────────────────────────────────────

const assignSchema = z.object({
  responsibleUserId: z.string().min(1, "Choose a responsible person"),
  notes: z.string().optional(),
});
type AssignValues = z.infer<typeof assignSchema>;

export function AssignDialog({
  assetId,
  open,
  onOpenChange,
  users,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
}) {
  const mutation = useAssignCustody(assetId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AssignValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: { responsibleUserId: "", notes: "" },
  });
  useResetOnOpen(open, reset);

  async function onSubmit(values: AssignValues) {
    try {
      await mutation.mutateAsync({
        responsibleUserId: values.responsibleUserId,
        notes: values.notes || undefined,
      });
      toast.success("Custody reassigned.");
      onOpenChange(false);
    } catch (e) {
      applyError(e, setError as never, ["responsibleUserId", "notes"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Assign custody</DialogTitle>
            <DialogDescription>
              Change who is accountable for this asset. They&apos;ll be notified.
            </DialogDescription>
          </DialogHeader>
          <FormRow
            label="Responsible person"
            htmlFor="responsibleUserId"
            required
            error={errors.responsibleUserId?.message}
          >
            <Select
              id="responsibleUserId"
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
          <FormRow label="Notes" htmlFor="assign-notes">
            <Textarea
              id="assign-notes"
              placeholder="Optional"
              {...register("notes")}
            />
          </FormRow>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Assigning…" : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Update condition ────────────────────────────────────────────────────────

const CONDITIONS: {
  value: AssetCondition;
  label: string;
  /** Segment color when selected. */
  selectedClass: string;
}[] = [
  {
    value: "new",
    label: "New",
    selectedClass:
      "bg-info-50 text-info-700 border-info-200 dark:bg-info-400/15 dark:text-info-300 dark:border-info-400/40",
  },
  {
    value: "good",
    label: "Good",
    selectedClass:
      "bg-success-50 text-success-700 border-success-200 dark:bg-success-400/15 dark:text-success-300 dark:border-success-400/40",
  },
  {
    value: "fair",
    label: "Fair",
    selectedClass:
      "bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-400/15 dark:text-warning-300 dark:border-warning-400/40",
  },
  {
    value: "poor",
    label: "Poor",
    selectedClass:
      "bg-error-50 text-error-700 border-error-200 dark:bg-error-400/15 dark:text-error-300 dark:border-error-400/40",
  },
];

const conditionSchema = z.object({
  condition: z.enum(["new", "good", "fair", "poor"]),
  notes: z.string().optional(),
});
type ConditionValues = z.infer<typeof conditionSchema>;

export function UpdateConditionDialog({
  assetId,
  open,
  onOpenChange,
  currentCondition,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCondition: AssetCondition;
}) {
  const mutation = useUpdateAssetCondition(assetId);
  const {
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConditionValues>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { condition: currentCondition, notes: "" },
  });
  // Reset with the latest current condition each time the dialog opens.
  React.useEffect(() => {
    if (open) reset({ condition: currentCondition, notes: "" });
  }, [open, currentCondition, reset]);

  const selected = watch("condition");
  const unchanged = selected === currentCondition;

  async function onSubmit(values: ConditionValues) {
    try {
      await mutation.mutateAsync({
        condition: values.condition,
        notes: values.notes || undefined,
      });
      toast.success("Condition updated.");
      onOpenChange(false);
    } catch (e) {
      applyError(e, setError as never, ["condition", "notes"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Update condition</DialogTitle>
            <DialogDescription>
              Record the asset’s current physical condition. The change is
              logged in history.
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
                    {c.label}
                  </button>
                );
              })}
            </div>
          </FormRow>
          <FormRow
            label="Notes"
            htmlFor="condition-notes"
            helper={
              unchanged
                ? "Same as current — pick a different condition to save."
                : "What did you observe? (optional)"
            }
          >
            <Textarea
              id="condition-notes"
              placeholder="e.g. scratched casing after last event"
              {...register("notes")}
            />
          </FormRow>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={mutation.isPending || unchanged}
            >
              {mutation.isPending ? "Saving…" : "Save condition"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Send to repair ──────────────────────────────────────────────────────────────

const repairSchema = z.object({
  issue: z.string().min(1, "Describe the issue"),
  vendor: z.string().optional(),
});
type RepairValues = z.infer<typeof repairSchema>;

export function SendToRepairDialog({
  assetId,
  open,
  onOpenChange,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateRepair(assetId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RepairValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: { issue: "", vendor: "" },
  });
  useResetOnOpen(open, reset);

  async function onSubmit(values: RepairValues) {
    try {
      await mutation.mutateAsync({
        issue: values.issue,
        vendor: values.vendor || undefined,
      });
      toast.success("Sent to repair.");
      onOpenChange(false);
    } catch (e) {
      applyError(e, setError as never, ["issue", "vendor"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Send to repair</DialogTitle>
            <DialogDescription>
              Open a repair ticket. The asset moves to “In repair”.
            </DialogDescription>
          </DialogHeader>
          <FormRow
            label="Issue"
            htmlFor="issue"
            required
            error={errors.issue?.message}
          >
            <Textarea
              id="issue"
              placeholder="What's wrong with it?"
              {...register("issue")}
            />
          </FormRow>
          <FormRow label="Vendor" htmlFor="vendor" helper="Repair shop, if known.">
            <Input id="vendor" placeholder="Optional" {...register("vendor")} />
          </FormRow>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Sending…" : "Send to repair"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
