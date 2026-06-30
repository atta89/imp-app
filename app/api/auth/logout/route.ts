import { NextResponse } from "next/server";

import { clearRefreshCookie } from "@/lib/auth/server";

/** Clear the refresh cookie. (The in-memory access token is dropped client-side.) */
export async function POST() {
  await clearRefreshCookie();
  return NextResponse.json({ ok: true });
}
