"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MapPin,
  History,
  MoreHorizontal,
  AlertTriangle,
  RotateCw,
  PackageSearch,
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
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/assets/status-badge";
import { ConditionBadge } from "@/components/assets/condition-badge";
import { ResponsibleCell } from "@/components/assets/responsible-cell";
import { HistoryTimeline } from "@/components/assets/history-timeline";
import { QrLabel } from "@/components/assets/qr-label";
import {
  ChangeStatusDialog,
  TransferDialog,
  AssignDialog,
  SendToRepairDialog,
  UpdateConditionDialog,
} from "@/components/assets/action-dialogs";
import { ChangeHomeDialog } from "@/components/assets/change-home-dialog";
import { assetActions, type AssetAction } from "@/lib/assets/transitions";
import { buildLookups, toAssetRow } from "@/lib/assets/view";
import { ApiError } from "@/lib/api/errors";
import {
  useAsset,
  useAssetHistory,
  useVenues,
  useCategories,
  useUsers,
  useAssetDepartments,
} from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-context";
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

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { user } = useAuth();
  const assetQuery = useAsset(id);
  const historyQuery = useAssetHistory(id);
  const venuesQuery = useVenues();
  const categoriesQuery = useCategories();
  const usersQuery = useUsers();
  const departmentsQuery = useAssetDepartments(assetQuery.data?.homeVenueId);

  const lookups = React.useMemo(
    () =>
      buildLookups(
        venuesQuery.data,
        categoriesQuery.data,
        usersQuery.data,
        departmentsQuery.data,
      ),
    [
      venuesQuery.data,
      categoriesQuery.data,
      usersQuery.data,
      departmentsQuery.data,
    ],
  );

  const [active, setActive] = React.useState<AssetAction | null>(null);

  const asset = assetQuery.data;
  const notFound =
    assetQuery.error instanceof ApiError && assetQuery.error.status === 404;

  // ── Loading / error / not-found ───────────────────────────────────────────
  if (assetQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-72 lg:col-span-2" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (notFound || (!asset && !assetQuery.isError)) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={PackageSearch}
            title="Asset not found"
            description="This asset doesn’t exist or may have been removed."
            action={
              <Button variant="secondary" size="sm" asChild>
                <Link href="/assets">Back to assets</Link>
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  if (assetQuery.isError || !asset) {
    return (
      <PageContainer>
        <Card>
          <EmptyState
            icon={AlertTriangle}
            tone="error"
            title="Couldn’t load this asset"
            description="There was a problem reaching the server."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => assetQuery.refetch()}
                disabled={assetQuery.isFetching}
              >
                <RotateCw className="size-4" />
                Retry
              </Button>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  const row = toAssetRow(asset, lookups);
  const category = lookups.categories.get(asset.categoryId);
  const customFields = category?.customFields ?? [];

  // Role/venue scope: admins see everything; others need the asset's home or
  // current venue in their scope. The backend is the real enforcer — this
  // just hides actions we know will be rejected.
  const inScope =
    user?.role === "admin" ||
    Boolean(
      user?.venueIds?.includes(asset.homeVenueId) ||
        user?.venueIds?.includes(asset.currentVenueId),
    );
  const actions = assetActions(asset.status).filter(() => inScope);
  const headerActions = actions.filter((a) => !a.overflow);
  const overflowActions = actions.filter((a) => a.overflow);

  function buttonVariant(tone?: AssetAction["tone"]) {
    if (tone === "primary") return "primary" as const;
    if (tone === "destructive") return "destructive" as const;
    return "secondary" as const;
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <PageHeader
          backHref="/assets"
          backLabel="Assets"
          title={asset.name}
          subtitle={`${asset.assetTag}${asset.serialNumber ? ` · ${asset.serialNumber}` : ""}`}
          actions={
            <>
              {headerActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Button
                    key={a.id}
                    variant={buttonVariant(a.tone)}
                    onClick={() => setActive(a)}
                  >
                    <Icon className="size-4" />
                    {a.label}
                  </Button>
                );
              })}
              {overflowActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" aria-label="More actions">
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {overflowActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <DropdownMenuItem
                          key={a.id}
                          destructive={a.tone === "destructive"}
                          onSelect={() => setActive(a)}
                        >
                          <Icon />
                          {a.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: details + specs + history */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle>Details</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={asset.status}
                      away={row.away}
                      venueName={row.away ? row.currentVenueName : undefined}
                      overdue={asset.isOverdue}
                    />
                    <ConditionBadge condition={asset.condition} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border">
                  <DetailRow label="Category" value={row.categoryName} />
                  <DetailRow label="Home venue" value={row.homeVenueName} />
                  <DetailRow
                    label="Home department"
                    value={
                      row.departmentName ?? (
                        <span className="text-text-tertiary">—</span>
                      )
                    }
                  />
                  <DetailRow
                    label="Current location"
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-text-tertiary" />
                        {row.currentVenueName}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Condition"
                    value={<ConditionBadge condition={asset.condition} />}
                  />
                  <DetailRow
                    label="Responsible"
                    value={
                      <ResponsibleCell
                        name={row.responsibleName}
                        position={row.responsiblePosition}
                      />
                    }
                  />
                  {asset.purchaseDate && (
                    <DetailRow
                      label="Purchase date"
                      value={formatDate(asset.purchaseDate)}
                    />
                  )}
                  {asset.expectedReturnDate && (
                    <DetailRow
                      label="Expected return"
                      value={
                        <span
                          className={
                            asset.isOverdue ? "text-error-600 dark:text-error-400" : undefined
                          }
                        >
                          {formatDate(asset.expectedReturnDate)}
                        </span>
                      }
                    />
                  )}
                  <DetailRow label="Last updated" value={formatDate(asset.updatedAt)} />
                </dl>
              </CardContent>
            </Card>

            {/* Custom specs */}
            {customFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-border">
                    {customFields.map((field) => {
                      const value = (asset.specs as Record<string, unknown>)?.[
                        field.key
                      ];
                      return (
                        <DetailRow
                          key={field.key}
                          label={field.label}
                          value={
                            value === undefined || value === "" ? (
                              <span className="text-text-tertiary">—</span>
                            ) : (
                              String(value)
                            )
                          }
                        />
                      );
                    })}
                  </dl>
                </CardContent>
              </Card>
            )}

            <Section>
              <SectionHeader
                title="History"
                description="Movements, status, custody and repair events."
              />
              <Card>
                <CardContent className="p-5 sm:p-6">
                  {historyQuery.isLoading ? (
                    <div className="space-y-6">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (historyQuery.data?.length ?? 0) === 0 ? (
                    <EmptyState
                      icon={History}
                      title="No history yet"
                      description="Movements and changes will appear here."
                    />
                  ) : (
                    <HistoryTimeline
                      movements={historyQuery.data ?? []}
                      lookups={lookups}
                    />
                  )}
                </CardContent>
              </Card>
            </Section>
          </div>

          {/* Right: QR (wired in step 7) */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>QR label</CardTitle>
                <CardDescription>
                  Scan to open this asset&apos;s public page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <QrLabel
                  assetId={id}
                  assetTag={asset.assetTag}
                  assetName={asset.name}
                />
                <Button variant="link" size="sm" className="w-full" asChild>
                  <Link href={`/scan/${asset.qrToken}`} target="_blank">
                    Open public view
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Action dialogs */}
      <ChangeStatusDialog
        assetId={id}
        open={active?.type === "status"}
        onOpenChange={(o) => !o && setActive(null)}
        targetStatus={active?.targetStatus ?? "available"}
        title={active?.label ?? "Change status"}
      />
      <TransferDialog
        assetId={id}
        open={active?.type === "transfer"}
        onOpenChange={(o) => !o && setActive(null)}
        venues={venuesQuery.data ?? []}
        currentVenueId={asset.currentVenueId}
      />
      <AssignDialog
        assetId={id}
        open={active?.type === "assign"}
        onOpenChange={(o) => !o && setActive(null)}
        users={usersQuery.data ?? []}
      />
      <SendToRepairDialog
        assetId={id}
        open={active?.type === "repair"}
        onOpenChange={(o) => !o && setActive(null)}
      />
      <UpdateConditionDialog
        assetId={id}
        open={active?.type === "condition"}
        onOpenChange={(o) => !o && setActive(null)}
        currentCondition={asset.condition}
      />
      <ChangeHomeDialog
        assetId={id}
        open={active?.type === "home"}
        onOpenChange={(o) => !o && setActive(null)}
        venues={venuesQuery.data ?? []}
        currentHomeVenueId={asset.homeVenueId}
        currentDepartmentId={asset.departmentId}
      />
    </PageContainer>
  );
}
