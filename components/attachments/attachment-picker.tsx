"use client";

import * as React from "react";
import {
  UploadCloud,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useUploadAttachment } from "@/lib/api/hooks";
import type { AttachmentErrorCode } from "@/lib/api/errors";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_COUNT = 5;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";

const SERVER_ERROR_COPY: Record<AttachmentErrorCode, string> = {
  not_found: "This file is no longer available. Remove it and re-upload.",
  not_owner: "This attachment belongs to another user.",
  already_linked: "This attachment was already used. Re-upload if needed.",
};

type Base = { key: string; name: string; size: number; type: string };
type Item =
  | (Base & { status: "uploading" })
  | (Base & { status: "done"; id: string })
  | (Base & { status: "error"; message: string });

export function AttachmentPicker({
  onChange,
  serverErrors,
  disabled = false,
}: {
  onChange: (attachmentIds: string[]) => void;
  serverErrors?: Record<string, AttachmentErrorCode>;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<Item[]>([]);
  const upload = useUploadAttachment();

  const doneIds = items
    .filter((i): i is Extract<Item, { status: "done" }> => i.status === "done")
    .map((i) => i.id);
  const idsKey = doneIds.join(",");
  // Report the successful id set upward whenever it changes (keyed on idsKey to
  // avoid re-firing on unrelated re-renders; onChange is an inline parent arrow).
  React.useEffect(() => {
    onChange(idsKey ? idsKey.split(",") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  function patch(key: string, next: Partial<Item>) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? ({ ...i, ...next } as Item) : i)),
    );
  }

  function addFiles(files: FileList | null) {
    if (!files || disabled) return;
    const remaining = MAX_COUNT - items.length;
    if (remaining <= 0) {
      toast.error(`Up to ${MAX_COUNT} files.`);
      return;
    }
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (accepted.length >= remaining) {
        toast.error(`Up to ${MAX_COUNT} files — some were skipped.`);
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: unsupported type. Use JPEG, PNG, WebP or PDF.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: too large (max 10 MB).`);
        continue;
      }
      accepted.push(file);
    }
    for (const file of accepted) {
      const key = crypto.randomUUID();
      setItems((prev) => [
        ...prev,
        { key, name: file.name, size: file.size, type: file.type, status: "uploading" },
      ]);
      upload.mutateAsync(file).then(
        (res) => patch(key, { status: "done", id: res.attachmentId }),
        (err) =>
          patch(key, {
            status: "error",
            message: err instanceof Error ? err.message : "Upload failed.",
          }),
      );
    }
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => {
            const serverErr =
              item.status === "done" ? serverErrors?.[item.id] : undefined;
            const failed = item.status === "error" || Boolean(serverErr);
            const Icon = item.type.startsWith("image/") ? ImageIcon : FileText;
            return (
              <li
                key={item.key}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5",
                  failed
                    ? "border-error-200 bg-error-50 dark:border-error-400/30 dark:bg-error-400/10"
                    : "border-border bg-card",
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-white/6 dark:text-gray-400">
                  {item.status === "uploading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.name}
                  </p>
                  {serverErr ? (
                    <p className="text-xs text-error-600 dark:text-error-400">
                      {SERVER_ERROR_COPY[serverErr]}
                    </p>
                  ) : item.status === "error" ? (
                    <p className="text-xs text-error-600 dark:text-error-400">
                      {item.message}
                    </p>
                  ) : (
                    <p className="text-xs text-text-tertiary">
                      {item.status === "uploading"
                        ? "Uploading…"
                        : formatBytes(item.size)}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="tertiary"
                  size="icon-sm"
                  aria-label={`Remove ${item.name}`}
                  disabled={disabled}
                  onClick={() => remove(item.key)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length < MAX_COUNT && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-secondary transition-colors",
            "hover:border-brand-300 hover:bg-gray-25 dark:hover:bg-white/2",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <UploadCloud className="size-4" />
          Add files ({items.length}/{MAX_COUNT})
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // allow re-selecting the same file after a remove
        }}
      />
    </div>
  );
}
