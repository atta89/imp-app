"use client";

import * as React from "react";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Logo } from "@/components/layout/logo";
import { CommandPalette } from "@/components/search/command-palette";
import { CommandPaletteProvider } from "@/components/search/command-palette-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <AppShellInner>{children}</AppShellInner>
      <CommandPalette />
    </CommandPaletteProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const close = React.useCallback(() => setMobileOpen(false), []);

  // Body scroll lock, Escape-to-close, initial focus, focus restore.
  React.useEffect(() => {
    if (!mobileOpen) return;

    document.body.style.overflow = "hidden";

    // Focus the first focusable element in the drawer.
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        return;
      }
      // Simple focus trap.
      if (e.key === "Tab" && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    const trigger = triggerRef.current;
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [mobileOpen, close]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar (fixed) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Logo />
        <button
          ref={triggerRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 dark:focus-visible:ring-brand-400/40"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            onClick={close}
            aria-hidden
          />
          <div
            ref={panelRef}
            className="absolute inset-y-0 left-0 w-70 border-r border-sidebar-border shadow-lg motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-200"
          >
            <Sidebar onNavigate={close} onClose={close} />
          </div>
        </div>
      )}

      {/* Main content — offset by sidebar width on desktop.
          Page padding + max-width are owned by <PageContainer> per page. */}
      <div className={cn("min-w-0 flex-1 lg:pl-70")}>
        <main>{children}</main>
      </div>
    </div>
  );
}
