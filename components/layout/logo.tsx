import { Boxes } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* violet mark — brand accent used sparingly */}
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground shadow-xs">
        <Boxes className="size-5" />
      </span>
      <span className="text-title-lg font-semibold tracking-[-0.02em] text-foreground">
        IMP
      </span>
    </div>
  );
}
