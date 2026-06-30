"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormRow } from "@/components/layout/form";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    try {
      await login(values.email, values.password);
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (error) {
      const fields = error instanceof ApiError ? error.fields : undefined;
      let handled = false;
      if (fields) {
        for (const key of ["email", "password"] as const) {
          if (fields[key]) {
            setError(key, { message: fields[key] });
            handled = true;
          }
        }
      }
      if (!handled) {
        toast.error(
          error instanceof Error ? error.message : "Unable to sign in.",
        );
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo />
          <div className="space-y-1">
            <h1 className="text-display-sm text-foreground">Welcome back</h1>
            <p className="text-sm text-text-secondary">
              Sign in to your inventory workspace.
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-6">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <FormRow label="Email" htmlFor="email" error={errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  {...register("email")}
                />
              </FormRow>

              <FormRow
                label="Password"
                htmlFor="password"
                error={errors.password?.message}
              >
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                />
              </FormRow>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-text-tertiary">
          Protected workspace · contact an admin for access.
        </p>
      </div>
    </main>
  );
}
