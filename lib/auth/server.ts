import "server-only";
import { cookies } from "next/headers";

import { REFRESH_COOKIE } from "@/lib/auth/constants";

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setRefreshCookie(refreshToken: string, refreshExpUnix: number) {
  const store = await cookies();
  const maxAge = Math.max(0, refreshExpUnix - Math.floor(Date.now() / 1000));
  store.set(REFRESH_COOKIE, refreshToken, { ...baseCookieOptions, maxAge });
}

export async function clearRefreshCookie() {
  const store = await cookies();
  store.set(REFRESH_COOKIE, "", { ...baseCookieOptions, maxAge: 0 });
}

export async function readRefreshCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}
