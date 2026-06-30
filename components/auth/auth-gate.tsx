"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";
import { FullPageLoader } from "@/components/layout/full-page-loader";

/**
 * Client gate for protected areas. Shows a loader while the session restores,
 * redirects to /login if unauthenticated, and renders children once signed in.
 * (middleware.ts already does the fast cookie redirect; this handles the case
 * where the cookie exists but the refresh fails.)
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (status === "unauthenticated") {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [status, router, pathname]);

  if (status === "authenticated") return <>{children}</>;
  return <FullPageLoader />;
}
