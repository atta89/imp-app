"use client";

import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { useCreateCategory, useUpdateCategory } from "@/lib/api/hooks";
import { applyFormError } from "@/lib/forms";
import type { Category } from "@/lib/api/types";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FormRow } from "@/components/layout/form";

const fieldSchema = z.object({
  key: z.string().min(1, "Required"),
  label: z.string().min(1, "Required"),
  type: z.enum(["string", "number", "boolean", "date"]),
  required: z.boolean(),
});
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  isActive: z.boolean(),
  customFields: z.array(fieldSchema),
});
type CategoryValues = z.infer<typeof schema>;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
}) {
  const isEdit = Boolean(category);
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory(category?.id ?? "");
  const pending = createMut.isPending || updateMut.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<CategoryValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", description: "", isActive: true, customFields: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "customFields" });

  React.useEffect(() => {
    if (open) {
      reset({
        name: category?.name ?? "",
        slug: category?.slug ?? "",
        description: category?.description ?? "",
        isActive: category?.isActive ?? true,
        customFields:
          category?.customFields?.map((f) => ({
            key: f.key,
            label: f.label,
            type: f.type,
            required: f.required,
          })) ?? [],
      });
    }
  }, [open, category, reset]);

  async function onSubmit(values: CategoryValues) {
    try {
      if (isEdit) await updateMut.mutateAsync(values);
      else await createMut.mutateAsync(values);
      toast.success(isEdit ? "Category updated." : "Category created.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, ["name", "slug", "description"]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>
              Categories group assets and define their custom fields.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow label="Name" htmlFor="c-name" required error={errors.name?.message}>
              <Input
                id="c-name"
                {...register("name", {
                  onChange: (e) => {
                    if (!isEdit && !getValues("slug"))
                      setValue("slug", slugify(e.target.value));
                  },
                })}
              />
            </FormRow>
            <FormRow label="Slug" htmlFor="c-slug" required error={errors.slug?.message}>
              <Input id="c-slug" {...register("slug")} />
            </FormRow>
          </div>
          <FormRow label="Description" htmlFor="c-desc">
            <Input id="c-desc" {...register("description")} />
          </FormRow>

          {/* Custom fields editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Custom fields</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  append({ key: "", label: "", type: "string", required: false })
                }
              >
                <Plus className="size-4" />
                Add field
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-text-tertiary">
                No custom fields. Assets in this category won’t have extra specs.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div
                    key={field.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 sm:flex-nowrap"
                  >
                    <Input
                      className="min-w-0 flex-1"
                      placeholder="key"
                      aria-label="Field key"
                      {...register(`customFields.${i}.key`)}
                    />
                    <Input
                      className="min-w-0 flex-1"
                      placeholder="Label"
                      aria-label="Field label"
                      {...register(`customFields.${i}.label`)}
                    />
                    <Select
                      className="w-28"
                      aria-label="Field type"
                      {...register(`customFields.${i}.type`)}
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Yes/No</option>
                      <option value="date">Date</option>
                    </Select>
                    <Controller
                      control={control}
                      name={`customFields.${i}.required`}
                      render={({ field: f }) => (
                        <label className="flex items-center gap-1.5 px-1 text-xs text-text-secondary">
                          <Checkbox
                            checked={f.value}
                            onCheckedChange={f.onChange}
                          />
                          Req
                        </label>
                      )}
                    />
                    <Button
                      type="button"
                      variant="tertiary"
                      size="icon-sm"
                      aria-label="Remove field"
                      onClick={() => remove(i)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
