"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, apiFetch } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  AssetIdsResult,
  BulkActionResponse,
  BulkAssignRequest,
  BulkAssignResponse,
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
 * Outcome of enqueuing a mutating bulk action. The four mutating endpoints
 * branch on HTTP status: 202 → a job was enqueued (poll it); 200 → strict
 * per-row validation failed, NOTHING was enqueued and per-row diagnostics come
 * back inline (today's shape). See openapi `POST /assets/bulk/*` + PRD v0.9.
 */
export type BulkEnqueueOutcome<Diag> =
  | { kind: "job"; job: BulkJob }
  | { kind: "diagnostics"; diagnostics: Diag };

type Envelope = { data: unknown };

/**
 * Shared enqueue caller. The generated schema only types the 202 response, so
 * we read the raw status off `response` and cast the envelope accordingly.
 * `hasDiag` is false for endpoints that can only 202 (condition/qr).
 */
async function enqueue<Diag>(
  result: {
    data?: { data: BulkJob } | undefined;
    error?: unknown;
    response: Response;
  },
): Promise<BulkEnqueueOutcome<Diag>> {
  const { response } = result;
  if (result.error !== undefined || !response.ok || result.data === undefined) {
    throw toApiError(result.error, response.status);
  }
  const envelope = result.data as Envelope;
  if (response.status === 200) {
    return { kind: "diagnostics", diagnostics: envelope.data as Diag };
  }
  return { kind: "job", job: envelope.data as BulkJob };
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

/** Enqueue a bulk transfer. 202 → job; 200 → strict per-row diagnostics. */
export function useBulkTransfer() {
  return useMutation({
    mutationFn: async (body: BulkTransferRequest) =>
      enqueue<BulkActionResponse>(
        await api.POST("/assets/bulk/transfer", { body }),
      ),
  });
}

/** Enqueue a bulk status change. 202 → job; 200 → strict per-row diagnostics. */
export function useBulkChangeStatus() {
  return useMutation({
    mutationFn: async (body: BulkStatusRequest) =>
      enqueue<BulkActionResponse>(
        await api.POST("/assets/bulk/status", { body }),
      ),
  });
}

/** Enqueue a bulk custody reassignment. 202 → job; 200 → strict diagnostics. */
export function useBulkAssign() {
  return useMutation({
    mutationFn: async (body: BulkAssignRequest) =>
      enqueue<BulkAssignResponse>(
        await api.POST("/assets/bulk/assign", { body }),
      ),
  });
}

/** Enqueue a bulk condition change. Best-effort: always 202 (never diagnostics). */
export function useBulkUpdateCondition() {
  return useMutation({
    mutationFn: async (body: BulkConditionUpdate): Promise<BulkJob> => {
      const out = await enqueue<never>(
        await api.POST("/assets/condition/bulk", { body }),
      );
      // condition can only 202; narrow for callers.
      if (out.kind !== "job") throw toApiError(undefined, 500);
      return out.job;
    },
  });
}

/** Enqueue a bulk QR-label render job. Always 202; PDF fetched via /result. */
export function useBulkQrJob() {
  return useMutation({
    mutationFn: async (body: BulkQrRequest): Promise<BulkJob> => {
      const out = await enqueue<never>(
        await api.POST("/assets/qr/bulk", { body }),
      );
      if (out.kind !== "job") throw toApiError(undefined, 500);
      return out.job;
    },
  });
}

/**
 * Enqueue an async asset-id export job. Unlike the mutating bulk endpoints this
 * only ever 202s (no 200 diagnostics branch), so we unwrap the job directly.
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
