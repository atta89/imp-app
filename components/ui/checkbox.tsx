"use client";

import * as React from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.ComponentProps<"button">, "onChange" | "value"> {
  checked?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  checked = false,
  indeterminate = false,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      data-slot="checkbox"
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors outline-none",
        "focus-visible:ring-4 focus-visible:ring-brand-100 focus-visible:border-brand-300",
        "dark:focus-visible:ring-brand-400/40 dark:focus-visible:border-brand-400",
        checked || indeterminate
          ? "border-brand bg-brand text-brand-foreground"
          : "border-input bg-card hover:border-brand-400",
        className,
      )}
      {...props}
    >
      {indeterminate ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : checked ? (
        <Check className="size-3" strokeWidth={3} />
      ) : null}
    </button>
  );
}

export { Checkbox };
