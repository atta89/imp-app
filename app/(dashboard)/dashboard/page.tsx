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
import { useDashboardSummary } from "@/lib/api/hooks";
import type { AssetStatus, DashboardSummary } from "@/lib/api/types";

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
              {/* Inventory by venue */}
              <Section className="lg:col-span-2">
                <SectionHeader
                  title="Inventory by venue"
                  description="Assets registered at each venue."
                  action={
                    <Button variant="link" size="sm" asChild>
                      <Link href="/assets">
                        View assets
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  }
                />
                <Card>
                  <CardContent className="p-5 sm:p-6">
                    <ByVenue summary={summary} loading={isLoading} />
                  </CardContent>
                </Card>
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

function ByVenue({
  summary,
  loading,
}: {
  summary: DashboardSummary | undefined;
  loading: boolean;
}) {
  if (loading || !summary) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (summary.byVenue.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No venues yet"
        description="Create a venue and add assets to see the breakdown here."
      />
    );
  }

  const max = Math.max(...summary.byVenue.map((v) => v.count), 1);

  return (
    <div className="space-y-4">
      {summary.byVenue.map((venue) => (
        <div key={venue.venueId} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate text-sm font-medium text-foreground">
              {venue.venueName}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-text-secondary">
              {venue.count.toLocaleString()}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.round((venue.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
