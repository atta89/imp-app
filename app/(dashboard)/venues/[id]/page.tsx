"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  RotateCw,
  PackageSearch,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Section, SectionHeader } from "@/components/layout/section";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DepartmentFormDialog } from "@/components/departments/department-form-dialog";
import {
  useVenues,
  useDepartments,
  useDeleteDepartment,
} from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDate } from "@/lib/format";
import type { Department } from "@/lib/api/types";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default function VenueDetailPage() {
  const params = useParams<{ id: string }>();
  const venueId = params.id;

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const venuesQuery = useVenues();
  const departmentsQuery = useDepartments(venueId);
  const deleteMut = useDeleteDepartment(venueId);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Department | undefined>();
  const [deleting, setDeleting] = React.useState<Department | undefined>();

  const venue = React.useMemo(
    () => venuesQuery.data?.find((v) => v.id === venueId),
    [venuesQuery.data, venueId],
  );

  const departments = departmentsQuery.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Department deleted.");
      setDeleting(undefined);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.kind === "conflict"
          ? "Department is still used by assets; reassign them first."
          : e instanceof Error
            ? e.message
            : "Couldn’t delete department.";
      toast.error(msg);
    }
  }

  if (venuesQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-40" />
        </div>
      </PageContainer>
    );
  }

  if (!venue) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Venue not found"
            description="This venue doesn’t exist or may have been removed."
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href="/venues">Back to venues</Link>
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const columns: Column<Department>[] = [
    {
      id: "name",
      header: "Department",
      className: "min-w-[200px]",
      skeletonClassName: "w-40",
      cell: (d) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{d.name}</p>
          <p className="truncate text-xs text-text-tertiary">{d.code}</p>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      className: "min-w-[220px]",
      skeletonClassName: "w-48",
      cell: (d) => (
        <span className="text-text-secondary">{d.description || "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Active",
      className: "w-[120px]",
      skeletonClassName: "w-16",
      cell: (d) =>
        d.isActive ? (
          <Badge color="success" dot>
            Active
          </Badge>
        ) : (
          <Badge color="gray">Inactive</Badge>
        ),
    },
    {
      id: "created",
      header: "Created",
      align: "right",
      className: "w-[140px]",
      skeletonClassName: "ml-auto w-20",
      cell: (d) => (
        <span className="text-text-tertiary tabular-nums">
          {formatDate(d.createdAt)}
        </span>
      ),
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "",
      align: "right",
      className: "w-[64px]",
      skeletonClassName: "ml-auto w-8",
      cell: (d) => (
        <span
          onClick={(e) => e.stopPropagation()}
          className="inline-flex"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="tertiary"
                size="icon-sm"
                aria-label="Department actions"
              >
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onSelect={() => {
                  setEditing(d);
                  setFormOpen(true);
                }}
              >
                <Pencil />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => setDeleting(d)}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    });
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          backHref="/venues"
          backLabel="Venues"
          title={venue.name}
          subtitle={`${venue.code} · ${venue.type}`}
        />

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              <DetailRow label="Code" value={venue.code} />
              <DetailRow label="Type" value={venue.type} />
              <DetailRow label="City" value={venue.city || "—"} />
              <DetailRow label="Address" value={venue.address || "—"} />
              <DetailRow
                label="Status"
                value={
                  venue.isActive ? (
                    <Badge color="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge color="gray">Inactive</Badge>
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Section>
          <SectionHeader
            title="Departments"
            description="Sub-locations inside this venue that assets can be homed under."
            action={
              isAdmin ? (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="size-4" />
                  New department
                </Button>
              ) : undefined
            }
          />

          {departmentsQuery.isError ? (
            <Card>
              <EmptyState
                icon={AlertTriangle}
                tone="error"
                title="Couldn’t load departments"
                description="There was a problem reaching the server."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => departmentsQuery.refetch()}
                  >
                    <RotateCw className="size-4" />
                    Retry
                  </Button>
                }
              />
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={departments}
              getRowId={(d) => d.id}
              loading={departmentsQuery.isLoading}
              skeletonRows={4}
              empty={
                <EmptyState
                  icon={Building2}
                  title="No departments yet"
                  description={
                    isAdmin
                      ? "Add a department to sub-divide this venue."
                      : "No departments have been set up for this venue."
                  }
                  action={
                    isAdmin ? (
                      <Button size="sm" onClick={openCreate}>
                        <Plus className="size-4" />
                        New department
                      </Button>
                    ) : null
                  }
                />
              }
            />
          )}
        </Section>
      </div>

      <DepartmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        venueId={venueId}
        department={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete department?"
        description={
          deleting
            ? `“${deleting.name}” will be permanently removed. Departments with assets can't be deleted.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
      />
    </PageContainer>
  );
}
