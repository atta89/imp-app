"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  PackageCheck,
  PackageSearch,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Section, SectionHeader } from "@/components/layout/section";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiveDialog } from "@/components/purchase-orders/receive-dialog";
import {
  usePurchaseOrder,
  useVenues,
  useUsers,
  useCategories,
} from "@/lib/api/hooks";
import { buildLookups } from "@/lib/assets/view";
import { PO_STATUS } from "@/lib/status-meta";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

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

export default function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const poQuery = usePurchaseOrder(id);
  const venuesQuery = useVenues();
  const usersQuery = useUsers();
  const categoriesQuery = useCategories();
  const [receiveOpen, setReceiveOpen] = React.useState(false);

  const lookups = React.useMemo(
    () => buildLookups(venuesQuery.data, categoriesQuery.data, usersQuery.data),
    [venuesQuery.data, categoriesQuery.data, usersQuery.data],
  );

  const po = poQuery.data;

  if (poQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-8">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageContainer>
    );
  }

  const notFound =
    (poQuery.error instanceof ApiError && poQuery.error.status === 404) ||
    (!po && !poQuery.isError);

  if (notFound) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Purchase order not found"
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href="/purchase-orders">Back to purchase orders</Link>
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (poQuery.isError || !po) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Couldn’t load this purchase order"
            action={
              <Button variant="secondary" size="sm" onClick={() => poQuery.refetch()}>
                <RotateCw className="size-4" />
                Retry
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const meta = PO_STATUS[po.status];
  const unitCount = po.lineItems.reduce((sum, li) => sum + li.quantity, 0);
  const canReceive = po.status === "draft" || po.status === "ordered";

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          backHref="/purchase-orders"
          backLabel="Purchase orders"
          title={po.poNumber}
          subtitle={po.supplier.name}
          actions={
            canReceive ? (
              <Button onClick={() => setReceiveOpen(true)}>
                <PackageCheck className="size-4" />
                Receive
              </Button>
            ) : undefined
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Line items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-border bg-gray-50 dark:bg-gray-900">
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary">
                        Item
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary">
                        Category
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium text-text-secondary">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lineItems.map((li, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-foreground">
                          {li.name}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {lookups.categories.get(li.categoryId)?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-text-secondary">
                          {li.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border">
                      <td
                        colSpan={2}
                        className="px-5 py-3 text-sm font-medium text-foreground"
                      >
                        Total units
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-semibold tabular-nums text-foreground">
                        {unitCount}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>

            {po.notes && (
              <Section>
                <SectionHeader title="Notes" />
                <Card>
                  <CardContent className="p-5 text-sm text-text-secondary sm:p-6">
                    {po.notes}
                  </CardContent>
                </Card>
              </Section>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Details</CardTitle>
                  <Badge color={meta.color} dot>
                    {meta.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border">
                  <DetailRow label="Supplier" value={po.supplier.name} />
                  {po.supplier.contact && (
                    <DetailRow label="Contact" value={po.supplier.contact} />
                  )}
                  <DetailRow
                    label="Responsible"
                    value={lookups.users.get(po.responsibleUserId)?.name ?? "—"}
                  />
                  <DetailRow label="Order date" value={formatDate(po.orderDate)} />
                  {po.receivedDate && (
                    <DetailRow
                      label="Received"
                      value={formatDate(po.receivedDate)}
                    />
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ReceiveDialog
        poId={id}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        venues={venuesQuery.data ?? []}
        unitCount={unitCount}
      />
    </PageContainer>
  );
}
