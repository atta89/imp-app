"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlaneTakeoff, AlertTriangle, Wrench, Building2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/assets/status-badge";
import { ResponsibleCell } from "@/components/assets/responsible-cell";
import { HorizontalBarChart } from "@/components/reports/bar-chart";
import {
  useInventoryByVenue,
  useByResponsibleReport,
  useAssetsAwayReport,
  useAssetsOverdueReport,
  useInRepairReport,
  useReportByDepartment,
  useVenues,
  useCategories,
  useUsers,
} from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-context";
import { buildLookups, toAssetRow, type AssetRow } from "@/lib/assets/view";
import { REPAIR_STATUS } from "@/lib/status-meta";
import { formatDate } from "@/lib/format";
import type { Asset, Repair } from "@/lib/api/types";

function ChartCard({
  title,
  loading,
  data,
}: {
  title: string;
  loading: boolean;
  data: { label: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : (
          <HorizontalBarChart data={data} />
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const inventory = useInventoryByVenue();
  const byResponsible = useByResponsibleReport();
  const away = useAssetsAwayReport();
  const overdue = useAssetsOverdueReport();
  const inRepair = useInRepairReport();
  const venuesQuery = useVenues();
  const categoriesQuery = useCategories();
  const usersQuery = useUsers();

  // By-department report: admins can leave the venue blank for all venues;
  // non-admins must pick one (the backend rejects a missing venue for them).
  const [deptVenue, setDeptVenue] = React.useState("");
  const canFireByDept = isAdmin || Boolean(deptVenue);
  const byDept = useReportByDepartment(deptVenue || undefined, {
    enabled: canFireByDept,
  });

  const lookups = React.useMemo(
    () => buildLookups(venuesQuery.data, categoriesQuery.data, usersQuery.data),
    [venuesQuery.data, categoriesQuery.data, usersQuery.data],
  );

  const assetMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of away.data ?? []) m.set(a.id, a.name);
    for (const a of overdue.data ?? []) m.set(a.id, a.name);
    return m;
  }, [away.data, overdue.data]);

  const assetColumns: Column<AssetRow>[] = [
    {
      id: "asset",
      header: "Asset",
      className: "min-w-[180px]",
      skeletonClassName: "w-36",
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{a.name}</p>
          <p className="truncate text-xs text-text-tertiary tabular-nums">
            {a.assetTag}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "min-w-[180px]",
      skeletonClassName: "w-32",
      cell: (a) => (
        <StatusBadge
          status={a.status}
          away={a.away}
          venueName={a.away ? a.currentVenueName : undefined}
          overdue={a.isOverdue}
        />
      ),
    },
    {
      id: "responsible",
      header: "Responsible",
      className: "min-w-[180px]",
      skeletonClassName: "w-28",
      cell: (a) => (
        <ResponsibleCell name={a.responsibleName} position={a.responsiblePosition} />
      ),
    },
    {
      id: "return",
      header: "Expected return",
      align: "right",
      className: "w-[150px]",
      skeletonClassName: "ml-auto w-20",
      cell: (a) => (
        <span
          className={
            a.isOverdue
              ? "text-error-600 dark:text-error-400"
              : "text-text-secondary"
          }
        >
          {a.expectedReturnDate ? formatDate(a.expectedReturnDate) : "—"}
        </span>
      ),
    },
  ];

  const repairColumns: Column<Repair>[] = [
    {
      id: "asset",
      header: "Asset",
      className: "min-w-[160px]",
      skeletonClassName: "w-32",
      cell: (r) => (
        <span className="font-medium text-foreground">
          {assetMap.get(r.assetId) ?? "Asset"}
        </span>
      ),
    },
    {
      id: "issue",
      header: "Issue",
      className: "min-w-[220px]",
      skeletonClassName: "w-48",
      cell: (r) => (
        <span className="line-clamp-1 text-text-secondary">{r.issue}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "w-[140px]",
      skeletonClassName: "w-24",
      cell: (r) => {
        const m = REPAIR_STATUS[r.status];
        return (
          <Badge color={m.color} dot>
            {m.label}
          </Badge>
        );
      },
    },
    {
      id: "reported",
      header: "Reported",
      align: "right",
      className: "w-[130px]",
      skeletonClassName: "ml-auto w-20",
      cell: (r) => (
        <span className="text-text-tertiary">{formatDate(r.reportedAt)}</span>
      ),
    },
  ];

  const toRows = (assets: Asset[] = []) => assets.map((a) => toAssetRow(a, lookups));

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          title="Reports"
          subtitle="Inventory, location and accountability at a glance."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Inventory by venue"
            loading={inventory.isLoading}
            data={(inventory.data ?? []).map((r) => ({
              label: r.venueName,
              value: r.total,
            }))}
          />
          <ChartCard
            title="Assets by responsible"
            loading={byResponsible.isLoading}
            data={(byResponsible.data ?? []).map((r) => ({
              label: r.userName,
              value: r.count,
            }))}
          />
        </div>

        {/* Per-venue department breakdown, inline pills under each venue name. */}
        <Section>
          <SectionHeader
            title="Departments by venue"
            description="A per-venue breakdown of asset counts by home department."
          />
          <Card>
            <CardContent className="p-5 sm:p-6">
              {inventory.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (inventory.data ?? []).length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No venues yet"
                  description="Add a venue to start seeing this breakdown."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {(inventory.data ?? []).map((row) => (
                    <li
                      key={row.venueId}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium text-foreground">
                          {row.venueName}
                        </span>
                        <span className="text-xs text-text-tertiary tabular-nums">
                          {row.total} asset{row.total === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(row.byDepartment ?? []).length === 0 ? (
                          <span className="text-xs text-text-tertiary">
                            No departments
                          </span>
                        ) : (
                          (row.byDepartment ?? []).map((d) => (
                            <Badge key={d.departmentId} color="gray">
                              {d.departmentName}
                              <span className="ml-1 text-text-tertiary tabular-nums">
                                {d.count}
                              </span>
                            </Badge>
                          ))
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </Section>

        <Section>
          <SectionHeader
            title="By department"
            description={
              isAdmin
                ? "Asset counts per department. Leave the venue blank to see every venue."
                : "Pick a venue to see its department breakdown."
            }
            action={
              <Select
                value={deptVenue}
                onChange={(e) => setDeptVenue(e.target.value)}
                aria-label="Venue"
                className="w-56"
              >
                <option value="">
                  {isAdmin ? "All venues" : "Select a venue…"}
                </option>
                {(venuesQuery.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
            }
          />
          <Card>
            <CardContent className="p-5 sm:p-6">
              {!canFireByDept ? (
                <EmptyState
                  icon={Building2}
                  title="Pick a venue"
                  description="Choose a venue above to see its department breakdown."
                />
              ) : byDept.isLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <HorizontalBarChart
                  data={(byDept.data ?? []).map((r) => ({
                    label: r.departmentName,
                    value: r.count,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </Section>

        <Section>
          <SectionHeader
            title="Away from home"
            description="Assets currently at a venue other than their home."
          />
          <DataTable
            columns={assetColumns}
            data={toRows(away.data)}
            getRowId={(a) => a.id}
            loading={away.isLoading}
            skeletonRows={4}
            onRowClick={(a) => router.push(`/assets/${a.id}`)}
            empty={
              <EmptyState
                icon={PlaneTakeoff}
                title="Nothing away"
                description="All assets are at their home venue."
              />
            }
          />
        </Section>

        <Section>
          <SectionHeader
            title="Overdue returns"
            description="Temporary transfers past their expected return date."
          />
          <DataTable
            columns={assetColumns}
            data={toRows(overdue.data)}
            getRowId={(a) => a.id}
            loading={overdue.isLoading}
            skeletonRows={4}
            onRowClick={(a) => router.push(`/assets/${a.id}`)}
            empty={
              <EmptyState
                icon={AlertTriangle}
                title="No overdue assets"
                description="Every temporary transfer is on time."
              />
            }
          />
        </Section>

        <Section>
          <SectionHeader
            title="In repair"
            description="Open and in-progress repair tickets."
          />
          <DataTable
            columns={repairColumns}
            data={inRepair.data ?? []}
            getRowId={(r) => r.id}
            loading={inRepair.isLoading}
            skeletonRows={4}
            onRowClick={(r) => router.push(`/repairs/${r.id}`)}
            empty={
              <EmptyState
                icon={Wrench}
                title="Nothing in repair"
                description="No open repair tickets right now."
              />
            }
          />
        </Section>
      </div>
    </PageContainer>
  );
}
