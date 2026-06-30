"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useCreateUser, useUpdateUser } from "@/lib/api/hooks";
import { applyFormError } from "@/lib/forms";
import type { Role, User, Venue } from "@/lib/api/types";
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

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "venue_manager", label: "Venue Manager" },
  { value: "staff", label: "Staff" },
];

function makeSchema(isEdit: boolean) {
  return z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    password: isEdit
      ? z.string().optional().refine((v) => !v || v.length >= 8, "Min 8 characters")
      : z.string().min(8, "Min 8 characters"),
    role: z.enum(["admin", "venue_manager", "staff"]),
    position: z.string().min(1, "Position is required"),
    phone: z.string().optional(),
    venueIds: z.array(z.string()),
    notifyByEmail: z.boolean(),
  });
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  venues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
  venues: Venue[];
}) {
  const isEdit = Boolean(user);
  const createMut = useCreateUser();
  const updateMut = useUpdateUser(user?.id ?? "");
  const pending = createMut.isPending || updateMut.isPending;

  type UserValues = z.infer<ReturnType<typeof makeSchema>>;
  const resolver = React.useMemo(() => zodResolver(makeSchema(isEdit)), [isEdit]);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors },
  } = useForm<UserValues>({
    resolver,
    defaultValues: {
      name: "", email: "", password: "", role: "staff",
      position: "", phone: "", venueIds: [], notifyByEmail: true,
    },
  });

  React.useEffect(() => {
    if (open)
      reset({
        name: user?.name ?? "",
        email: user?.email ?? "",
        password: "",
        role: user?.role ?? "staff",
        position: user?.position ?? "",
        phone: user?.phone ?? "",
        venueIds: user?.venueIds ?? [],
        notifyByEmail: user?.notifyByEmail ?? true,
      });
  }, [open, user, reset]);

  async function onSubmit(values: UserValues) {
    try {
      if (isEdit) {
        await updateMut.mutateAsync({
          name: values.name,
          email: values.email,
          ...(values.password ? { password: values.password } : {}),
          role: values.role,
          position: values.position,
          phone: values.phone || undefined,
          venueIds: values.venueIds,
          notifyByEmail: values.notifyByEmail,
        });
      } else {
        await createMut.mutateAsync({
          name: values.name,
          email: values.email,
          password: values.password!,
          role: values.role,
          position: values.position,
          phone: values.phone || undefined,
          venueIds: values.venueIds,
          notifyByEmail: values.notifyByEmail,
        });
      }
      toast.success(isEdit ? "User updated." : "User created.");
      onOpenChange(false);
    } catch (e) {
      applyFormError(e, setError as never, [
        "name", "email", "password", "role", "position", "phone",
      ]);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit user" : "New user"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update this user's role, scope and details."
                : "Invite a teammate and set their role and venue scope."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormRow label="Name" htmlFor="u-name" required error={errors.name?.message}>
              <Input id="u-name" {...register("name")} />
            </FormRow>
            <FormRow label="Email" htmlFor="u-email" required error={errors.email?.message}>
              <Input id="u-email" type="email" {...register("email")} />
            </FormRow>
            <FormRow label="Role" htmlFor="u-role" required error={errors.role?.message}>
              <Select id="u-role" className="w-full" {...register("role")}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </FormRow>
            <FormRow label="Position" htmlFor="u-pos" required error={errors.position?.message}>
              <Input id="u-pos" placeholder="e.g. IT Staff" {...register("position")} />
            </FormRow>
            <FormRow
              label={isEdit ? "New password" : "Password"}
              htmlFor="u-pw"
              required={!isEdit}
              error={errors.password?.message}
              helper={isEdit ? "Leave blank to keep current." : undefined}
            >
              <Input id="u-pw" type="password" {...register("password")} />
            </FormRow>
            <FormRow label="Phone" htmlFor="u-phone">
              <Input id="u-phone" placeholder="Optional" {...register("phone")} />
            </FormRow>
          </div>

          {venues.length > 0 && (
            <div className="space-y-2">
              <Label>Venue scope</Label>
              <Controller
                control={control}
                name="venueIds"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {venues.map((v) => {
                      const checked = field.value.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) =>
                              field.onChange(
                                c
                                  ? [...field.value, v.id]
                                  : field.value.filter((x: string) => x !== v.id),
                              )
                            }
                          />
                          {v.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          )}

          <Controller
            control={control}
            name="notifyByEmail"
            render={({ field }) => (
              <label className="flex items-center gap-2.5">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                <Label className="cursor-pointer">Email notifications</Label>
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
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
