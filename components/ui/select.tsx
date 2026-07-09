import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lightweight styled native <select>. Accessible by default; swap for a Radix
 * select later if multi-column option rendering is needed.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    // Width utilities (e.g. w-full, w-28) go on the wrapper — it's what sizes
    // the control on screen. The inner <select> is always w-full of the wrapper,
    // so `<Select className="w-full">` fills its row instead of shrinking to the
    // widest option.
    <div className={cn("relative inline-flex", className)}>
      <select
        data-slot="select"
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-card pl-3.5 pr-9 text-sm text-foreground shadow-xs transition-colors",
          "outline-none focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100",
          "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-400/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
    </div>
  );
}

export { Select };
