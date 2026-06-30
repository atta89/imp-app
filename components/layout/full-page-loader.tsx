import { Loader2 } from "lucide-react";

import { Logo } from "@/components/layout/logo";

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Logo />
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        {label}
      </div>
    </div>
  );
}
