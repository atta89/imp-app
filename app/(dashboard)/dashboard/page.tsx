"use client";

import Link from "next/link";
import {
  Boxes,
  PlugZap,
  PlaneTakeoff,
  Wrench,
  AlertTriangle,
  ScanLine,
  ArrowRight,
  Building2,
  RotateCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Section, SectionHeader } from "@/components/layout/section";
import { StatCard, type StatTone } from "@/components/layout/stat-card";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardSummary, useInventoryByVenue } from "@/lib/api/hooks";
import type {
  AssetStatus,
  DashboardSummary,
  InventoryByVenueRow,
} from "@/lib/api/types";

type BadgeColor = React.ComponentProps<typeof Badge>["color"];

function stats(summary: DashboardSummary): {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
}[] {
  return [
    {
      label: "Total assets",
      value: summary.totalAssets,
      icon: Boxes,
      tone: "gray",
    },
    {
      label: "In use",
      value: summary.byStatus["in_use"] ?? 0,
      icon: PlugZap,
      tone: "info",
    },
    {
      label: "Away from home",
      value: summary.awayFromHome,
      icon: PlaneTakeoff,
      tone: "brand",
    },
    {
      label: "In repair",
      value: summary.inRepair,
      icon: Wrench,
      tone: "warning",
    },
    {
      label: "Overdue returns",
      value: summary.overdue,
      icon: AlertTriangle,
      tone: "error",
    },
  ];
}

const STATUS_ROWS: { status: AssetStatus; label: string; color: BadgeColor }[] =
  [
    { status: "in_use", label: "In use", color: "info" },
    { status: "available", label: "Available", color: "gray" },
    { status: "in_repair", label: "In repair", color: "warning" },
    { status: "retired", label: "Retired", color: "gray" },
    { status: "lost", label: "Lost", color: "error" },
  ];

const STAT_PLACEHOLDERS: { label: string; icon: LucideIcon; tone: StatTone }[] =
  [
    { label: "Total assets", icon: Boxes, tone: "gray" },
    { label: "In use", icon: PlugZap, tone: "info" },
    { label: "Away from home", icon: PlaneTakeoff, tone: "brand" },
    { label: "In repair", icon: Wrench, tone: "warning" },
    { label: "Overdue returns", icon: AlertTriangle, tone: "error" },
  ];

export default function DashboardPage() {
  const {
    data: summary,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useDashboardSummary();
  const inventory = useInventoryByVenue();

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of assets across all venues."
          actions={
            <Button variant="secondary" asChild>
              <Link href="/scan">
                <ScanLine className="size-4" />
                Scan asset
              </Link>
            </Button>
          }
        />

        {isError ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={AlertTriangle}
                tone="error"
                title="Couldn’t load the dashboard"
                description="There was a problem reaching the server."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RotateCw className="size-4" />
                    Retry
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {isLoading || !summary
                ? STAT_PLACEHOLDERS.map((s) => (
                    <StatCard
                      key={s.label}
                      label={s.label}
                      value=""
                      icon={s.icon}
                      tone={s.tone}
                      loading
                    />
                  ))
                : stats(summary).map((s) => (
                    <StatCard
                      key={s.label}
                      label={s.label}
                      value={s.value.toLocaleString()}
                      icon={s.icon}
                      tone={s.tone}
                    />
                  ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Departments by venue — one card per venue, broken down by home
                  department, so asset distribution is comparable across venues. */}
              <Section className="lg:col-span-2">
                <SectionHeader
                  title="Departments by venue"
                  description="Per-venue asset counts, broken down by home department."
                  action={
                    <Button variant="link" size="sm" asChild>
                      <Link href="/assets">
                        View assets
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  }
                />
                <VenueDepartmentCards
                  rows={inventory.data}
                  loading={inventory.isLoading}
                  isError={inventory.isError}
                  onRetry={() => inventory.refetch()}
                  refetching={inventory.isFetching}
                />
              </Section>

              {/* Assets by status */}
              <Section>
                <SectionHeader title="Assets by status" />
                <Card>
                  <CardContent className="space-y-1 p-5 sm:p-6">
                    {isLoading || !summary
                      ? Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-1.5"
                          >
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-4 w-6" />
                          </div>
                        ))
                      : STATUS_ROWS.map((row) => (
                          <div
                            key={row.status}
                            className="flex items-center justify-between py-1.5"
                          >
                            <Badge color={row.color} dot>
                              {row.label}
                            </Badge>
                            <span className="text-sm font-medium tabular-nums text-foreground">
                              {(
                                summary.byStatus[row.status] ?? 0
                              ).toLocaleString()}
                            </span>
                          </div>
                        ))}
                  </CardContent>
                </Card>
              </Section>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function VenueDepartmentCards({
  rows,
  loading,
  isError,
  onRetry,
  refetching,
}: {
  rows: InventoryByVenueRow[] | undefined;
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  refetching: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-10" />
            </div>
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3.5 w-6" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Couldn’t load venues"
            description="There was a problem reaching the server."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                disabled={refetching}
              >
                <RotateCw className="size-4" />
                Retry
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={Building2}
            title="No venues yet"
            description="Create a venue and add assets to see the breakdown here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <VenueCard key={row.venueId} row={row} />
      ))}
    </div>
  );
}

function VenueCard({ row }: { row: InventoryByVenueRow }) {
  const departments = [...(row.byDepartment ?? [])].sort(
    (a, b) => b.count - a.count,
  );

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-700 dark:bg-orange-400/15 dark:text-orange-400">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {row.venueName}
            </p>
            <p className="text-xs text-text-tertiary">
              {departments.length} department
              {departments.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-display-sm leading-none tabular-nums text-foreground">
            {row.total.toLocaleString()}
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            asset{row.total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {departments.length === 0 ? (
          <p className="text-xs text-text-tertiary">No departments</p>
        ) : (
          departments.map((d) => {
            const pct =
              row.total > 0
                ? Math.round((d.count / row.total) * 100)
                : 0;
            return (
              <div key={d.departmentId} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-text-secondary">
                    {d.departmentName}
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {d.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
