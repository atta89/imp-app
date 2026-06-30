"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useUpdateRepair } from "@/lib/api/hooks";
import { applyFormError } from "@/lib/forms";
import type { Repair, RepairStatus } from "@/lib/api/types";
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
import { REPAIR_STATUS } from "@/lib/status-meta";

const STATUSES: RepairStatus[] = ["open", "in_progress", "completed", "unrepairable"];

const schema = z.object({
  status: z.enum(["open", "in_progress", "completed", "unrepairable"]),
  vendor: z.string().optional(),
  resolution: z.string().optional(),
  notes: z.string().optional(),
});
type RepairValues = z.infer<typeof schema>;

export function RepairStatusDialog({
  repair,
  open,
  onOpenChange,
}: {
  repair: Repair;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useUpdateRepair(repair.id);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<RepairValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: repair.status, vendor: "", resolution: "", notes: "" },
  });

  React.useEffect(() => {
    if (open)
      reset({
        status: repair.status,
        vendor: repair.vendor ?? "",
        resolution: repair.resolution ?? "",
        notes: repair.notes ?? "",
      });
  }, [open, repair, reset]);

  async function onSubmit(values: RepairValues) {
    try {
      await mutation.mutateAsync({
        status: values.status,
        vendor: values.vendor || undefined,
        resolution: values.resolution || undefined,
        notes: values.notes || undefined,
      });
      toast.success("Repair updated.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, ["status", "vendor", "resolution", "notes"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Update repair</DialogTitle>
            <DialogDescription>
              Completing or marking unrepairable updates the asset&apos;s status too.
            </DialogDescription>
          </DialogHeader>
          <FormRow label="Status" htmlFor="r-status" required error={errors.status?.message}>
            <Select id="r-status" className="w-full" {...register("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {REPAIR_STATUS[s].label}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="Vendor" htmlFor="r-vendor">
            <Input id="r-vendor" placeholder="Repair shop" {...register("vendor")} />
          </FormRow>
          <FormRow label="Resolution" htmlFor="r-res">
            <Textarea
              id="r-res"
              placeholder="What was done?"
              {...register("resolution")}
            />
          </FormRow>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
