import type { LucideIcon } from "lucide-react";
import {
  PlugZap,
  Undo2,
  Wrench,
  CircleCheck,
  Ban,
  ArrowRightLeft,
  UserPlus,
  CircleSlash,
  Search,
} from "lucide-react";

import type { AssetStatus } from "@/lib/api/types";

export type AssetActionType = "status" | "transfer" | "assign" | "repair";

export interface AssetAction {
  id: string;
  label: string;
  icon: LucideIcon;
  type: AssetActionType;
  /** Target status for `type: "status"` actions. */
  targetStatus?: AssetStatus;
  tone?: "primary" | "secondary" | "destructive";
  /** True → render in the "More" overflow menu rather than as a header button. */
  overflow?: boolean;
}

const transfer: AssetAction = {
  id: "transfer",
  label: "Transfer",
  icon: ArrowRightLeft,
  type: "transfer",
  tone: "secondary",
};
const assign: AssetAction = {
  id: "assign",
  label: "Assign custody",
  icon: UserPlus,
  type: "assign",
  tone: "secondary",
};
const sendToRepair: AssetAction = {
  id: "repair",
  label: "Send to repair",
  icon: Wrench,
  type: "repair",
  overflow: true,
};
const retire: AssetAction = {
  id: "retire",
  label: "Retire",
  icon: CircleSlash,
  type: "status",
  targetStatus: "retired",
  overflow: true,
};
const markLost: AssetAction = {
  id: "lost",
  label: "Mark lost",
  icon: Ban,
  type: "status",
  targetStatus: "lost",
  tone: "destructive",
  overflow: true,
};

/** Legal actions for an asset's current status (backend is the real enforcer). */
export function assetActions(status: AssetStatus): AssetAction[] {
  switch (status) {
    case "available":
      return [
        { id: "deploy", label: "Mark in use", icon: PlugZap, type: "status", targetStatus: "in_use", tone: "primary" },
        transfer,
        assign,
        sendToRepair,
        retire,
        markLost,
      ];
    case "in_use":
      return [
        { id: "return", label: "Mark available", icon: Undo2, type: "status", targetStatus: "available", tone: "primary" },
        transfer,
        assign,
        sendToRepair,
        retire,
        markLost,
      ];
    case "in_repair":
      return [
        { id: "repaired", label: "Mark repaired", icon: CircleCheck, type: "status", targetStatus: "available", tone: "primary" },
        { id: "unrepairable", label: "Mark unrepairable", icon: Ban, type: "status", targetStatus: "retired", tone: "destructive", overflow: true },
        assign,
        markLost,
      ];
    case "lost":
      return [
        { id: "found", label: "Mark found", icon: Search, type: "status", targetStatus: "available", tone: "primary" },
      ];
    case "retired":
      return [{ ...markLost, overflow: false, tone: "secondary" }];
  }
}
