import Image from "next/image";

import logoLight from "@/public/brand/logo.png";
import logoDark from "@/public/brand/logo-white.png";
import logoMark from "@/public/brand/logo-mark.png";
import { cn } from "@/lib/utils";

/**
 * NICE logo.
 *
 * - `variant="full"` (default): the horizontal lockup (emblem + wordmark). The
 *   navy-text version shows on the light theme and the white-text version on
 *   dark, toggled by the `.dark` class. Dark mode is class-based (next-themes)
 *   and applied pre-paint, so only the active-theme image loads and there is no
 *   flash. Used where there's room: login, scan, the full-page loader.
 * - `variant="mark"`: the emblem alone (theme-agnostic orange). Used in tight
 *   spots — the mobile top bar and the sidebar header.
 *
 * `className` sizes the mark via height (`h-*`); the lockups size by height with
 * `w-auto` to preserve their aspect ratio.
 */
export function Logo({
  variant = "full",
  className,
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  if (variant === "mark") {
    return (
      <Image
        src={logoMark}
        alt="NICE"
        className={cn("h-9 w-9", className)}
        sizes="36px"
      />
    );
  }

  return (
    <>
      <Image
        src={logoLight}
        alt="NICE"
        className={cn("h-7 w-auto dark:hidden", className)}
        sizes="120px"
      />
      <Image
        src={logoDark}
        alt="NICE"
        className={cn("hidden h-7 w-auto dark:block", className)}
        sizes="120px"
      />
    </>
  );
}
