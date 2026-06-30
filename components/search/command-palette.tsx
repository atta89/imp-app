"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_GROUPS, filterNavGroups } from "@/lib/nav";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandPalette } from "@/components/search/command-palette-context";

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const { open, setOpen } = useCommandPalette();

  const groups = React.useMemo(
    () => filterNavGroups(NAV_GROUPS, user?.role),
    [user?.role],
  );

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router, setOpen],
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-gray-950/50 backdrop-blur-[1px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "motion-reduce:animate-none",
          )}
        />
        <DialogPrimitive.Content
          aria-label="Search features"
          className={cn(
            "fixed left-1/2 top-[18%] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "motion-reduce:animate-none",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Search features
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Type to search pages. Use arrow keys to move, Enter to navigate,
            Escape to close.
          </DialogPrimitive.Description>
          <Command label="Search features" loop>
            <CommandInput placeholder="Search pages…" autoFocus />
            <CommandList>
              <CommandEmpty>No matching pages.</CommandEmpty>
              {groups.map((group, gi) => (
                <CommandGroup
                  key={group.label ?? `group-${gi}`}
                  heading={group.label ?? "Main"}
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.href}
                        value={`${item.label} ${item.href}`}
                        onSelect={() => go(item.href)}
                      >
                        <Icon className="text-text-tertiary" />
                        <span>{item.label}</span>
                        <span className="ml-auto text-xs text-text-tertiary">
                          {item.href}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
