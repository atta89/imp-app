import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/auth/constants";
import { setRefreshCookie } from "@/lib/auth/server";

/**
 * Proxy login to the backend, then keep the refresh token server-side in an
 * httpOnly cookie and hand the access token back to the client (memory-only).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  let backend: Response;
  try {
    backend = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    return NextResponse.json(
      { error: { kind: "internal", message: "Unable to reach the server." } },
      { status: 502 },
    );
  }

  const json = await backend.json().catch(() => ({}));
  if (!backend.ok) {
    return NextResponse.json(json, { status: backend.status });
  }

  const { user, tokens } = json.data ?? {};
  if (!user || !tokens?.accessToken || !tokens?.refreshToken) {
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
