"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, PackageSearch, ArrowRight, Lock } from "lucide-react";

import { usePublicAsset } from "@/lib/api/hooks";
import { useAuth } from "@/lib/auth/auth-context";
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

export default function PublicScanPage() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const { status: authStatus } = useAuth();
  const { data, isLoading, isError } = usePublicAsset(qrToken);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 py-8">
      <div className="flex items-center justify-center">
        <Logo />
      </div>

      {isLoading ? (
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
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/6 dark:text-gray-400">
              <PackageSearch className="size-6" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Code not recognized
              </p>
              <p className="text-sm text-text-tertiary">
                This QR code doesn’t match any asset.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PublicAssetCard
          data={data}
          authenticated={authStatus === "authenticated"}
        />
      )}

      <p className="mt-auto text-center text-xs text-text-tertiary">
        Asset tracking by <span className="font-medium text-text-secondary">imp</span>
      </p>
    </main>
  );
}

function PublicAssetCard({
  data,
  authenticated,
}: {
  data: NonNullable<ReturnType<typeof usePublicAsset>["data"]>;
  authenticated: boolean;
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
          <Row label="Home venue" value={data.homeVenueName ?? "—"} />
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
                <div className="flex items-center justify-end gap-2.5">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {person.name}
                    </p>
                    <p className="text-xs text-text-tertiary">{person.position}</p>
                  </div>
                  <Avatar className="size-8 text-xs">
                    {initials(person.name)}
                  </Avatar>
                </div>
              }
            />
          )}
        </dl>

        {authenticated ? (
          <Button className="w-full" asChild>
            <Link href={`/assets/${asset.id}`}>
              Manage in dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-tertiary">
            <Lock className="size-3.5" />
            Read-only public view
          </div>
        )}
      </CardContent>
    </Card>
  );
}
