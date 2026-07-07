"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  useCreateDepartment,
  useUpdateDepartment,
} from "@/lib/api/hooks";
import { applyFormError } from "@/lib/forms";
import type { Department } from "@/lib/api/types";
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
  description: z.string().optional(),
  isActive: z.boolean(),
});
type DepartmentValues = z.infer<typeof schema>;

export function DepartmentFormDialog({
  open,
  onOpenChange,
  venueId,
  department,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  department?: Department;
}) {
  const isEdit = Boolean(department);
  const createMut = useCreateDepartment(venueId);
  const updateMut = useUpdateDepartment(venueId, department?.id ?? "");
  const pending = createMut.isPending || updateMut.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<DepartmentValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: department?.name ?? "",
        code: department?.code ?? "",
        description: department?.description ?? "",
        isActive: department?.isActive ?? true,
      });
    }
  }, [open, department, reset]);

  async function onSubmit(values: DepartmentValues) {
    try {
      const payload = {
        name: values.name,
        code: values.code,
        description: values.description || undefined,
        isActive: values.isActive,
      };
      if (isEdit) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      toast.success(isEdit ? "Department updated." : "Department created.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, [
        "name",
        "code",
        "description",
      ]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit department" : "New department"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this department's details."
                : "Add a department that assets can be homed under."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow
              label="Name"
              htmlFor="d-name"
              required
              error={errors.name?.message}
            >
              <Input id="d-name" {...register("name")} />
            </FormRow>
            <FormRow
              label="Code"
              htmlFor="d-code"
              required
              error={errors.code?.message}
            >
              <Input id="d-code" placeholder="e.g. ENG" {...register("code")} />
            </FormRow>
          </div>
          <FormRow
            label="Description"
            htmlFor="d-description"
            error={errors.description?.message}
          >
            <Input id="d-description" {...register("description")} />
          </FormRow>

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex items-center gap-2.5">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
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
              {pending
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Create department"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
