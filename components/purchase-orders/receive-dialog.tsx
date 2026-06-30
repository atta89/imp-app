"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useReceivePurchaseOrder } from "@/lib/api/hooks";
import { applyFormError } from "@/lib/forms";
import type { Venue } from "@/lib/api/types";
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
import { Select } from "@/components/ui/select";
import { FormRow } from "@/components/layout/form";

const schema = z.object({ venueId: z.string().min(1, "Choose a home venue") });
type ReceiveValues = z.infer<typeof schema>;

export function ReceiveDialog({
  poId,
  open,
  onOpenChange,
  venues,
  unitCount,
}: {
  poId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues: Venue[];
  unitCount: number;
}) {
  const mutation = useReceivePurchaseOrder(poId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ReceiveValues>({
    resolver: zodResolver(schema),
    defaultValues: { venueId: "" },
  });

  React.useEffect(() => {
    if (open) reset({ venueId: "" });
  }, [open, reset]);

  async function onSubmit(values: ReceiveValues) {
    try {
      const result = await mutation.mutateAsync({ venueId: values.venueId });
      const n = result?.generatedAssetIds?.length ?? 0;
      toast.success(`Received — ${n} asset${n === 1 ? "" : "s"} generated.`);
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, ["venueId"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Receive purchase order</DialogTitle>
            <DialogDescription>
              This generates {unitCount} asset{unitCount === 1 ? "" : "s"} (one per
              unit), each homed at the chosen venue and assigned to the PO&apos;s
              responsible person.
            </DialogDescription>
          </DialogHeader>
          <FormRow
            label="Home venue for generated assets"
            htmlFor="rcv-venue"
            required
            error={errors.venueId?.message}
          >
            <Select id="rcv-venue" className="w-full" {...register("venueId")}>
              <option value="">Select a venue…</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </FormRow>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Receiving…" : "Receive & generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
