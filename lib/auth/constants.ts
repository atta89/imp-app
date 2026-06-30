/** httpOnly cookie holding the refresh token (never exposed to JS). */
export const REFRESH_COOKIE = "imp_rt";

/** Server-side base URL of the Go backend (route handlers proxy through here). */
export const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080/api/v1";
