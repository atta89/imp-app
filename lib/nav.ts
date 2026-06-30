import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Boxes,
  Building2,
  Tags,
  ScanLine,
  ShoppingCart,
  Wrench,
  Users,
  Settings,
  BarChart3,
} from "lucide-react";

export type Role = "admin" | "venue_manager" | "staff";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this item. Omit = everyone. */
  roles?: Role[];
}

export interface NavGroup {
  /** Optional group heading; omit for the top-level group. */
  label?: string;
  items: NavItem[];
}

/**
 * Primary navigation. RBAC filtering by role is wired in step 3 (auth);
 * `roles` here declares intent so the shell is already role-aware.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Assets", href: "/assets", icon: Boxes },
      { label: "Scan", href: "/scan", icon: ScanLine },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Venues", href: "/venues", icon: Building2 },
      { label: "Categories", href: "/categories", icon: Tags },
      {
        label: "Purchase Orders",
        href: "/purchase-orders",
        icon: ShoppingCart,
      },
      { label: "Repairs", href: "/repairs", icon: Wrench },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: BarChart3 }],
  },
  {
    label: "Admin",
    items: [
      { label: "Users", href: "/users", icon: Users, roles: ["admin"] },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/**
 * Filter nav by role, dropping any group that ends up empty. Items without a
 * `roles` list are visible to everyone. The backend is the real enforcer.
 */
export function filterNavGroups(
  groups: NavGroup[],
  role: Role | undefined,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role !== undefined && item.roles.includes(role)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
