"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AssetIdsResult,
  BulkAssignRequest,
  BulkConditionUpdate,
  BulkIdsRequest,
  BulkJob,
  BulkJobList,
  BulkJobStatus,
  BulkJobType,
  BulkQrRequest,
  BulkStatusRequest,
  BulkTransferRequest,
} from "@/lib/api/types";

// A bulk job stops advancing once it reaches one of these; polling halts here.
const TERMINAL: BulkJobStatus[] = ["completed", "completed_with_errors", "failed"];

export function isBulkJobTerminal(status: BulkJobStatus | undefined): boolean {
  return status !== undefined && TERMINAL.includes(status);
}

/**
 * Invalidate everything a completed bulk job may have changed. Call once when a
 * job reaches a terminal status (rows are applied progressively server-side, so
 * enqueue-time invalidation would be premature).
 */
export function useInvalidateAfterBulkJob() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: queryKeys.assets.all });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  }, [qc]);
}

/**
 * Enqueue a bulk transfer. Always 202 → a job; poll it for progress. Per-asset
 * problems (not found, out of venue scope, same-venue no-op) become skips on the
 * job, never inline failures; only request-level errors throw synchronously.
 */
export function useBulkTransfer() {
  return useMutation({
    mutationFn: async (body: BulkTransferRequest): Promise<BulkJob> =>
      unwrapJob(await api.POST("/assets/bulk/transfer", { body })),
  });
}

/**
 * Enqueue a bulk status change. Always 202 → a job; poll it. No-op/forbidden
 * rows are counted as skips on the job; only request-level errors throw.
 */
export function useBulkChangeStatus() {
  return useMutation({
    mutationFn: async (body: BulkStatusRequest): Promise<BulkJob> =>
      unwrapJob(await api.POST("/assets/bulk/status", { body })),
  });
}

/**
 * Enqueue a bulk custody reassignment. Always 202 → a job; poll it. Already-
 * assigned/forbidden rows are counted as skips on the job; only request-level
 * errors (unknown/inactive user, empty/over-cap batch) throw synchronously.
 */
export function useBulkAssign() {
  return useMutation({
    mutationFn: async (body: BulkAssignRequest): Promise<BulkJob> =>
      unwrapJob(await api.POST("/assets/bulk/assign", { body })),
  });
}

/** Enqueue a bulk condition change. Always 202; unchanged rows are skipped. */
export function useBulkUpdateCondition() {
  return useMutation({
    mutationFn: async (body: BulkConditionUpdate): Promise<BulkJob> =>
      unwrapJob(await api.POST("/assets/condition/bulk", { body })),
  });
}

/** Enqueue a bulk QR-label render job. Always 202; PDF fetched via /result. */
export function useBulkQrJob() {
  return useMutation({
    mutationFn: async (body: BulkQrRequest): Promise<BulkJob> =>
      unwrapJob(await api.POST("/assets/qr/bulk", { body })),
  });
}

/**
 * Enqueue an async asset-id export job. Like every bulk endpoint it 202s with a
 * job, so we unwrap it directly.
 */
export function useBulkIdsJob() {
  return useMutation({
    mutationFn: async (body: BulkIdsRequest): Promise<BulkJob> =>
      unwrapJob(await api.POST("/assets/bulk/ids", { body })),
  });
}

/** Poll a single bulk job until it reaches a terminal status. */
export function useBulkJob(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.bulkJobs.detail(id) : queryKeys.bulkJobs.all,
    enabled: Boolean(id),
    refetchInterval: (query) =>
      isBulkJobTerminal((query.state.data as BulkJob | undefined)?.status)
        ? false
        : 1500,
    queryFn: async () =>
      unwrapJob(
        await api.GET("/assets/bulk/jobs/{jobId}", {
          params: { path: { jobId: id! } },
        }),
      ),
  });
}

/** Admin-only list of bulk jobs, filtered by optional status/type. */
export function useBulkJobList(
  filters: { status?: BulkJobStatus; type?: BulkJobType } = {},
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.bulkJobs.list(filters.status, filters.type),
    enabled,
    queryFn: async (): Promise<BulkJobList> => {
      const res = await api.GET("/assets/bulk/jobs", {
        params: {
          query: {
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.type ? { type: filters.type } : {}),
          },
        },
      });
      if (res.error !== undefined || !res.response.ok || res.data === undefined) {
        throw toApiError(res.error, res.response.status);
      }
      return res.data.data as BulkJobList;
    },
  });
}

function unwrapJob(result: {
  data?: { data: BulkJob } | undefined;
  error?: unknown;
  response: Response;
}): BulkJob {
  if (
    result.error !== undefined ||
    !result.response.ok ||
    result.data === undefined
  ) {
    throw toApiError(result.error, result.response.status);
  }
  return result.data.data;
}

/**
 * Result of trying to fetch a completed QR job's PDF.
 * - `ok`: the download was triggered.
 * - `not_ready`: 404 — the render isn't available yet; keep polling.
 * - `expired`: 410 — past the retention window; the job must be re-run.
 */
export type BulkJobResultOutcome = "ok" | "not_ready" | "expired";

/**
 * Fetch the rendered QR PDF for a completed job and trigger a browser download.
 * Handles the two soft states the endpoint can return (404 not-ready, 410 gone)
 * without throwing so callers can react in the UI; other failures throw.
 */
export async function downloadBulkJobResult(
  jobId: string,
): Promise<BulkJobResultOutcome> {
  const res = await apiFetch(`/assets/bulk/jobs/${jobId}/result`);
  if (res.status === 404) return "not_ready";
  if (res.status === 410) return "expired";
  if (!res.ok) {
    throw toApiError(await res.json().catch(() => undefined), res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `asset-labels-${jobId}.pdf`;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
  return "ok";
}

/**
 * Fetch the completed JSON artifact for an `ids` export job. Mirrors
 * {@link downloadBulkJobResult}'s soft-state handling — 404 (not ready yet) and
 * 410 (past the retention window) come back as states rather than throwing so
 * callers can react in the UI; other failures throw a normalized ApiError.
 */
export async function fetchBulkJobIdsResult(
  jobId: string,
): Promise<AssetIdsResult | { state: "not_ready" | "expired" }> {
  const res = await apiFetch(`/assets/bulk/jobs/${jobId}/result`);
  if (res.status === 404) return { state: "not_ready" };
  if (res.status === 410) return { state: "expired" };
  if (!res.ok) {
    throw toApiError(await res.json().catch(() => undefined), res.status);
  }
  return (await res.json()) as AssetIdsResult;
}
