"use client";

import * as React from "react";
import { Download, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { errorMessage } from "@/lib/api/errors";
import { downloadImportTemplate } from "@/lib/api/import-hooks";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const OPTIONAL_COLUMNS: { col: string; fallback: string }[] = [
  { col: "assetTag", fallback: "auto-generated tag" },
  { col: "status", fallback: "available" },
  { col: "currentVenueCode", fallback: "home venue" },
  { col: "condition", fallback: "good" },
  { col: "responsibleUserEmail", fallback: "the PO owner" },
  { col: "departmentCode", fallback: "no department" },
];

export function UploadStep({
  file,
  onFileChange,
  onValidate,
  validating,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onValidate: () => void;
  validating: boolean;
}) {
  const [downloading, setDownloading] = React.useState(false);

  async function handleTemplate() {
    setDownloading(true);
    try {
      await downloadImportTemplate();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h2 className="text-title-lg text-foreground">Upload a file</h2>
            <p className="text-sm text-text-secondary">
              CSV or XLSX of purchase orders and their line items.
            </p>
          </div>
          <Button variant="secondary" onClick={handleTemplate} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Preparing…" : "Download template"}
          </Button>
        </div>

        <Dropzone
          accept=".csv,.xlsx"
          maxSizeBytes={MAX_SIZE}
          value={file}
          onChange={onFileChange}
          disabled={validating}
        />

        <div className="rounded-lg border border-border bg-gray-25 p-4 dark:bg-white/[0.02]">
          <p className="text-sm font-medium text-foreground">Optional columns</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Leave these blank and they default automatically:
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {OPTIONAL_COLUMNS.map((c) => (
              <li key={c.col} className="text-sm text-text-secondary">
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  {c.col}
                </code>{" "}
                → {c.fallback}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <Button onClick={onValidate} disabled={!file || validating}>
            {validating ? "Validating…" : "Validate"}
            {!validating && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
