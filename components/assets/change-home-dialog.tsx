"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useAssetDepartments, useUpdateAsset } from "@/lib/api/hooks";
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
  homeVenueId: z.string().min(1, "Choose a home venue"),
  departmentId: z.string().optional(),
});
type HomeValues = z.infer<typeof schema>;

export function ChangeHomeDialog({
  assetId,
  open,
  onOpenChange,
  venues,
  currentHomeVenueId,
  currentDepartmentId,
}: {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venues: Venue[];
  currentHomeVenueId: string;
  currentDepartmentId?: string;
}) {
  const mutation = useUpdateAsset(assetId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HomeValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      homeVenueId: currentHomeVenueId,
      departmentId: currentDepartmentId ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        homeVenueId: currentHomeVenueId,
        departmentId: currentDepartmentId ?? "",
      });
    }
  }, [open, currentHomeVenueId, currentDepartmentId, reset]);

  const selectedVenue = watch("homeVenueId");
  const departmentsQuery = useAssetDepartments(selectedVenue);
  const departments = departmentsQuery.data ?? [];

  // Reset the department whenever the venue selection changes to a different
  // one than the asset's current home — the current department can no longer
  // reference the new venue.
  const prevVenueRef = React.useRef(currentHomeVenueId);
  React.useEffect(() => {
    if (selectedVenue !== prevVenueRef.current) {
      prevVenueRef.current = selectedVenue;
      setValue("departmentId", "");
    }
  }, [selectedVenue, setValue]);

  const selectedDept = watch("departmentId");
  const noDepts = !departmentsQuery.isLoading && departments.length === 0;
  const unchanged =
    selectedVenue === currentHomeVenueId &&
    (selectedDept || undefined) === (currentDepartmentId || undefined);

  async function onSubmit(values: HomeValues) {
    try {
      await mutation.mutateAsync({
        homeVenueId: values.homeVenueId,
        departmentId: values.departmentId || undefined,
      });
      toast.success("Home venue updated.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, ["homeVenueId", "departmentId"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>Change home</DialogTitle>
            <DialogDescription>
              Move this asset&apos;s home venue and (optionally) home department.
              This doesn&apos;t transfer the physical location.
            </DialogDescription>
          </DialogHeader>

          <FormRow
            label="Home venue"
            htmlFor="home-venue"
            required
            error={errors.homeVenueId?.message}
          >
            <Select
              id="home-venue"
              className="w-full"
              {...register("homeVenueId")}
            >
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
            htmlFor="home-department"
            error={errors.departmentId?.message}
            helper={
              !selectedVenue
                ? "Pick a home venue first."
                : noDepts
                  ? "No departments for this venue yet."
                  : undefined
            }
          >
            <Select
              id="home-department"
              className="w-full"
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
            <Button
              type="submit"
              disabled={mutation.isPending || unchanged}
            >
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
