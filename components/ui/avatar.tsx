import * as React from "react";

import { cn } from "@/lib/utils";

function Avatar({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-gray-200 dark:bg-brand-400/15 dark:text-brand-300 dark:ring-white/[0.12]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** Bottom-right status dot. */
function AvatarStatus({
  className,
  online = true,
  ...props
}: React.ComponentProps<"span"> & { online?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card",
        online ? "bg-success-500" : "bg-gray-300",
        className,
      )}
      {...props}
    />
  );
}

/** Build initials from a name. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export { Avatar, AvatarStatus, initials };
