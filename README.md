# IMP — Inventory Management Platform (web)

Next.js 16 frontend for IMP: asset tracking across venues, with QR scanning,
purchase orders, repairs, bulk imports, and reporting. Talks to a Go backend
through a typed OpenAPI client.

> Next.js 16 has breaking changes from prior versions — APIs, conventions, and
> file structure differ from older docs and most AI training data. When in
> doubt, read the guides under `node_modules/next/dist/docs/`. See
> [AGENTS.md](AGENTS.md).

## Stack

- **Next.js 16** (App Router) on **React 19**, TypeScript 5
- **Tailwind CSS v4** + shadcn/ui (see [components.json](components.json))
- **TanStack Query v5** for server state
- **openapi-fetch** + **openapi-typescript** — typed client generated from
  the backend's OpenAPI spec
- **react-hook-form** + **zod** for forms
- **recharts** for reports, **@zxing/browser** for QR scanning
- **sonner** for toasts, **next-themes** for light/dark, **lucide-react**
  for icons

## Getting started

```bash
npm install
cp .env.example .env.local      # adjust if your backend isn't on :8080
npm run dev                     # http://localhost:3000
```

The dev server expects a backend at `API_BASE_URL` (default
`http://localhost:8080/api/v1`). If you don't have one running, start the
bundled mock:

```bash
node scripts/mock-api.mjs       # serves the same endpoints on :8080
```

### Environment

| Var | Where | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | browser | `/api/v1` | Same-origin path that Next rewrites to the backend (avoids CORS). |
| `API_BASE_URL` | server | `http://localhost:8080/api/v1` | Real backend origin. Used by auth route handlers and the rewrite target in [next.config.ts](next.config.ts). |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next dev server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint. |
| `npm run gen:api` | Regenerate [lib/api/schema.d.ts](lib/api/schema.d.ts) from `../imp/openapi.yaml`. Run this whenever the backend spec changes. |

## Project layout

```
app/
  (dashboard)/          authenticated shell — dashboard, assets,
                        scan, purchase-orders, repairs, reports,
                        categories, venues, users, settings
  (public)/             login + public QR resolver (/scan/[qrToken])
  api/auth/             login / refresh / logout route handlers
  layout.tsx            root layout + providers
  providers.tsx         QueryClient, ThemeProvider, AuthProvider, Toaster

components/
  ui/                   shadcn primitives
  layout/               PageContainer, PageHeader, StatCard, ...
  assets/ purchase-orders/ repairs/ reports/ users/ venues/
                        feature components

lib/
  api/                  openapi-fetch client, generated schema,
                        TanStack Query hooks, query-key factory,
                        ApiError, bulk-import hooks
  auth/                 client context + server cookie helpers
  format.ts forms.ts nav.ts status-meta.ts utils.ts

scripts/
  mock-api.mjs          standalone mock backend (no npm script — run directly)

proxy.ts                Next 16 renamed middleware — optimistic auth gate
next.config.ts          /api/v1/* rewrite to API_BASE_URL
```

## How auth works

1. `POST /api/auth/login` (handler in [app/api/auth/login](app/api/auth/login))
   proxies credentials to the backend.
2. The refresh token is stored in an httpOnly `imp_rt` cookie (see
   [lib/auth/server.ts](lib/auth/server.ts) and
   [lib/auth/constants.ts](lib/auth/constants.ts)). The access token is
   returned to the client and held **in memory only**.
3. [proxy.ts](proxy.ts) (Next 16's renamed `middleware`) is an optimistic
   gate: if the refresh cookie is absent on a protected route, redirect to
   `/login`. The backend remains the source of truth.
4. On boot, the auth context calls `POST /api/auth/refresh` to mint a fresh
   access token from the cookie.
5. The openapi-fetch client ([lib/api/client.ts](lib/api/client.ts))
   injects the bearer token and, on a 401, refreshes once and retries.

Public prefixes (no auth required): `/login`, `/scan`.

## How the API client works

- Browser code calls `/api/v1/...` (same-origin).
- `next.config.ts` rewrites those requests to `API_BASE_URL` on the server,
  so the backend origin stays private and there's no CORS.
- Types come from the backend's OpenAPI spec: edit `../imp/openapi.yaml`,
  run `npm run gen:api`, and every hook in
  [lib/api/hooks.ts](lib/api/hooks.ts) re-types automatically.

## Notes

- Tailwind v4 needs no `postcss.config` beyond what's in
  [postcss.config.mjs](postcss.config.mjs) — config lives in
  [app/globals.css](app/globals.css).
- shadcn components are pinned via [components.json](components.json) — add
  new ones with `npx shadcn@latest add <name>`.
