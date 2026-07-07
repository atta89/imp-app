"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ScanLine,
  Search,
  Boxes,
  SearchX,
  ArrowRightLeft,
  ClipboardCheck,
  Printer,
  X,
  PlaneTakeoff,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  UserCog,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Toolbar } from "@/components/layout/toolbar";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";
import { ResponsibleCell } from "@/components/assets/responsible-cell";
import { AssetCard } from "@/components/assets/asset-card";
import { formatRelative, formatDate } from "@/lib/format";
import {
  useAssets,
  useVenues,
  useCategories,
  useUsers,
  useAssetDepartments,
} from "@/lib/api/hooks";
import { queryKeys, type AssetFilters } from "@/lib/api/query-keys";
import type { Asset, AssetStatus } from "@/lib/api/types";
import { buildLookups, toAssetRow, type AssetRow } from "@/lib/assets/view";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth/auth-context";
import {
  BulkAssignDialog,
  BulkTransferDialog,
  BulkChangeStatusDialog,
  BulkPrintLabelsDialog,
  BulkUpdateConditionDialog,
} from "@/components/assets/bulk-action-dialogs";

type BulkDialog =
  | "transfer"
  | "status"
  | "assign"
  | "condition"
  | "print"
  | null;

// Stable empty array so the RBAC memo doesn't recompute every render.
const NO_VENUES: string[] = [];

const PAGE_SIZE = 10;
const STATUSES: AssetStatus[] = [
  "available",
  "in_use",
  "in_repair",
  "retired",
  "lost",
];
const STATUS_LABEL: Record<AssetStatus, string> = {
  available: "Available",
  in_use: "In use",
  in_repair: "In repair",
  retired: "Retired",
  lost: "Lost",
};

export default function AssetsPage() {
  const router = useRouter();

  const [search, setSearch] = React.useState("");
  const [venue, setVenue] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [awayOnly, setAwayOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const hasFilters =
    search !== "" ||
    venue !== "" ||
    department !== "" ||
    category !== "" ||
    status !== "" ||
    awayOnly;

  // Reset to page 1 whenever any filter changes (render-time, no effect).
  const filterKey = `${debouncedSearch}|${venue}|${department}|${category}|${status}|${awayOnly}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  // The department filter is scoped to the venue filter; clear it whenever
  // the venue changes (render-time).
  const [prevVenue, setPrevVenue] = React.useState(venue);
  if (venue !== prevVenue) {
    setPrevVenue(venue);
    if (department !== "") setDepartment("");
  }

  const departmentsQuery = useAssetDepartments(venue);
  const departments = departmentsQuery.data ?? [];

  const filters: AssetFilters = {
    page,
    limit: PAGE_SIZE,
    q: debouncedSearch || undefined,
    venue: venue || undefined,
    department: department || undefined,
    category: category || undefined,
    status: (status || undefined) as AssetStatus | undefined,
    away: awayOnly || undefined,
  };

  const assetsQuery = useAssets(filters);
  const venuesQuery = useVenues();
  const categoriesQuery = useCategories();
  const usersQuery = useUsers();

  // ── Bulk actions: RBAC scope + tag resolution + dialog state ──
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";
  const scopeVenueIds = user?.venueIds ?? NO_VENUES;
  const canBulk = isAdmin || scopeVenueIds.length > 0;
  const [bulkDialog, setBulkDialog] = React.useState<BulkDialog>(null);

  const accessibleVenues = React.useMemo(
    () =>
      isAdmin
        ? (venuesQuery.data ?? [])
        : (venuesQuery.data ?? []).filter((v) => scopeVenueIds.includes(v.id)),
    [isAdmin, venuesQuery.data, scopeVenueIds],
  );

  // Resolve an asset tag from any cached assets page; fall back to the raw id.
  const resolveTag = React.useCallback(
    (id: string) => {
      const entries = queryClient.getQueriesData<{ items?: Asset[] }>({
        queryKey: queryKeys.assets.all,
      });
      for (const [, data] of entries) {
        const found = data?.items?.find((a) => a.id === id);
        if (found) return found.assetTag;
      }
      return id;
    },
    [queryClient],
  );

  const lookups = React.useMemo(
    () => buildLookups(venuesQuery.data, categoriesQuery.data, usersQuery.data),
    [venuesQuery.data, categoriesQuery.data, usersQuery.data],
  );

  const rows: AssetRow[] = React.useMemo(
    () => (assetsQuery.data?.items ?? []).map((a) => toAssetRow(a, lookups)),
    [assetsQuery.data, lookups],
  );

  const total = assetsQuery.data?.meta?.pagination?.total ?? 0;
  const loading = assetsQuery.isLoading;

  function clearFilters() {
    setSearch("");
    setVenue("");
    setDepartment("");
    setCategory("");
    setStatus("");
    setAwayOnly(false);
  }

  const columns: Column<AssetRow>[] = [
    {
      id: "asset",
      header: "Asset",
      className: "min-w-[220px]",
      skeletonClassName: "w-40",
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground" title={a.name}>
            {a.name}
          </p>
          <p className="truncate text-xs text-text-tertiary tabular-nums">
            {a.assetTag}
            {a.serialNumber ? ` · ${a.serialNumber}` : ""}
          </p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      className: "w-[120px]",
      skeletonClassName: "w-16",
      cell: (a) => (
        <span className="text-text-secondary">{a.categoryName}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      className: "min-w-[200px]",
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
      id: "condition",
      header: "Condition",
      className: "w-[120px]",
      skeletonClassName: "w-16",
      cell: (a) => <ConditionBadge condition={a.condition} />,
    },
    {
      id: "home",
      header: "Home venue",
      className: "min-w-[140px]",
      skeletonClassName: "w-24",
      cell: (a) => (
        <span className="text-text-secondary">{a.homeVenueName}</span>
      ),
    },
    {
      id: "responsible",
      header: "Responsible",
      className: "min-w-[200px]",
      skeletonClassName: "w-32",
      cell: (a) => (
        <ResponsibleCell
          name={a.responsibleName}
          position={a.responsiblePosition}
        />
      ),
    },
    {
      id: "updated",
      header: "Updated",
      align: "right",
      className: "w-[120px]",
      skeletonClassName: "ml-auto w-16",
      cell: (a) => (
        <span
          className="whitespace-nowrap text-text-tertiary tabular-nums"
          title={formatDate(a.updatedAt)}
        >
          {formatRelative(a.updatedAt)}
        </span>
      ),
    },
  ];

  const selectionCount = selectedIds.length;

  const emptyState = (
    <EmptyState
      icon={hasFilters ? SearchX : Boxes}
      title={hasFilters ? "No matching assets" : "No assets yet"}
      description={
        hasFilters
          ? "Try adjusting your search or filters."
          : "Receive your purchased assets to start tracking it across venues."
      }
      action={
        hasFilters ? (
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null
      }
    />
  );

  const errorState = (
    <EmptyState
      icon={AlertTriangle}
      tone="error"
      title="Couldn’t load assets"
      description="There was a problem reaching the server."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => assetsQuery.refetch()}
          disabled={assetsQuery.isFetching}
        >
          <RotateCw className="size-4" />
          Retry
        </Button>
      }
    />
  );

  return (
    <PageContainer wide>
      <div className="space-y-6">
        <PageHeader
          title="Assets"
          subtitle="Every tracked item across all venues."
          actions={
            <Button variant="secondary" asChild>
              <Link href="/scan">
                <ScanLine className="size-4" />
                Scan
              </Link>
            </Button>
          }
        />

        <Toolbar
          selection={
            selectionCount > 0 && canBulk ? (
              <div className="flex w-full flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectionCount} selected
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDialog("transfer")}
                >
                  <ArrowRightLeft className="size-4" />
                  Transfer
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDialog("status")}
                >
                  <RefreshCw className="size-4" />
                  Change status
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDialog("assign")}
                >
                  <UserCog className="size-4" />
                  Reassign custody
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDialog("condition")}
                >
                  <ClipboardCheck className="size-4" />
                  Update condition
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkDialog("print")}
                >
                  <Printer className="size-4" />
                  Print labels
                </Button>
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  <X className="size-4" />
                  Clear
                </Button>
              </div>
            ) : undefined
          }
          left={
            <>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tag, name or serial"
                  className="pl-9"
                  aria-label="Search assets"
                />
              </div>
              <Select
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                aria-label="Filter by venue"
                className="w-full sm:w-auto"
              >
                <option value="">All venues</option>
                {(venuesQuery.data ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </Select>
              <Select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                aria-label="Filter by department"
                className="w-full sm:w-auto"
                disabled={!venue}
                title={!venue ? "Pick a venue first" : undefined}
              >
                <option value="">
                  {venue ? "All departments" : "Pick a venue first"}
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
                className="w-full sm:w-auto"
              >
                <option value="">All categories</option>
                {(categoriesQuery.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Filter by status"
                className="w-full sm:w-auto"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
              <Button
                variant={awayOnly ? "secondary" : "tertiary"}
                size="md"
                onClick={() => setAwayOnly((v) => !v)}
                aria-pressed={awayOnly}
                className={
                  awayOnly
                    ? "border-brand-300 text-brand-700 dark:border-brand-400/50 dark:text-brand-300"
                    : ""
                }
              >
                <PlaneTakeoff className="size-4" />
                Away only
              </Button>
              {hasFilters && (
                <Button variant="link" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </>
          }
          right={
            <div className="hidden items-center text-sm text-text-secondary lg:flex">
              {loading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span>
                  <span className="font-medium text-gray-700 dark:text-gray-200 tabular-nums">
                    {total}
                  </span>{" "}
                  asset{total === 1 ? "" : "s"}
                </span>
              )}
            </div>
          }
        />

        {/* Desktop / tablet: data table */}
        <div className="hidden md:block">
          {assetsQuery.isError ? (
            <Card>{errorState}</Card>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              getRowId={(a) => a.id}
              loading={loading}
              skeletonRows={PAGE_SIZE}
              selectable
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              onRowClick={(a) => router.push(`/assets/${a.id}`)}
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: setPage,
              }}
              empty={emptyState}
            />
          )}
        </div>

        {/* Mobile: stacked cards */}
        <div className="space-y-3 md:hidden">
          {assetsQuery.isError ? (
            <Card>{errorState}</Card>
          ) : loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="mt-1 size-4 rounded-[5px]" />
                  <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-32 rounded-full" />
                    <Skeleton className="h-3 w-28" />
                    <div className="flex items-center gap-2 pt-1">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : rows.length === 0 ? (
            <Card>{emptyState}</Card>
          ) : (
            <>
              {rows.map((a) => (
                <AssetCard
                  key={a.id}
                  asset={a}
                  selected={selectedIds.includes(a.id)}
                  onSelectedChange={(checked) =>
                    setSelectedIds((prev) =>
                      checked
                        ? [...prev, a.id]
                        : prev.filter((id) => id !== a.id),
                    )
                  }
                />
              ))}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-text-secondary">
                  Page <span className="tabular-nums">{page}</span> /{" "}
                  <span className="tabular-nums">
                    {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                  </span>
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= Math.ceil(total / PAGE_SIZE)}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk action dialogs */}
      <BulkTransferDialog
        open={bulkDialog === "transfer"}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        assetIds={selectedIds}
        venues={accessibleVenues}
        resolveTag={resolveTag}
        onDone={() => setSelectedIds([])}
      />
      <BulkChangeStatusDialog
        open={bulkDialog === "status"}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        assetIds={selectedIds}
        resolveTag={resolveTag}
        onDone={() => setSelectedIds([])}
      />
      <BulkAssignDialog
        open={bulkDialog === "assign"}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        assetIds={selectedIds}
        users={usersQuery.data ?? []}
        resolveTag={resolveTag}
        onDone={() => setSelectedIds([])}
      />
      <BulkUpdateConditionDialog
        open={bulkDialog === "condition"}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        assetIds={selectedIds}
        resolveTag={resolveTag}
        onDone={() => setSelectedIds([])}
      />
      <BulkPrintLabelsDialog
        open={bulkDialog === "print"}
        onOpenChange={(o) => !o && setBulkDialog(null)}
        assetIds={selectedIds}
      />
    </PageContainer>
  );
}
