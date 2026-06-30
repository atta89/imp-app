"use client";

import * as React from "react";
import { UploadCloud, FileSpreadsheet, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Dropzone({
  accept = ".csv,.xlsx",
  maxSizeBytes,
  value,
  onChange,
  disabled = false,
  className,
}: {
  accept?: string;
  maxSizeBytes?: number;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const exts = accept.split(",").map((s) => s.trim().toLowerCase());

  function validate(file: File): string | null {
    if (!exts.some((e) => file.name.toLowerCase().endsWith(e)))
      return `Unsupported file. Allowed: ${accept}`;
    if (maxSizeBytes && file.size > maxSizeBytes)
      return `File is too large (max ${formatBytes(maxSizeBytes)}).`;
    return null;
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(undefined);
    onChange(file);
  }

  if (value) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-400/15 dark:text-brand-400">
            <FileSpreadsheet className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {value.name}
            </p>
            <p className="text-xs text-text-tertiary">{formatBytes(value.size)}</p>
          </div>
          {!disabled && (
            <Button
              variant="tertiary"
              size="icon-sm"
              aria-label="Remove file"
              onClick={() => {
                onChange(null);
                setError(undefined);
              }}
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging
            ? "border-brand-400 bg-brand-50 dark:bg-brand-400/10"
            : "border-border hover:border-brand-300 hover:bg-gray-25 dark:hover:bg-white/[0.02]",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/6 dark:text-gray-400">
          <UploadCloud className="size-6" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            <span className="text-brand">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-text-tertiary">
            {accept.replace(/\./g, "").toUpperCase()}
            {maxSizeBytes ? ` · up to ${formatBytes(maxSizeBytes)}` : ""}
          </p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && (
        <p className="mt-2 text-sm text-error-600 dark:text-error-400">{error}</p>
      )}
    </div>
  );
}
