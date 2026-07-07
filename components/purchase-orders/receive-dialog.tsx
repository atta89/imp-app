"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  useAssetDepartments,
  useReceivePurchaseOrder,
} from "@/lib/api/hooks";
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

const schema = z.object({
  venueId: z.string().min(1, "Choose a home venue"),
  departmentId: z.string().optional(),
});
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReceiveValues>({
    resolver: zodResolver(schema),
    defaultValues: { venueId: "", departmentId: "" },
  });

  React.useEffect(() => {
    if (open) reset({ venueId: "", departmentId: "" });
  }, [open, reset]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedVenue = watch("venueId");
  const departmentsQuery = useAssetDepartments(selectedVenue);
  const departments = departmentsQuery.data ?? [];

  // Clear the department when the venue changes — its old value no longer
  // references a department under the new venue.
  const prevVenueRef = React.useRef("");
  React.useEffect(() => {
    if (selectedVenue !== prevVenueRef.current) {
      prevVenueRef.current = selectedVenue;
      setValue("departmentId", "");
    }
  }, [selectedVenue, setValue]);

  const noDepts = !departmentsQuery.isLoading && departments.length === 0;

  async function onSubmit(values: ReceiveValues) {
    try {
      const result = await mutation.mutateAsync({
        venueId: values.venueId,
        departmentId: values.departmentId || undefined,
      });
      const n = result?.generatedAssetIds?.length ?? 0;
      toast.success(`Received — ${n} asset${n === 1 ? "" : "s"} generated.`);
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, ["venueId", "departmentId"]);
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
          <FormRow
            label="Home department"
            htmlFor="rcv-department"
            error={errors.departmentId?.message}
            helper={
              !selectedVenue
                ? "Pick a venue first."
                : noDepts
                  ? "No departments for this venue yet."
                  : "Optional — every generated asset will home under this department."
            }
          >
            <Select
              id="rcv-department"
              className="w-full ml-1"
              disabled={!selectedVenue || noDepts}
              {...register("departmentId")}
            >
              <option value="">— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
