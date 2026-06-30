"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setAccessTokenGetter, setRefreshHandler } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import type { User } from "@/lib/api/types";
import type { AuthSession } from "@/lib/auth/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");

  // Access token lives only in memory (a ref, so the API client reads it sync).
  const tokenRef = React.useRef<string | null>(null);
  const inFlightRefresh = React.useRef<Promise<boolean> | null>(null);

  const applySession = React.useCallback((session: AuthSession) => {
    tokenRef.current = session.accessToken;
    setUser(session.user);
    setStatus("authenticated");
  }, []);

  const clearSession = React.useCallback(() => {
    tokenRef.current = null;
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refresh = React.useCallback((): Promise<boolean> => {
    if (inFlightRefresh.current) return inFlightRefresh.current;
    const run = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) {
          clearSession();
          return false;
        }
        applySession((await res.json()) as AuthSession);
        return true;
      } catch {
        clearSession();
        return false;
      } finally {
        inFlightRefresh.current = null;
      }
    })();
    inFlightRefresh.current = run;
    return run;
  }, [applySession, clearSession]);

  const login = React.useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw toApiError(json, res.status);
      applySession(json as AuthSession);
    },
    [applySession],
  );

  const logout = React.useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      router.replace("/login");
    }
  }, [clearSession, router]);

  // Register the in-memory token getter + 401 refresh handler with the client.
  React.useEffect(() => {
    setAccessTokenGetter(() => tokenRef.current);
    setRefreshHandler(refresh);
    return () => {
      setAccessTokenGetter(() => null);
      setRefreshHandler(null);
    };
  }, [refresh]);

  // Boot: restore the session from the httpOnly refresh cookie (if any).
  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refresh }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
