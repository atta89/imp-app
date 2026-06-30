import type { PurchaseOrderStatus, RepairStatus } from "@/lib/api/types";

type BadgeColor = "gray" | "brand" | "success" | "warning" | "error" | "info";

export const PO_STATUS: Record<
  PurchaseOrderStatus,
  { label: string; color: BadgeColor }
> = {
  draft: { label: "Draft", color: "gray" },
  ordered: { label: "Ordered", color: "info" },
  received: { label: "Received", color: "success" },
  cancelled: { label: "Cancelled", color: "error" },
};

export const REPAIR_STATUS: Record<
  RepairStatus,
  { label: string; color: BadgeColor }
> = {
  open: { label: "Open", color: "info" },
  in_progress: { label: "In progress", color: "warning" },
  completed: { label: "Completed", color: "success" },
  unrepairable: { label: "Unrepairable", color: "error" },
};
