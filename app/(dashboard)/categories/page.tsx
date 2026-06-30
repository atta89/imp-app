"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Tags,
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
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { useCategories, useDeleteCategory } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import type { Category } from "@/lib/api/types";

export default function CategoriesPage() {
  const categoriesQuery = useCategories();
  const deleteMut = useDeleteCategory();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | undefined>();
  const [deleting, setDeleting] = React.useState<Category | undefined>();

  const categories = categoriesQuery.data ?? [];

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Category deleted.");
      setDeleting(undefined);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.kind === "conflict"
          ? "This category still has assets. Reassign them first."
          : e instanceof Error
            ? e.message
            : "Couldn’t delete category.";
      toast.error(msg);
    }
  }

  const columns: Column<Category>[] = [
    {
      id: "name",
      header: "Category",
      className: "min-w-[200px]",
      skeletonClassName: "w-40",
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{c.name}</p>
          <p className="truncate text-xs text-text-tertiary">{c.slug}</p>
        </div>
      ),
    },
    {
      id: "description",
      header: "Description",
      className: "min-w-[200px]",
      skeletonClassName: "w-48",
      cell: (c) => (
        <span className="text-text-secondary">{c.description || "—"}</span>
      ),
    },
    {
      id: "fields",
      header: "Custom fields",
      align: "right",
      className: "w-[130px]",
      skeletonClassName: "ml-auto w-8",
      cell: (c) => (
        <span className="tabular-nums text-text-secondary">
          {c.customFields?.length ?? 0}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "w-[120px]",
      skeletonClassName: "w-16",
      cell: (c) =>
        c.isActive ? (
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
      cell: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="tertiary" size="icon-sm" aria-label="Category actions">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                setEditing(c);
                setFormOpen(true);
              }}
            >
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem destructive onSelect={() => setDeleting(c)}>
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
          title="Categories"
          subtitle="Asset types and the custom fields they define."
          actions={
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Add category
            </Button>
          }
        />

        {categoriesQuery.isError ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              tone="error"
              title="Couldn’t load categories"
              description="There was a problem reaching the server."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => categoriesQuery.refetch()}
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
            data={categories}
            getRowId={(c) => c.id}
            loading={categoriesQuery.isLoading}
            skeletonRows={5}
            empty={
              <EmptyState
                icon={Tags}
                title="No categories yet"
                description="Add a category to classify your assets."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="size-4" />
                    Add category
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(undefined)}
        title="Delete category?"
        description={
          deleting
            ? `“${deleting.name}” will be permanently removed. Categories with assets can't be deleted.`
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
