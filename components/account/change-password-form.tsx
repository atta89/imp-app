"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleCheck } from "lucide-react";

import { useChangePassword } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { FormRow } from "@/components/layout/form";

const schema = z
  .object({
    current: z.string().min(1, "Current password is required"),
    next: z
      .string()
      .min(8, "Must be 8–72 characters")
      .max(72, "Must be 8–72 characters"),
    confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.next !== d.current, {
    path: ["next"],
    message: "New password must differ from current",
  })
  .refine((d) => d.confirm === d.next, {
    path: ["confirm"],
    message: "Passwords don’t match",
  });

type PasswordValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const [done, setDone] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<PasswordValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { current: "", next: "", confirm: "" },
  });

  async function onSubmit(values: PasswordValues) {
    setDone(false);
    try {
      await changePassword.mutateAsync({
        current: values.current,
        next: values.next,
      });
      reset();
      setDone(true);
      toast.success("Password updated");
    } catch (e) {
      if (e instanceof ApiError) {
        // 401 = wrong current password (a field error, NOT a session problem).
        if (e.status === 401) {
          setError("current", {
            message: e.message || "Current password is incorrect",
          });
          return;
        }
        // Field map → render under each input.
        if (e.fields && Object.keys(e.fields).length > 0) {
          if (e.fields.current) setError("current", { message: e.fields.current });
          if (e.fields.next) setError("next", { message: e.fields.next });
          return;
        }
        // Other 400s (length / differ / parse) → top-level message under new password.
        if (e.status === 400) {
          setError("next", { message: e.message });
          return;
        }
      }
      toast.error("Something went wrong, please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      onChange={() => done && setDone(false)}
      noValidate
    >
      <FormRow
        label="Current password"
        htmlFor="current-password"
        required
        error={errors.current?.message}
      >
        <PasswordInput
          autoComplete="current-password"
          {...register("current")}
        />
      </FormRow>

      <FormRow
        label="New password"
        htmlFor="new-password"
        required
        helper="8–72 characters."
        error={errors.next?.message}
      >
        <PasswordInput autoComplete="new-password" {...register("next")} />
      </FormRow>

      <FormRow
        label="Confirm new password"
        htmlFor="confirm-password"
        required
        error={errors.confirm?.message}
      >
        <PasswordInput autoComplete="new-password" {...register("confirm")} />
      </FormRow>

      <div className="flex items-center justify-between gap-3 pt-1">
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400">
            <CircleCheck className="size-4" />
            Password updated
          </span>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={!isValid || changePassword.isPending}>
          {changePassword.isPending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
