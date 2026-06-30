"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, AlertTriangle, RotateCw, Upload } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Toolbar } from "@/components/layout/toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PoFormDialog } from "@/components/purchase-orders/po-form-dialog";
import {
  usePurchaseOrders,
  useCategories,
  useUsers,
} from "@/lib/api/hooks";
import { PO_STATUS } from "@/lib/status-meta";
import { formatDate } from "@/lib/format";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/api/types";

const STATUSES: PurchaseOrderStatus[] = ["draft", "ordered", "received", "cancelled"];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [status, setStatus] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);

  const poQuery = usePurchaseOrders(status || undefined);
  const usersQuery = useUsers();
  const categoriesQuery = useCategories();

  const userName = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const u of usersQuery.data ?? []) m.set(u.id, u.name);
    return m;
  }, [usersQuery.data]);

  const orders = poQuery.data ?? [];

  const columns: Column<PurchaseOrder>[] = [
    {
      id: "po",
      header: "PO",
      className: "min-w-[180px]",
      skeletonClassName: "w-32",
      cell: (po) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground tabular-nums">
            {po.poNumber}
          </p>
          <p className="truncate text-xs text-text-tertiary">{po.supplier.name}</p>
        </div>
      ),
    },
    {
      id: "responsible",
      header: "Responsible",
      className: "min-w-[160px]",
      skeletonClassName: "w-28",
      cell: (po) => (
        <span className="text-text-secondary">
          {userName.get(po.responsibleUserId) ?? "—"}
        </span>
      ),
    },
    {
      id: "orderDate",
      header: "Order date",
      className: "w-[140px]",
      skeletonClassName: "w-20",
      cell: (po) => (
        <span className="text-text-secondary">{formatDate(po.orderDate)}</span>
      ),
    },
    {
      id: "units",
      header: "Units",
      align: "right",
      className: "w-[90px]",
      skeletonClassName: "ml-auto w-8",
      cell: (po) => (
        <span className="tabular-nums text-text-secondary">
          {po.lineItems.reduce((sum, li) => sum + li.quantity, 0)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "w-[130px]",
      skeletonClassName: "w-20",
      cell: (po) => {
        const meta = PO_STATUS[po.status];
        return (
          <Badge color={meta.color} dot>
            {meta.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Purchase orders"
          subtitle="Orders that generate tracked assets on receipt."
          actions={
            <>
              {isAdmin && (
                <Button variant="secondary" asChild>
                  <Link href="/purchase-orders/import">
                    <Upload className="size-4" />
                    Import
                  </Link>
                </Button>
              )}
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="size-4" />
                New PO
              </Button>
            </>
          }
        />

        <Toolbar
          left={
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Filter by status"
              className="w-full sm:w-auto"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PO_STATUS[s].label}
                </option>
              ))}
            </Select>
          }
        />

        {poQuery.isError ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              tone="error"
              title="Couldn’t load purchase orders"
              description="There was a problem reaching the server."
              action={
                <Button variant="secondary" size="sm" onClick={() => poQuery.refetch()}>
                  <RotateCw className="size-4" />
                  Retry
                </Button>
              }
            />
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={orders}
            getRowId={(po) => po.id}
            loading={poQuery.isLoading}
            skeletonRows={5}
            onRowClick={(po) => router.push(`/purchase-orders/${po.id}`)}
            empty={
              <EmptyState
                icon={ShoppingCart}
                title="No purchase orders"
                description="Create a PO to record an order and generate assets when it arrives."
                action={
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    <Plus className="size-4" />
                    New PO
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <PoFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categoriesQuery.data ?? []}
        users={usersQuery.data ?? []}
      />
    </PageContainer>
  );
}
