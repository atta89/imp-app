"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Search, X } from "lucide-react";

import * as React from "react";

import { cn } from "@/lib/utils";
import { NAV_GROUPS, filterNavGroups } from "@/lib/nav";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarStatus, initials } from "@/components/ui/avatar";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useCommandPalette } from "@/components/search/command-palette-context";

export function Sidebar({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  /** When provided (mobile drawer), renders a close control in the header. */
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { setOpen: setPaletteOpen } = useCommandPalette();
  const groups = React.useMemo(
    () => filterNavGroups(NAV_GROUPS, user?.role),
    [user?.role],
  );

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex h-full w-70 flex-col bg-sidebar">
      {/* Top: logo + dark-mode toggle (+ close on mobile drawer) */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {onClose && (
            <Button
              variant="tertiary"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Search — opens the command palette (also ⌘K / Ctrl+K). */}
      <div className="px-4 pb-4">
        <button
          type="button"
          data-cmdk-trigger
          onClick={() => setPaletteOpen(true)}
          aria-label="Search features"
          className={cn(
            "relative flex h-10 w-full items-center rounded-lg border border-input bg-card pl-9 pr-2 text-left text-sm text-text-tertiary shadow-xs transition-colors",
            "hover:bg-gray-50 dark:hover:bg-white/4",
            "outline-none focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-100",
            "dark:focus-visible:border-brand-400 dark:focus-visible:ring-brand-400/30",
          )}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <span className="flex-1">Search</span>
          <kbd
            aria-hidden
            className="ml-2 hidden h-6 select-none items-center rounded-md border border-border bg-background px-1.5 font-mono text-[11px] font-medium text-text-tertiary lg:inline-flex"
          >
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        {groups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className="space-y-1">
            {group.label && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-gray-50 dark:hover:bg-white/6",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5 shrink-0",
                      active
                        ? "text-sidebar-accent-foreground"
                        : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-200",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: user cell */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar>{initials(user?.name ?? "")}</Avatar>
            <AvatarStatus online />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.name ?? "—"}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {user?.email ?? ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Log out"
            onClick={() => logout()}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/6 dark:hover:text-gray-200"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
