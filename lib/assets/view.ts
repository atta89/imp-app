import type {
  Asset,
  Category,
  Department,
  User,
  Venue,
} from "@/lib/api/types";

/** Reference-data maps for resolving the IDs on an Asset to display labels. */
export interface AssetLookups {
  venues: Map<string, Venue>;
  categories: Map<string, Category>;
  users: Map<string, User>;
  departments: Map<string, Department>;
}

export function buildLookups(
  venues: Venue[] = [],
  categories: Category[] = [],
  users: User[] = [],
  departments: Department[] = [],
): AssetLookups {
  return {
    venues: new Map(venues.map((v) => [v.id, v])),
    categories: new Map(categories.map((c) => [c.id, c])),
    users: new Map(users.map((u) => [u.id, u])),
    departments: new Map(departments.map((d) => [d.id, d])),
  };
}

/** Display-ready row derived from an API Asset + reference data. */
export interface AssetRow {
  id: string;
  assetTag: string;
  name: string;
  serialNumber?: string;
  categoryName: string;
  homeVenueName: string;
  currentVenueName: string;
  departmentName?: string;
  status: Asset["status"];
  condition: Asset["condition"];
  responsibleName?: string;
  responsiblePosition?: string;
  updatedAt: string;
  expectedReturnDate?: string;
  isOverdue: boolean;
  away: boolean;
}

export function toAssetRow(asset: Asset, lookups: AssetLookups): AssetRow {
  const responsible = asset.responsibleUserId
    ? lookups.users.get(asset.responsibleUserId)
    : undefined;
  return {
    id: asset.id,
    assetTag: asset.assetTag,
    name: asset.name,
    serialNumber: asset.serialNumber,
    categoryName: lookups.categories.get(asset.categoryId)?.name ?? "—",
    homeVenueName: lookups.venues.get(asset.homeVenueId)?.name ?? "—",
    currentVenueName: lookups.venues.get(asset.currentVenueId)?.name ?? "—",
    departmentName: asset.departmentId
      ? lookups.departments.get(asset.departmentId)?.name
      : undefined,
    status: asset.status,
    condition: asset.condition,
    responsibleName: responsible?.name,
    responsiblePosition: responsible?.position,
    updatedAt: asset.updatedAt,
    expectedReturnDate: asset.expectedReturnDate,
    isOverdue: asset.isOverdue,
    away: asset.homeVenueId !== asset.currentVenueId,
  };
}
