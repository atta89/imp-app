import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "@/lib/api/schema";
import { toApiError } from "@/lib/api/errors";

const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

/**
 * Access-token provider. The auth layer registers a getter so every request
 * carries the in-memory bearer token; until then this is a no-op.
 */
let accessTokenGetter: () => string | null = () => null;
export function setAccessTokenGetter(getter: () => string | null) {
  accessTokenGetter = getter;
}

/**
 * 401 handler. The auth layer registers a refresh routine; on a 401 we run it
 * once and replay the original request with the new token.
 */
let refreshHandler: (() => Promise<boolean>) | null = null;
export function setRefreshHandler(handler: (() => Promise<boolean>) | null) {
  refreshHandler = handler;
}

// Pre-send clones so a 401'd request can be replayed (body intact).
const pristine = new WeakMap<Request, Request>();

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    pristine.set(request, request.clone());
    const token = accessTokenGetter();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  async onResponse({ request, response }) {
    if (response.status !== 401 || !refreshHandler) return response;
    const original = pristine.get(request);
    if (!original) return response;

    const refreshed = await refreshHandler();
    if (!refreshed) return response;

    // Replay once, directly via fetch (bypasses this middleware → no loop).
    const retry = original.clone();
    const token = accessTokenGetter();
    if (token) retry.headers.set("Authorization", `Bearer ${token}`);
    return fetch(retry);
  },
};

/** Typed openapi-fetch client. Wrap calls in TanStack Query hooks, not directly. */
export const api = createClient<paths>({ baseUrl });
api.use(authMiddleware);

/**
 * Authed raw fetch against the API for cases openapi-fetch handles awkwardly:
 * multipart uploads and binary (CSV) downloads. Attaches the bearer token and,
 * on a 401, refreshes once and replays. Path is relative to the API base
 * (e.g. "/imports/purchase-orders/template"). Caller handles the Response.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  opts: { retryOn401?: boolean } = {},
): Promise<Response> {
  const { retryOn401 = true } = opts;
  const url = `${baseUrl}${path}`;
  const withAuth = (token: string | null): RequestInit => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return { ...init, headers };
  };

  let res = await fetch(url, withAuth(accessTokenGetter()));
  // Some 401s are domain errors (e.g. a wrong current-password check), not an
  // invalid token — those pass retryOn401: false to skip the refresh-and-replay.
  if (retryOn401 && res.status === 401 && refreshHandler && (await refreshHandler())) {
    res = await fetch(url, withAuth(accessTokenGetter()));
  }
  return res;
}

/** Trigger a browser download from an authed binary endpoint (CSV templates/reports). */
export async function downloadFile(path: string, fallbackName: string) {
  const res = await apiFetch(path);
  if (!res.ok) throw toApiError(await res.json().catch(() => undefined), res.status);
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** openapi-fetch result shape (success xor error). */
type FetchResult<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

/**
 * Unwrap an openapi-fetch result into the response envelope (`{ data, meta }`),
 * throwing a normalized {@link ApiError} on any failure.
 */
export function unwrap<T>(result: FetchResult<T>): T {
  if (result.error !== undefined || !result.response.ok || result.data === undefined) {
    throw toApiError(result.error, result.response.status);
  }
  return result.data;
}
