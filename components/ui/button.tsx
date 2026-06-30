import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // base: 14px semibold, 8px radius, focus = 4px brand ring, disabled = 50% + no shadow
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:border-brand-300 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 cursor-pointer",
  {
    variants: {
      variant: {
        // Primary = near-black (light) / near-white (dark); high-contrast neutral
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-gray-800 dark:hover:bg-gray-200",
        // Secondary = surface + default border; hover lightens (overlay on dark)
        secondary:
          "bg-secondary text-secondary-foreground border border-input shadow-xs hover:bg-gray-50 dark:hover:bg-white/6",
        // Tertiary / ghost
        tertiary:
          "text-gray-600 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-white/6 dark:hover:text-gray-100",
        // Link = brand accent (lighter tint on dark via --brand)
        link: "text-brand underline-offset-4 hover:underline px-0 h-auto shadow-none",
        // Destructive = Error (tuned per theme via --destructive)
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-error-700 dark:hover:bg-error-600",
      },
      size: {
        sm: "h-9 px-3.5", // ~36px
        md: "h-10 px-4", // ~40px
        lg: "h-11 px-[18px]", // ~44px
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
