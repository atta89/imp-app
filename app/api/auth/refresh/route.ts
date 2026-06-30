import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/auth/constants";
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from "@/lib/auth/server";

/**
 * Mint a fresh access token using the httpOnly refresh cookie. Called on app
 * boot (to restore the in-memory session) and on a 401. Rotates the cookie.
 */
export async function POST() {
  const refreshToken = await readRefreshCookie();
  if (!refreshToken) {
    return NextResponse.json(
      { error: { kind: "unauthorized", message: "No active session." } },
      { status: 401 },
    );
  }

  let backend: Response;
  try {
    backend = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json(
      { error: { kind: "internal", message: "Unable to reach the server." } },
      { status: 502 },
    );
  }

  const json = await backend.json().catch(() => ({}));
  if (!backend.ok) {
    await clearRefreshCookie();
    return NextResponse.json(json, { status: backend.status });
  }

  const { user, tokens } = json.data ?? {};
  if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
    await clearRefreshCookie();
    return NextResponse.json(
      { error: { kind: "internal", message: "Malformed auth response." } },
      { status: 502 },
    );
  }

  await setRefreshCookie(tokens.refreshToken, tokens.refreshExp);
  return NextResponse.json({
    user,
    accessToken: tokens.accessToken,
    accessExp: tokens.accessExp,
  });
}
