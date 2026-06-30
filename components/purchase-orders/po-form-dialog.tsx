"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { useCreatePurchaseOrder } from "@/lib/api/hooks";
import { applyFormError } from "@/lib/forms";
import type { Category, User } from "@/lib/api/types";
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
import { Label } from "@/components/ui/label";
import { FormRow } from "@/components/layout/form";

const lineItemSchema = z.object({
  categoryId: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  quantity: z.coerce.number().int().min(1, "≥1"),
});
const schema = z.object({
  poNumber: z.string().min(1, "PO number is required"),
  supplierName: z.string().min(1, "Supplier is required"),
  supplierContact: z.string().optional(),
  responsibleUserId: z.string().min(1, "Choose a responsible person"),
  orderDate: z.string().min(1, "Order date is required"),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
});
type PoValues = z.input<typeof schema>;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PoFormDialog({
  open,
  onOpenChange,
  categories,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  users: User[];
}) {
  const createMut = useCreatePurchaseOrder();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<PoValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      poNumber: "",
      supplierName: "",
      supplierContact: "",
      responsibleUserId: "",
      orderDate: today(),
      notes: "",
      lineItems: [{ categoryId: "", name: "", quantity: 1 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  React.useEffect(() => {
    if (open)
      reset({
        poNumber: "",
        supplierName: "",
        supplierContact: "",
        responsibleUserId: "",
        orderDate: today(),
        notes: "",
        lineItems: [{ categoryId: "", name: "", quantity: 1 }],
      });
  }, [open, reset]);

  async function onSubmit(values: PoValues) {
    try {
      await createMut.mutateAsync({
        poNumber: values.poNumber,
        supplier: {
          name: values.supplierName,
          contact: values.supplierContact || undefined,
        },
        responsibleUserId: values.responsibleUserId,
        orderDate: new Date(values.orderDate).toISOString(),
        notes: values.notes || undefined,
        lineItems: values.lineItems.map((li) => ({
          categoryId: li.categoryId,
          name: li.name,
          quantity: Number(li.quantity),
        })),
      });
      toast.success("Purchase order created.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, [
        "poNumber",
        "supplierName",
        "responsibleUserId",
        "orderDate",
      ]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
            <DialogDescription>
              Receiving this PO later generates one asset per unit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow label="PO number" htmlFor="po-num" required error={errors.poNumber?.message}>
              <Input id="po-num" placeholder="PO-1001" {...register("poNumber")} />
            </FormRow>
            <FormRow label="Order date" htmlFor="po-date" required error={errors.orderDate?.message}>
              <Input id="po-date" type="date" {...register("orderDate")} />
            </FormRow>
            <FormRow label="Supplier" htmlFor="po-sup" required error={errors.supplierName?.message}>
              <Input id="po-sup" {...register("supplierName")} />
            </FormRow>
            <FormRow label="Supplier contact" htmlFor="po-supc">
              <Input id="po-supc" placeholder="Optional" {...register("supplierContact")} />
            </FormRow>
          </div>

          <FormRow
            label="Responsible person"
            htmlFor="po-resp"
            required
            error={errors.responsibleUserId?.message}
          >
            <Select id="po-resp" className="w-full" {...register("responsibleUserId")}>
              <option value="">Select a person…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.position}
                </option>
              ))}
            </Select>
          </FormRow>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ categoryId: "", name: "", quantity: 1 })}
              >
                <Plus className="size-4" />
                Add item
              </Button>
            </div>
            {typeof errors.lineItems?.message === "string" && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {errors.lineItems.message}
              </p>
            )}
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 sm:flex-nowrap"
                >
                  <Select
                    className="w-32 shrink-0"
                    aria-label="Category"
                    {...register(`lineItems.${i}.categoryId`)}
                  >
                    <option value="">Category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    className="min-w-0 flex-1"
                    placeholder="Item name"
                    aria-label="Item name"
                    {...register(`lineItems.${i}.name`)}
                  />
                  <Input
                    className="w-20 shrink-0"
                    type="number"
                    min={1}
                    aria-label="Quantity"
                    {...register(`lineItems.${i}.quantity`)}
                  />
                  <Button
                    type="button"
                    variant="tertiary"
                    size="icon-sm"
                    aria-label="Remove item"
                    onClick={() => remove(i)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? "Creating…" : "Create PO"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
