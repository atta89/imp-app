"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wrench, AlertTriangle, RotateCw } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Toolbar } from "@/components/layout/toolbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { useRepairs, useAssets } from "@/lib/api/hooks";
import { REPAIR_STATUS } from "@/lib/status-meta";
import { formatDate } from "@/lib/format";
import type { Repair, RepairStatus } from "@/lib/api/types";

const STATUSES: RepairStatus[] = ["open", "in_progress", "completed", "unrepairable"];

export default function RepairsPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState("");
  const repairsQuery = useRepairs(status || undefined);
  const assetsQuery = useAssets({ limit: 200 });

  const assetMap = React.useMemo(() => {
    const m = new Map<string, { name: string; assetTag: string }>();
    for (const a of assetsQuery.data?.items ?? [])
      m.set(a.id, { name: a.name, assetTag: a.assetTag });
    return m;
  }, [assetsQuery.data]);

  const repairs = repairsQuery.data ?? [];

  const columns: Column<Repair>[] = [
    {
      id: "asset",
      header: "Asset",
      className: "min-w-[180px]",
      skeletonClassName: "w-32",
      cell: (r) => {
        const a = assetMap.get(r.assetId);
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {a?.name ?? "Asset"}
            </p>
            {a && (
              <p className="truncate text-xs text-text-tertiary tabular-nums">
                {a.assetTag}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "issue",
      header: "Issue",
      className: "min-w-[240px]",
      skeletonClassName: "w-48",
      cell: (r) => (
        <span className="line-clamp-1 text-text-secondary" title={r.issue}>
          {r.issue}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "w-[140px]",
      skeletonClassName: "w-24",
      cell: (r) => {
        const meta = REPAIR_STATUS[r.status];
        return (
          <Badge color={meta.color} dot>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      id: "vendor",
      header: "Vendor",
      className: "min-w-[120px]",
      skeletonClassName: "w-20",
      cell: (r) => <span className="text-text-secondary">{r.vendor || "—"}</span>,
    },
    {
      id: "reported",
      header: "Reported",
      align: "right",
      className: "w-[130px]",
      skeletonClassName: "ml-auto w-20",
      cell: (r) => (
        <span className="whitespace-nowrap text-text-tertiary">
          {formatDate(r.reportedAt)}
        </span>
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Repairs"
          subtitle="Open and resolved repair tickets."
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
                  {REPAIR_STATUS[s].label}
                </option>
              ))}
            </Select>
          }
        />

        {repairsQuery.isError ? (
          <Card>
            <EmptyState
              icon={AlertTriangle}
              tone="error"
              title="Couldn’t load repairs"
              description="There was a problem reaching the server."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => repairsQuery.refetch()}
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
            data={repairs}
            getRowId={(r) => r.id}
            loading={repairsQuery.isLoading}
            skeletonRows={5}
            onRowClick={(r) => router.push(`/repairs/${r.id}`)}
            empty={
              <EmptyState
                icon={Wrench}
                title="No repair tickets"
                description="Send an asset to repair from its page to open a ticket."
              />
            }
          />
        )}
      </div>
    </PageContainer>
  );
}
