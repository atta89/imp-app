"use client";

import { toast } from "sonner";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, initials } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-context";
import { ChangePasswordForm } from "@/components/account/change-password-form";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  venue_manager: "Venue Manager",
  staff: "Staff",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const prefsQuery = useNotificationPreferences();
  const updateMut = useUpdateNotificationPreferences();
  const notify = prefsQuery.data?.notifyByEmail ?? false;

  async function toggle(next: boolean) {
    try {
      await updateMut.mutateAsync(next);
      toast.success(next ? "Email notifications on." : "Email notifications off.");
    } catch {
      toast.error("Couldn’t update preferences.");
    }
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Manage your account and notifications."
        />

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-12">{initials(user?.name ?? "")}</Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-sm text-text-secondary">{user?.email}</p>
            </div>
            {user && (
              <div className="text-right">
                <Badge color="gray">{ROLE_LABEL[user.role] ?? user.role}</Badge>
                <p className="mt-1 text-xs text-text-tertiary">{user.position}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              How you hear about overdue assets, custody changes and repairs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  Email notifications
                </p>
                <p className="text-sm text-text-secondary">
                  Daily overdue digest and event emails to {user?.email}.
                </p>
              </div>
              {prefsQuery.isLoading ? (
                <Skeleton className="size-5 rounded" />
              ) : (
                <Checkbox
                  checked={notify}
                  disabled={updateMut.isPending}
                  onCheckedChange={toggle}
                  aria-label="Email notifications"
                  className="mt-0.5"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change your password. You&apos;ll stay signed in on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
