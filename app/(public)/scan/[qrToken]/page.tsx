"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, PackageSearch, ShieldX, ArrowRight } from "lucide-react";

import { useScanAsset } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import { AuthGate } from "@/components/auth/auth-gate";
import { Logo } from "@/components/layout/logo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, initials } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/assets/status-badge";

const CONDITION_LABEL: Record<string, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default function ScanPage() {
  return (
    <AuthGate>
      <ScanView />
    </AuthGate>
  );
}

function ScanView() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const { data, isLoading, isError, error } = useScanAsset(qrToken);
  const status = error instanceof ApiError ? error.status : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 py-8">
      <div className="flex items-center justify-center">
        <Logo />
      </div>

      {isLoading || status === 401 ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-6 w-40 rounded-full" />
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : status === 403 ? (
        <ErrorState
          icon={<ShieldX className="size-6" />}
          title="You don’t have access to this asset"
          description="Ask an admin or the asset’s venue owner if you need to view it."
        />
      ) : isError || !data ? (
        <ErrorState
          icon={<PackageSearch className="size-6" />}
          title="Code not recognized"
          description="This QR code doesn’t match any asset."
        />
      ) : (
        <ScanAssetCard data={data} />
      )}

      <p className="mt-auto text-center text-xs text-text-tertiary">
        Asset tracking by <span className="font-medium text-text-secondary">imp</span>
      </p>
    </main>
  );
}

function ErrorState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/6 dark:text-gray-400">
          {icon}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-text-tertiary">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScanAssetCard({
  data,
}: {
  data: NonNullable<ReturnType<typeof useScanAsset>["data"]>;
}) {
  const asset = data.asset;
  const away = asset.homeVenueId !== asset.currentVenueId;
  const person = data.responsiblePerson;

  return (
    <Card>
      <CardContent className="space-y-5 p-6 sm:p-6">
        <div className="space-y-2">
          <h1 className="text-title-xl text-foreground">{asset.name}</h1>
          <p className="text-sm text-text-tertiary tabular-nums">
            {asset.assetTag}
            {data.categoryName ? ` · ${data.categoryName}` : ""}
          </p>
          <StatusBadge
            status={asset.status}
            away={away}
            venueName={away ? data.currentVenueName : undefined}
            overdue={asset.isOverdue}
          />
        </div>

        <dl className="divide-y divide-border border-t border-border">
          <Row
            label="Home venue"
            value={
              <span className="inline-flex flex-col items-end">
                <span>{data.homeVenueName ?? "—"}</span>
                {data.departmentName && (
                  <span className="text-xs font-normal text-text-tertiary">
                    {data.departmentName}
                  </span>
                )}
              </span>
            }
          />
          <Row
            label="Current location"
            value={
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-text-tertiary" />
                {data.currentVenueName ?? "—"}
              </span>
            }
          />
          <Row
            label="Condition"
            value={
              <Badge color="gray">
                {CONDITION_LABEL[asset.condition] ?? asset.condition}
              </Badge>
            }
          />
          {person && (
            <Row
              label="Responsible"
              value={
                <div className="flex min-w-0 flex-col items-end gap-2.5">
                  <div className="flex items-center justify-end gap-2.5">
                    <div className="min-w-0 text-right">
                      <p className="truncate text-sm font-medium text-foreground">
                        {person.name}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {person.position}
                      </p>
                    </div>
                    <Avatar className="size-8 shrink-0 text-xs">
                      {initials(person.name)}
                    </Avatar>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <a
                      href={`mailto:${person.email}`}
                      className="max-w-full truncate text-xs font-normal text-primary underline decoration-border underline-offset-2 hover:decoration-current"
                    >
                      {person.email}
                    </a>
                    {person.phone && (
                      <a
                        href={`tel:${person.phone}`}
                        className="text-xs font-normal text-primary underline decoration-border underline-offset-2 hover:decoration-current"
                      >
                        {person.phone}
                      </a>
                    )}
                  </div>
                </div>
              }
            />
          )}
        </dl>

        <Button className="w-full" asChild>
          <Link href={`/assets/${asset.id}`}>
            Manage in dashboard
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
