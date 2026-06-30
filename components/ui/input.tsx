import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // white (light) / Gray 900 surface (dark), default border, 8px radius
        "flex h-10 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-xs transition-colors",
        "placeholder:text-text-tertiary",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // focus = Brand border + ring (Brand 400 tuned for dark)
        "outline-none focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100",
        "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-400/30",
        // error = Error border + ring (Error 400 on dark)
        "aria-invalid:border-error-300 aria-invalid:focus-visible:ring-error-100",
        "dark:aria-invalid:border-error-400 dark:aria-invalid:focus-visible:ring-error-400/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
