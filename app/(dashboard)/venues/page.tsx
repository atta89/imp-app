"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VenueFormDialog } from "@/components/venues/venue-form-dialog";
import { useVenues, useDeleteVenue, useDashboardSummary } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import type { Venue } from "@/lib/api/types";

export default function VenuesPage() {
  const venuesQuery = useVenues();
  const summaryQuery = useDashboardSummary();
  const deleteMut = useDeleteVenue();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Venue | undefined>();
  const [deleting, setDeleting] = React.useState<Venue | undefined>();

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const v of summaryQuery.data?.byVenue ?? []) map.set(v.venueId, v.count);
    return map;
  }, [summaryQuery.data]);

  const venues = venuesQuery.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Venue deleted.");
      setDeleting(undefined);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.kind === "conflict"
          ? "This venue still has assets assigned. Reassign them first."
          : e instanceof Error
            ? e.message
            : "Couldn’t delete venue.";
      toast.error(msg);
    }
  }

  const columns: Column<Venue>[] = [
    {
      id: "name",
      header: "Venue",
      className: "min-w-[200px]",
      skeletonClassName: "w-40",
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{v.name}</p>
          <p className="truncate text-xs text-text-tertiary">{v.code}</p>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      className: "w-[140px] capitalize",
      skeletonClassName: "w-16",
      cell: (v) => <span className="text-text-secondary">{v.type}</span>,
    },
    {
      id: "city",
      header: "City",
      className: "min-w-[120px]",
      skeletonClassName: "w-20",
      cell: (v) => (
        <span className="text-text-secondary">{v.city || "—"}</span>
      ),
    },
    {
      id: "assets",
      header: "Assets",
      align: "right",
      className: "w-[100px]",
      skeletonClassName: "ml-auto w-8",
      cell: (v) => (
        <span className="tabular-nums text-text-secondary">
          {counts.has(v.id) ? counts.get(v.id) : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "w-[120px]",
      skeletonClassName: "w-16",
      cell: (v) =>
        v.isActive ? (
          <Badge color="success" dot>
            Active
          </Badge>
        ) : (
          <Badge color="gray">Inactive</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      className: "w-[64px]",
      skeletonClassName: "ml-auto w-8",
      cell: (v) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="tertiary" size="icon-sm" aria-label="Venue actions">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                setEditing(v);
                setFormOpen(true);
              }}
            >
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setDeleting(v)}>
              <Trash2 />
              Delete
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
          title="Venues"
          subtitle="Locations that hold assets."
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add venue
            </Button>
          }
        />

        {venuesQuery.isError ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              tone="error"
              title="Couldn’t load venues"
              description="There was a problem reaching the server."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => venuesQuery.refetch()}
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
            data={venues}
            getRowId={(v) => v.id}
            loading={venuesQuery.isLoading}
            skeletonRows={5}
            empty={
              <EmptyState
                icon={Building2}
                title="No venues yet"
                description="Add your first venue to start placing assets."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="size-4" />
                    Add venue
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <VenueFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        venue={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete venue?"
        description={
          deleting
            ? `“${deleting.name}” will be permanently removed. Venues with assets can't be deleted.`
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
