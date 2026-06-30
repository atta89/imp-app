"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Users as UsersIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  RotateCw,
  Check,
  Minus,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, initials } from "@/components/ui/avatar";
import { EmptyState } from "@/components/layout/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { useUsers, useVenues, useDeleteUser } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import type { Role, User } from "@/lib/api/types";

const ROLE_META: Record<Role, { label: string; color: "brand" | "info" | "gray" }> = {
  admin: { label: "Admin", color: "brand" },
  venue_manager: { label: "Venue Manager", color: "info" },
  staff: { label: "Staff", color: "gray" },
};

export default function UsersPage() {
  const usersQuery = useUsers();
  const venuesQuery = useVenues();
  const deleteMut = useDeleteUser();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | undefined>();
  const [deleting, setDeleting] = React.useState<User | undefined>();

  const users = usersQuery.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("User removed.");
      setDeleting(undefined);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.kind === "conflict"
          ? "This user is still responsible for assets. Reassign them first."
          : e instanceof Error
            ? e.message
            : "Couldn’t remove user.";
      toast.error(msg);
    }
  }

  const columns: Column<User>[] = [
    {
      id: "name",
      header: "Name",
      className: "min-w-[220px]",
      skeletonClassName: "w-40",
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8 text-xs">{initials(u.name)}</Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{u.name}</p>
            <p className="truncate text-xs text-text-tertiary">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      className: "w-[150px]",
      skeletonClassName: "w-20",
      cell: (u) => {
        const meta = ROLE_META[u.role];
        return (
          <Badge color={meta.color} dot>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      id: "position",
      header: "Position",
      className: "min-w-[140px]",
      skeletonClassName: "w-24",
      cell: (u) => <span className="text-text-secondary">{u.position}</span>,
    },
    {
      id: "venues",
      header: "Venues",
      align: "right",
      className: "w-[90px]",
      skeletonClassName: "ml-auto w-8",
      cell: (u) => (
        <span className="tabular-nums text-text-secondary">
          {u.role === "admin" ? "All" : (u.venueIds?.length ?? 0)}
        </span>
      ),
    },
    {
      id: "notify",
      header: "Email",
      className: "w-[90px]",
      skeletonClassName: "w-8",
      cell: (u) =>
        u.notifyByEmail ? (
          <Check className="size-4 text-success-600 dark:text-success-400" />
        ) : (
          <Minus className="size-4 text-text-tertiary" />
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      className: "w-[64px]",
      skeletonClassName: "ml-auto w-8",
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="tertiary" size="icon-sm" aria-label="User actions">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                setEditing(u);
                setFormOpen(true);
              }}
            >
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setDeleting(u)}>
              <Trash2 />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          subtitle="People with access to the workspace."
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add user
            </Button>
          }
        />

        {usersQuery.isError ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              tone="error"
              title="Couldn’t load users"
              description="There was a problem reaching the server."
              action={
                <Button variant="secondary" size="sm" onClick={() => usersQuery.refetch()}>
                  <RotateCw className="size-4" />
                  Retry
                </Button>
              }
            />
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={users}
            getRowId={(u) => u.id}
            loading={usersQuery.isLoading}
            skeletonRows={5}
            empty={
              <EmptyState
                icon={UsersIcon}
                title="No users yet"
                description="Add your first teammate."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="size-4" />
                    Add user
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        venues={venuesQuery.data ?? []}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Remove user?"
        description={
          deleting
            ? `“${deleting.name}” will lose access. Users responsible for assets can't be removed.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
