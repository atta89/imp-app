"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Pencil, PackageSearch, AlertTriangle, RotateCw } from "lucide-react";

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
import { RepairStatusDialog } from "@/components/repairs/repair-status-dialog";
import { useRepair, useAsset, useUsers } from "@/lib/api/hooks";
import { REPAIR_STATUS } from "@/lib/status-meta";
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

export default function RepairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const repairQuery = useRepair(id);
  const repair = repairQuery.data;
  const assetQuery = useAsset(repair?.assetId ?? "");
  const usersQuery = useUsers();
  const [editOpen, setEditOpen] = React.useState(false);

  if (repairQuery.isLoading) {
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
    (repairQuery.error instanceof ApiError && repairQuery.error.status === 404) ||
    (!repair && !repairQuery.isError);

  if (notFound) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Repair not found"
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href="/repairs">Back to repairs</Link>
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (repairQuery.isError || !repair) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Couldn’t load this repair"
            action={
              <Button variant="secondary" size="sm" onClick={() => repairQuery.refetch()}>
                <RotateCw className="size-4" />
                Retry
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const meta = REPAIR_STATUS[repair.status];
  const asset = assetQuery.data;
  const reporter = usersQuery.data?.find((u) => u.id === repair.reportedBy);

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          backHref="/repairs"
          backLabel="Repairs"
          title={asset ? `Repair · ${asset.name}` : "Repair ticket"}
          subtitle={asset?.assetTag}
          actions={
            <Button onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Update
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Section>
              <SectionHeader title="Issue" />
              <Card>
                <CardContent className="p-5 text-sm text-foreground sm:p-6">
                  {repair.issue}
                </CardContent>
              </Card>
            </Section>
            {repair.resolution && (
              <Section>
                <SectionHeader title="Resolution" />
                <Card>
                  <CardContent className="p-5 text-sm text-text-secondary sm:p-6">
                    {repair.resolution}
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
                  <DetailRow
                    label="Asset"
                    value={
                      asset ? (
                        <Link
                          href={`/assets/${asset.id}`}
                          className="text-brand hover:underline"
                        >
                          {asset.name}
                        </Link>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <DetailRow label="Vendor" value={repair.vendor || "—"} />
                  <DetailRow
                    label="Reported by"
                    value={reporter?.name ?? "—"}
                  />
                  <DetailRow label="Reported" value={formatDate(repair.reportedAt)} />
                  {repair.sentAt && (
                    <DetailRow label="Sent" value={formatDate(repair.sentAt)} />
                  )}
                  {repair.returnedAt && (
                    <DetailRow label="Returned" value={formatDate(repair.returnedAt)} />
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <RepairStatusDialog
        repair={repair}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </PageContainer>
  );
}
