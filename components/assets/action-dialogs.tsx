"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/errors";
import {
  useAssignCustody,
  useChangeAssetStatus,
  useCreateRepair,
  useTransferAsset,
} from "@/lib/api/hooks";
import type { AssetStatus, User, Venue } from "@/lib/api/types";
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
  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);
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
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { toVenueId: "", expectedReturnDate: "", notes: "" },
  });
  useResetOnOpen(open, reset);

  async function onSubmit(values: TransferValues) {
    try {
      await mutation.mutateAsync({
        toVenueId: values.toVenueId,
        expectedReturnDate: values.expectedReturnDate
          ? new Date(values.expectedReturnDate).toISOString()
          : undefined,
        notes: values.notes || undefined,
      });
      toast.success("Asset transferred.");
      onOpenChange(false);
    } catch (e) {
      applyError(e, setError as never, ["toVenueId", "expectedReturnDate", "notes"]);
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
