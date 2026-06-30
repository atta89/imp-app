import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm text-foreground shadow-xs transition-colors",
        "placeholder:text-text-tertiary",
        "outline-none focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100",
        "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-400/30",
        "aria-invalid:border-error-300 aria-invalid:focus-visible:ring-error-100",
        "dark:aria-invalid:border-error-400 dark:aria-invalid:focus-visible:ring-error-400/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
