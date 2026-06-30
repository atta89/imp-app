import type { components } from "@/lib/api/schema";

// Convenience re-exports of the generated schema types. Never hand-write these —
// regenerate with `npm run gen:api` when the spec changes.
export type Asset = components["schemas"]["Asset"];
export type AssetStatus = components["schemas"]["AssetStatus"];
export type AssetCondition = components["schemas"]["AssetCondition"];
export type Venue = components["schemas"]["Venue"];
export type Category = components["schemas"]["Category"];
export type CategoryCustomField = components["schemas"]["CategoryCustomField"];
export type User = components["schemas"]["User"];
export type Role = components["schemas"]["Role"];
export type Movement = components["schemas"]["Movement"];
export type MovementType = components["schemas"]["MovementType"];
export type Repair = components["schemas"]["Repair"];
export type RepairStatus = components["schemas"]["RepairStatus"];
export type PurchaseOrder = components["schemas"]["PurchaseOrder"];
export type PurchaseOrderStatus = components["schemas"]["PurchaseOrderStatus"];
export type PurchaseOrderSupplier = components["schemas"]["PurchaseOrderSupplier"];
export type PurchaseOrderLineItem = components["schemas"]["PurchaseOrderLineItem"];
export type CreatePurchaseOrderRequest =
  components["schemas"]["CreatePurchaseOrderRequest"];

// Bulk asset actions
export type BulkTransferRequest = components["schemas"]["BulkTransferRequest"];
export type BulkStatusRequest = components["schemas"]["BulkStatusRequest"];
export type BulkQrRequest = components["schemas"]["BulkQrRequest"];
export type BulkActionResult = components["schemas"]["BulkActionResult"];
export type BulkActionResponse = components["schemas"]["BulkActionResponse"];
export type ReceivePurchaseOrderRequest =
  components["schemas"]["ReceivePurchaseOrderRequest"];
export type CreateRepairRequest = components["schemas"]["CreateRepairRequest"];
export type UpdateRepairRequest = components["schemas"]["UpdateRepairRequest"];
export type CreateUserRequest = components["schemas"]["CreateUserRequest"];
export type UpdateUserRequest = components["schemas"]["UpdateUserRequest"];
export type InventoryByVenueRow = components["schemas"]["InventoryByVenueRow"];
export type AssetsByResponsibleRow =
  components["schemas"]["AssetsByResponsibleRow"];

// Bulk import
export type ImportJob = components["schemas"]["ImportJob"];
export type ImportJobStatus = components["schemas"]["ImportJobStatus"];
export type ImportJobOptions = components["schemas"]["ImportJobOptions"];
export type ImportJobCounts = components["schemas"]["ImportJobCounts"];
export type ImportRowError = components["schemas"]["ImportRowError"];
export type ImportPreview = components["schemas"]["ImportPreview"];
export type ImportPreviewPO = components["schemas"]["ImportPreviewPO"];
export type CommitImportRequest = components["schemas"]["CommitImportRequest"];
export type ImportConflictPolicy =
  components["schemas"]["ImportConflictPolicy"];
export type DashboardSummary = components["schemas"]["DashboardSummary"];
export type Pagination = components["schemas"]["Pagination"];
export type Meta = components["schemas"]["Meta"];
export type PublicUserContact = components["schemas"]["PublicUserContact"];

// Request DTOs
export type CreateAssetRequest = components["schemas"]["CreateAssetRequest"];
export type UpdateAssetRequest = components["schemas"]["UpdateAssetRequest"];
export type TransferAssetRequest = components["schemas"]["TransferAssetRequest"];
export type StatusChangeRequest = components["schemas"]["StatusChangeRequest"];
export type AssignCustodyRequest = components["schemas"]["AssignCustodyRequest"];
