"use client";

import * as React from "react";
import {
  ShoppingCart,
  Boxes,
  Tags,
  AlertTriangle,
  ArrowLeft,
  PackageCheck,
  MailX,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/layout/stat-card";
import { Section, SectionHeader } from "@/components/layout/section";
import { DataTable, type Column } from "@/components/ui/data-table";
import type {
  ImportConflictPolicy,
  ImportJobOptions,
  ImportPreview,
  ImportPreviewPO,
  ImportRowError,
} from "@/lib/api/types";

export function ReviewStep({
  preview,
  options,
  onOptionsChange,
  onBack,
  onImport,
  importing,
}: {
  preview: ImportPreview;
  options: ImportJobOptions;
  onOptionsChange: (o: ImportJobOptions) => void;
  onBack: () => void;
  onImport: () => void;
  importing: boolean;
}) {
  const pos = preview.posPreview;
  const errors = preview.job.errors ?? [];

  const assetTotal = pos.reduce((sum, p) => sum + p.assetCount, 0);
  const categoryCount = new Set(pos.flatMap((p) => p.categories ?? [])).size;
  const errorCount = errors.length;

  const blockedByErrors = errorCount > 0 && !options.importValidOnly;

  const poColumns: Column<ImportPreviewPO>[] = [
    {
      id: "po",
      header: "PO number",
      className: "min-w-[140px]",
      cell: (p) => (
        <span className="font-medium text-foreground tabular-nums">
          {p.poNumber}
        </span>
      ),
    },
    {
      id: "lines",
      header: "Lines",
      align: "right",
      className: "w-[80px]",
      cell: (p) => <span className="tabular-nums text-text-secondary">{p.lineItems}</span>,
    },
    {
      id: "assets",
      header: "Assets",
      align: "right",
      className: "w-[90px]",
      cell: (p) => <span className="tabular-nums text-text-secondary">{p.assetCount}</span>,
    },
    {
      id: "categories",
      header: "Categories",
      className: "min-w-[160px]",
      cell: (p) => (
        <span className="text-text-secondary">{(p.categories ?? []).join(", ") || "—"}</span>
      ),
    },
    {
      id: "venues",
      header: "Venues",
      className: "min-w-[140px]",
      cell: (p) => (
        <span className="text-text-secondary">{(p.venues ?? []).join(", ") || "—"}</span>
      ),
    },
    {
      id: "conflict",
      header: "",
      align: "right",
      className: "w-[120px]",
      cell: (p) =>
        p.skipExisting ? (
          <Badge color="warning">Exists</Badge>
        ) : (
          <Badge color="success" dot>
            New
          </Badge>
        ),
    },
  ];

  const errorColumns: Column<ImportRowError>[] = [
    {
      id: "row",
      header: "Row",
      className: "w-[80px]",
      cell: (e) => <span className="tabular-nums text-foreground">{e.row}</span>,
    },
    {
      id: "field",
      header: "Field",
      className: "w-[160px]",
      cell: (e) =>
        e.field ? (
          <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
            {e.field}
          </code>
        ) : (
          <span className="text-text-tertiary">—</span>
        ),
    },
    {
      id: "message",
      header: "Message",
      className: "min-w-[240px]",
      cell: (e) => <span className="text-error-700 dark:text-error-300">{e.message}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Purchase orders" value={pos.length} icon={ShoppingCart} tone="brand" />
        <StatCard label="Assets" value={assetTotal} icon={Boxes} tone="info" />
        <StatCard label="Categories" value={categoryCount} icon={Tags} tone="gray" />
        <StatCard
          label="Errors"
          value={errorCount}
          icon={AlertTriangle}
          tone={errorCount > 0 ? "error" : "success"}
        />
      </div>

      {/* No-email reassurance */}
      <div className="flex items-start gap-2.5 rounded-lg border border-info-200 bg-info-50 p-3 text-sm text-info-700 dark:border-info-400/20 dark:bg-info-400/10 dark:text-info-300">
        <MailX className="mt-0.5 size-4 shrink-0" />
        <span>
          No emails will be sent for imported assets — custody notifications are
          suppressed for bulk imports.
        </span>
      </div>

      {/* Options */}
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground">Import options</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="onConflict">When a PO number already exists</Label>
              <Select
                id="onConflict"
                className="w-full"
                value={options.onConflict ?? "error"}
                onChange={(e) =>
                  onOptionsChange({
                    ...options,
                    onConflict: e.target.value as ImportConflictPolicy,
                  })
                }
              >
                <option value="error">Error on conflict (default)</option>
                <option value="skipExisting">Skip existing POs</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>On row errors</Label>
              <label className="flex items-center gap-2.5 rounded-lg border border-input px-3.5 py-2.5">
                <Checkbox
                  checked={options.importValidOnly ?? false}
                  onCheckedChange={(c) =>
                    onOptionsChange({ ...options, importValidOnly: c })
                  }
                />
                <span className="text-sm text-foreground">
                  Import valid rows only (skip errored)
                </span>
              </label>
            </div>
          </div>
          {blockedByErrors && (
            <p className="text-sm text-error-600 dark:text-error-400">
              This file has {errorCount} error{errorCount === 1 ? "" : "s"}. Fix
              them and re-upload, or enable “Import valid rows only” to proceed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Errors table */}
      {errorCount > 0 && (
        <Section>
          <SectionHeader
            title={`Errors (${errorCount})`}
            description="Rows that won't be imported."
          />
          <DataTable
            columns={errorColumns}
            data={errors}
            getRowId={(e) => `${e.row}-${e.field ?? ""}-${e.message}`}
          />
        </Section>
      )}

      {/* PO preview */}
      <Section>
        <SectionHeader
          title="Will be created"
          description="One asset is generated per unit on import."
        />
        <DataTable columns={poColumns} data={pos} getRowId={(p) => p.poNumber} />
      </Section>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={onBack} disabled={importing}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={onImport} disabled={blockedByErrors || importing}>
          <PackageCheck className="size-4" />
          {importing ? "Starting…" : "Import"}
        </Button>
      </div>
    </div>
  );
}
