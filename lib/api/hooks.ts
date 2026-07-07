"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { api, apiFetch, unwrap } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { queryKeys, type AssetFilters } from "@/lib/api/query-keys";
import type { components } from "@/lib/api/schema";
import type {
  AssignCustodyRequest,
  ConditionUpdate,
  StatusChangeRequest,
  TransferAssetRequest,
} from "@/lib/api/types";

// ── Reads ───────────────────────────────────────────────────────────────────

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: async () => unwrap(await api.GET("/dashboard/summary")).data,
  });
}

export function useAssets(filters: AssetFilters = {}) {
  return useQuery({
    queryKey: queryKeys.assets.list(filters),
    queryFn: async () => {
      // Drop empty filter values so the cache key stays stable and clean.
      const query = Object.fromEntries(
        Object.entries(filters).filter(
          ([, v]) => v !== undefined && v !== "" && v !== false,
        ),
      ) as AssetFilters;
      const env = unwrap(await api.GET("/assets", { params: { query } }));
      return { items: env.data ?? [], meta: env.meta };
    },
    placeholderData: (prev) => prev, // keep page visible while refetching
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Authenticated QR-label PNG, resolved to a data URL (the endpoint needs a bearer). */
export function useAssetQr(id: string) {
  return useQuery({
    queryKey: ["assets", "qr", id],
    enabled: Boolean(id),
    staleTime: Infinity,
    queryFn: async () => {
      const blob = unwrap(
        await api.GET("/assets/{id}/qr", {
          params: { path: { id } },
          parseAs: "blob",
        }),
      );
      return blobToDataUrl(blob as Blob);
    },
  });
}

/** PUBLIC scan resolution (no auth required); contact details are masked server-side. */
export function usePublicAsset(qrToken: string) {
  return useQuery({
    queryKey: ["scan", qrToken],
    enabled: Boolean(qrToken),
    retry: false,
    queryFn: async () =>
      unwrap(await api.GET("/scan/{qrToken}", { params: { path: { qrToken } } }))
        .data,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: queryKeys.assets.detail(id),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap(await api.GET("/assets/{id}", { params: { path: { id } } })).data,
  });
}

export function useAssetHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.assets.history(id),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap(await api.GET("/assets/{id}/history", { params: { path: { id } } }))
        .data ?? [],
  });
}

export function useVenues() {
  return useQuery({
    queryKey: queryKeys.venues.all,
    queryFn: async () => unwrap(await api.GET("/venues")).data ?? [],
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async () => unwrap(await api.GET("/categories")).data ?? [],
  });
}

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => unwrap(await api.GET("/users")).data ?? [],
  });
}

// ── Mutations (invalidate detail + lists + dashboard on success) ─────────────

function useAssetMutationInvalidation(id: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.assets.detail(id) });
    qc.invalidateQueries({ queryKey: queryKeys.assets.history(id) });
    qc.invalidateQueries({ queryKey: queryKeys.assets.all });
    qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
  };
}

export function useTransferAsset(id: string) {
  const invalidate = useAssetMutationInvalidation(id);
  return useMutation({
    mutationFn: async (body: TransferAssetRequest) =>
      unwrap(
        await api.POST("/assets/{id}/transfer", {
          params: { path: { id } },
          body,
        }),
      ).data,
    onSuccess: invalidate,
  });
}

export function useChangeAssetStatus(id: string) {
  const invalidate = useAssetMutationInvalidation(id);
  return useMutation({
    mutationFn: async (body: StatusChangeRequest) =>
      unwrap(
        await api.POST("/assets/{id}/status", { params: { path: { id } }, body }),
      ).data,
    onSuccess: invalidate,
  });
}

export function useAssignCustody(id: string) {
  const invalidate = useAssetMutationInvalidation(id);
  return useMutation({
    mutationFn: async (body: AssignCustodyRequest) =>
      unwrap(
        await api.POST("/assets/{id}/assign", { params: { path: { id } }, body }),
      ).data,
    onSuccess: invalidate,
  });
}

export function useUpdateAssetCondition(id: string) {
  const invalidate = useAssetMutationInvalidation(id);
  return useMutation({
    mutationFn: async (body: ConditionUpdate) =>
      unwrap(
        await api.POST("/assets/{id}/condition", {
          params: { path: { id } },
          body,
        }),
      ).data,
    onSuccess: invalidate,
  });
}

// ── Users CRUD ───────────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["CreateUserRequest"]) =>
      unwrap(await api.POST("/users", { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["UpdateUserRequest"]) =>
      unwrap(await api.PUT("/users/{id}", { params: { path: { id } }, body }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.DELETE("/users/{id}", { params: { path: { id } } });
      if (res.error || !res.response.ok)
        throw toApiError(res.error, res.response.status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

// ── Notification preferences ─────────────────────────────────────────────────

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: async () =>
      unwrap(await api.GET("/me/notification-preferences")).data,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notifyByEmail: boolean) =>
      unwrap(
        await api.PUT("/me/notification-preferences", {
          body: { notifyByEmail },
        }),
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences }),
  });
}

/**
 * Change the current user's password. The endpoint's 401 means "wrong current
 * password" (a domain error), so we bypass the global refresh-and-replay and
 * surface it as a field error. Resolves on 204; throws a normalized ApiError.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: { current: string; next: string }) => {
      const res = await apiFetch(
        "/me/password",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
        { retryOn401: false },
      );
      if (res.status === 204) return;
      const json = await res.json().catch(() => undefined);
      throw toApiError(json, res.status);
    },
  });
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function useInventoryByVenue() {
  return useQuery({
    queryKey: queryKeys.reports.inventoryByVenue,
    queryFn: async () =>
      unwrap(await api.GET("/reports/inventory-by-venue")).data ?? [],
  });
}

export function useAssetsAwayReport() {
  return useQuery({
    queryKey: queryKeys.reports.assetsAway,
    queryFn: async () => unwrap(await api.GET("/reports/assets-away")).data ?? [],
  });
}

export function useAssetsOverdueReport() {
  return useQuery({
    queryKey: queryKeys.reports.assetsOverdue,
    queryFn: async () =>
      unwrap(await api.GET("/reports/assets-overdue")).data ?? [],
  });
}

export function useInRepairReport() {
  return useQuery({
    queryKey: queryKeys.reports.inRepair,
    queryFn: async () => unwrap(await api.GET("/reports/in-repair")).data ?? [],
  });
}

export function useByResponsibleReport() {
  return useQuery({
    queryKey: queryKeys.reports.byResponsible,
    queryFn: async () =>
      unwrap(await api.GET("/reports/by-responsible")).data ?? [],
  });
}

/**
 * Per-department asset counts. `venueId` is required for non-admins; the
 * server returns 400 without it. Callers pass `enabled={Boolean(venueId)}`
 * when they can't know the caller's role at fire time.
 */
export function useReportByDepartment(
  venueId?: string,
  opts: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: queryKeys.reports.byDepartment(venueId),
    enabled: opts.enabled ?? true,
    queryFn: async () =>
      unwrap(
        await api.GET("/reports/by-department", {
          params: { query: venueId ? { venue: venueId } : {} },
        }),
      ).data ?? [],
  });
}

// ── Purchase orders ──────────────────────────────────────────────────────────

export function usePurchaseOrders(status?: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(status),
    queryFn: async () => {
      const env = unwrap(
        await api.GET("/purchase-orders", {
          params: {
            query: status
              ? { status: status as components["schemas"]["PurchaseOrderStatus"] }
              : {},
          },
        }),
      );
      return env.data ?? [];
    },
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap(
        await api.GET("/purchase-orders/{id}", { params: { path: { id } } }),
      ).data,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: components["schemas"]["CreatePurchaseOrderRequest"],
    ) => unwrap(await api.POST("/purchase-orders", { body })).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all }),
  });
}

export function useReceivePurchaseOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: components["schemas"]["ReceivePurchaseOrderRequest"],
    ) =>
      unwrap(
        await api.POST("/purchase-orders/{id}/receive", {
          params: { path: { id } },
          body,
        }),
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
      qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}

// ── Repairs ──────────────────────────────────────────────────────────────────

export function useRepairs(status?: string) {
  return useQuery({
    queryKey: queryKeys.repairs.list(status),
    queryFn: async () => {
      const env = unwrap(
        await api.GET("/repairs", {
          params: {
            query: status
              ? { status: status as components["schemas"]["RepairStatus"] }
              : {},
          },
        }),
      );
      return env.data ?? [];
    },
  });
}

export function useRepair(id: string) {
  return useQuery({
    queryKey: queryKeys.repairs.detail(id),
    enabled: Boolean(id),
    queryFn: async () =>
      unwrap(await api.GET("/repairs/{id}", { params: { path: { id } } })).data,
  });
}

export function useUpdateRepair(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["UpdateRepairRequest"]) =>
      unwrap(await api.PUT("/repairs/{id}", { params: { path: { id } }, body }))
        .data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repairs.all });
      qc.invalidateQueries({ queryKey: queryKeys.repairs.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}

// ── Bulk asset actions ───────────────────────────────────────────────────────
// All three always return 200 with per-row results; a 400 means a batch-level
// problem (e.g. > 500 assets) and throws a normalized ApiError.

export function useBulkTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["BulkTransferRequest"]) => {
      const env = unwrap(await api.POST("/assets/bulk/transfer", { body }));
      if (!env.data) throw toApiError(undefined, 500);
      return env.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}

export function useBulkChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["BulkStatusRequest"]) => {
      const env = unwrap(await api.POST("/assets/bulk/status", { body }));
      if (!env.data) throw toApiError(undefined, 500);
      return env.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}

export function useBulkUpdateCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: components["schemas"]["BulkConditionUpdate"],
    ) => {
      const env = unwrap(
        await api.POST("/assets/condition/bulk", { body }),
      );
      if (!env.data) throw toApiError(undefined, 500);
      return env.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.assets.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.summary });
    },
  });
}

/** Combined PDF of QR labels for the batch. Returns the blob; caller downloads it. */
export function useBulkQrPdf() {
  return useMutation({
    mutationFn: async (body: components["schemas"]["BulkQrRequest"]) =>
      unwrap(
        await api.POST("/assets/qr/bulk", { body, parseAs: "blob" }),
      ) as Blob,
  });
}

// ── Departments (venue-scoped) ───────────────────────────────────────────────

export function useDepartments(venueId: string) {
  return useQuery({
    queryKey: queryKeys.departments.list(venueId),
    enabled: Boolean(venueId),
    queryFn: async () =>
      unwrap(
        await api.GET("/venues/{venueId}/departments", {
          params: { path: { venueId } },
        }),
      ).data ?? [],
  });
}

/**
 * Convenience wrapper for asset forms that pick a home department: when the
 * asset has no home venue selected yet, we don't fire a request and return
 * a stable empty array shape from the outer components.
 */
export function useAssetDepartments(homeVenueId?: string) {
  return useDepartments(homeVenueId ?? "");
}

export function useDepartment(venueId: string, id: string) {
  return useQuery({
    queryKey: queryKeys.departments.detail(venueId, id),
    enabled: Boolean(venueId) && Boolean(id),
    queryFn: async () =>
      unwrap(
        await api.GET("/venues/{venueId}/departments/{id}", {
          params: { path: { venueId, id } },
        }),
      ).data,
  });
}

export function useCreateDepartment(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["CreateDepartmentRequest"]) =>
      unwrap(
        await api.POST("/venues/{venueId}/departments", {
          params: { path: { venueId } },
          body,
        }),
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.departments.all(venueId) }),
  });
}

export function useUpdateDepartment(venueId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["UpdateDepartmentRequest"]) =>
      unwrap(
        await api.PUT("/venues/{venueId}/departments/{id}", {
          params: { path: { venueId, id } },
          body,
        }),
      ).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.departments.all(venueId) }),
  });
}

export function useDeleteDepartment(venueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.DELETE("/venues/{venueId}/departments/{id}", {
        params: { path: { venueId, id } },
      });
      if (res.error || !res.response.ok)
        throw toApiError(res.error, res.response.status);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.departments.all(venueId) }),
  });
}

// ── Venues CRUD ──────────────────────────────────────────────────────────────

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["CreateVenueRequest"]) =>
      unwrap(await api.POST("/venues", { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.venues.all }),
  });
}

export function useUpdateVenue(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["UpdateVenueRequest"]) =>
      unwrap(await api.PUT("/venues/{id}", { params: { path: { id } }, body }))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.venues.all }),
  });
}

export function useDeleteVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.DELETE("/venues/{id}", { params: { path: { id } } });
      if (res.error || !res.response.ok)
        throw toApiError(res.error, res.response.status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.venues.all }),
  });
}

// ── Categories CRUD ──────────────────────────────────────────────────────────

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["CreateCategoryRequest"]) =>
      unwrap(await api.POST("/categories", { body })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: components["schemas"]["UpdateCategoryRequest"]) =>
      unwrap(
        await api.PUT("/categories/{id}", { params: { path: { id } }, body }),
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.DELETE("/categories/{id}", {
        params: { path: { id } },
      });
      if (res.error || !res.response.ok)
        throw toApiError(res.error, res.response.status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories.all }),
  });
}

/** Send an asset to repair: opens a ticket and flips status to in_repair server-side. */
export function useCreateRepair(assetId: string) {
  const invalidate = useAssetMutationInvalidation(assetId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      body: Omit<components["schemas"]["CreateRepairRequest"], "assetId">,
    ) =>
      unwrap(await api.POST("/repairs", { body: { ...body, assetId } })).data,
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.repairs.all });
    },
  });
}
