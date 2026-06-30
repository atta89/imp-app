"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useCreateVenue, useUpdateVenue } from "@/lib/api/hooks";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormRow } from "@/components/layout/form";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  type: z.string().min(1, "Type is required"),
  city: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean(),
});
type VenueValues = z.infer<typeof schema>;

export function VenueFormDialog({
  open,
  onOpenChange,
  venue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venue?: Venue;
}) {
  const isEdit = Boolean(venue);
  const createMut = useCreateVenue();
  const updateMut = useUpdateVenue(venue?.id ?? "");
  const pending = createMut.isPending || updateMut.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<VenueValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", type: "", city: "", address: "", isActive: true },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: venue?.name ?? "",
        code: venue?.code ?? "",
        type: venue?.type ?? "",
        city: venue?.city ?? "",
        address: venue?.address ?? "",
        isActive: venue?.isActive ?? true,
      });
    }
  }, [open, venue, reset]);

  async function onSubmit(values: VenueValues) {
    try {
      if (isEdit) await updateMut.mutateAsync(values);
      else await createMut.mutateAsync(values);
      toast.success(isEdit ? "Venue updated." : "Venue created.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, ["name", "code", "type", "city", "address"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit venue" : "New venue"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this venue's details."
                : "Add a venue that holds assets."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow label="Name" htmlFor="v-name" required error={errors.name?.message}>
              <Input id="v-name" {...register("name")} />
            </FormRow>
            <FormRow label="Code" htmlFor="v-code" required error={errors.code?.message}>
              <Input id="v-code" placeholder="e.g. HQ" {...register("code")} />
            </FormRow>
            <FormRow label="Type" htmlFor="v-type" required error={errors.type?.message}>
              <Input id="v-type" placeholder="e.g. office" {...register("type")} />
            </FormRow>
            <FormRow label="City" htmlFor="v-city">
              <Input id="v-city" {...register("city")} />
            </FormRow>
          </div>
          <FormRow label="Address" htmlFor="v-address">
            <Input id="v-address" {...register("address")} />
          </FormRow>

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex items-center gap-2.5">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                <Label className="cursor-pointer">Active</Label>
              </label>
            )}
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create venue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
