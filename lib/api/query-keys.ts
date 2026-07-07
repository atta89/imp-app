import type { paths } from "@/lib/api/schema";

export type AssetFilters = NonNullable<
  paths["/assets"]["get"]["parameters"]["query"]
>;

/**
 * Central query-key factory. Hierarchical so a broad key (e.g. `assets.all`)
 * invalidates every list/detail under it after a mutation.
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  dashboard: {
    summary: ["dashboard", "summary"] as const,
  },
  assets: {
    all: ["assets"] as const,
    list: (filters: AssetFilters = {}) => ["assets", "list", filters] as const,
    detail: (id: string) => ["assets", "detail", id] as const,
    history: (id: string) => ["assets", "history", id] as const,
  },
  venues: {
    all: ["venues"] as const,
  },
  departments: {
    all: (venueId: string) => ["departments", venueId] as const,
    list: (venueId: string) => ["departments", venueId, "list"] as const,
    detail: (venueId: string, id: string) =>
      ["departments", venueId, "detail", id] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  users: {
    all: ["users"] as const,
  },
  purchaseOrders: {
    all: ["purchase-orders"] as const,
    list: (status?: string) => ["purchase-orders", "list", status ?? ""] as const,
    detail: (id: string) => ["purchase-orders", "detail", id] as const,
  },
  repairs: {
    all: ["repairs"] as const,
    list: (status?: string) => ["repairs", "list", status ?? ""] as const,
    detail: (id: string) => ["repairs", "detail", id] as const,
  },
  reports: {
    all: ["reports"] as const,
    inventoryByVenue: ["reports", "inventory-by-venue"] as const,
    assetsAway: ["reports", "assets-away"] as const,
    assetsOverdue: ["reports", "assets-overdue"] as const,
    inRepair: ["reports", "in-repair"] as const,
    byResponsible: ["reports", "by-responsible"] as const,
    byDepartment: (venueId?: string) =>
      ["reports", "by-department", venueId ?? ""] as const,
  },
  notifications: {
    preferences: ["me", "notification-preferences"] as const,
  },
} as const;
