"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiFetch, unwrap, downloadFile } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  CommitImportRequest,
  ImportJob,
  ImportJobOptions,
  ImportJobStatus,
  ImportPreview,
} from "@/lib/api/types";

const TERMINAL: ImportJobStatus[] = ["completed", "failed", "rolled_back"];

export function isTerminal(status: ImportJobStatus | undefined): boolean {
  return status !== undefined && TERMINAL.includes(status);
}

/** Dry-run upload (multipart). Writes nothing; returns the preview report. */
export function useValidateImport() {
  return useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options?: ImportJobOptions;
    }): Promise<ImportPreview> => {
      const form = new FormData();
      form.append("file", file);
      if (options) form.append("options", JSON.stringify(options));
      const res = await apiFetch("/imports/purchase-orders/validate", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => undefined);
      if (!res.ok) throw toApiError(json, res.status);
      return (json as { data: ImportPreview }).data;
    },
  });
}

/** Commit a validated import. Returns the job (status → importing); poll for progress. */
export function useCommitImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CommitImportRequest) =>
      unwrap(await api.POST("/imports/purchase-orders/commit", { body })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}

/** Poll a job until it reaches a terminal status. */
export function useImportJob(id: string | undefined) {
  return useQuery({
    queryKey: ["imports", id],
    enabled: Boolean(id),
    refetchInterval: (query) =>
      isTerminal((query.state.data as ImportJob | undefined)?.status)
        ? false
        : 1500,
    queryFn: async () =>
      unwrap(await api.GET("/imports/{id}", { params: { path: { id: id! } } }))
        .data,
  });
}

export function downloadImportTemplate() {
  return downloadFile(
    "/imports/purchase-orders/template",
    "purchase-order-import-template.csv",
  );
}

export function downloadImportReport(id: string) {
  return downloadFile(`/imports/${id}/report`, `import-${id}-report.csv`);
}
