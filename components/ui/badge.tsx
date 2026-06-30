import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Pills: 12px medium, full radius, {color}-50 bg / {color}-700 text / {color}-500 dot
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap border",
  {
    variants: {
      color: {
        // light: {hue}-50 bg / {hue}-700 text / {hue}-500 dot
        // dark:  {hue} @~12% bg / {hue}-300 text / {hue}-400 dot
        gray: "bg-gray-100 text-gray-700 border-gray-200 [--dot:var(--gray-500)] dark:bg-white/[0.08] dark:text-gray-300 dark:border-white/[0.08] dark:[--dot:var(--gray-400)]",
        brand:
          "bg-brand-50 text-brand-700 border-brand-200 [--dot:var(--brand-500)] dark:bg-brand-400/15 dark:text-brand-300 dark:border-brand-400/20 dark:[--dot:var(--brand-400)]",
        success:
          "bg-success-50 text-success-700 border-success-50 [--dot:var(--success-500)] dark:bg-success-400/15 dark:text-success-300 dark:border-success-400/20 dark:[--dot:var(--success-400)]",
        warning:
          "bg-warning-50 text-warning-700 border-warning-50 [--dot:var(--warning-500)] dark:bg-warning-400/15 dark:text-warning-300 dark:border-warning-400/20 dark:[--dot:var(--warning-400)]",
        error:
          "bg-error-50 text-error-700 border-error-50 [--dot:var(--error-500)] dark:bg-error-400/15 dark:text-error-300 dark:border-error-400/20 dark:[--dot:var(--error-400)]",
        info: "bg-info-50 text-info-700 border-info-50 [--dot:var(--info-500)] dark:bg-info-400/15 dark:text-info-300 dark:border-info-400/20 dark:[--dot:var(--info-400)]",
      },
    },
    defaultVariants: {
      color: "gray",
    },
  },
);

function Badge({
  className,
  color,
  dot = false,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ color }), className)}
      {...props}
    >
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ backgroundColor: "var(--dot)" }}
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
