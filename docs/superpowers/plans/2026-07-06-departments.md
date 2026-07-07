# Departments Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the new backend `Department` resource into the Next.js UI: CRUD nested under venues, filter/display on assets, breakdowns in reports, optional home-department on PO receive, import template docs.

**Architecture:** Follow every existing pattern — openapi-fetch typed calls, TanStack Query key factory, react-hook-form + Zod + `applyFormError`, sonner toasts. No new movement type; department reassignment is a plain asset PUT.

**Tech Stack:** Next.js 16 (app router) · React 19 · TanStack Query v5 · openapi-fetch · react-hook-form · Zod · Tailwind v4 · Radix/shadcn primitives · sonner · recharts.

## Global Constraints

- Never hand-edit `lib/api/schema.d.ts`; regen via `npm run gen:api`.
- All venue-scoped queries **must** guard `venueId` with `enabled: Boolean(venueId)`.
- RBAC: hide create/edit/delete controls for non-admin roles (mirror venues page).
- No `any` in TS; `npm run build` must be clean.
- Follow the spec's copy/wording verbatim for toasts and helper text.

---

## Task 1 — Data layer (query keys + hooks)

**Files:**
- Modify: `lib/api/query-keys.ts` — add `departments.{all,list,detail}` and `reports.byDepartment`.
- Modify: `lib/api/hooks.ts` — add `useDepartments`, `useDepartment`, `useCreateDepartment`, `useUpdateDepartment`, `useDeleteDepartment`, `useAssetDepartments`, `useReportByDepartment`.
- Modify: `lib/api/types.ts` — re-export `Department`, `CreateDepartmentRequest`, `UpdateDepartmentRequest`, `DepartmentAssetCountRow`.
- Modify: `lib/api/query-keys.ts` — the `AssetFilters` alias already covers `department` because the schema regen added the query param.

**Interfaces produced:**
- `useDepartments(venueId: string) → Query<Department[]>` (returns `[]` if venueId is empty via `enabled`).
- `useAssetDepartments(homeVenueId?: string) → Department[]` (thin wrapper: `[]` when empty).
- `useReportByDepartment(venueId?: string) → Query<DepartmentAssetCountRow[]>`.
- Mutations invalidate `queryKeys.departments.all(venueId)` on success.

## Task 2 — Departments UI nested under venues

**Files:**
- Create: `app/(dashboard)/venues/[id]/page.tsx` — venue detail with a Departments section + Manage buttons.
- Create: `components/departments/department-form-dialog.tsx` — mirror `venue-form-dialog.tsx`; schema `{ name, code, description?, isActive }`.
- Modify: `app/(dashboard)/venues/page.tsx` — row click → `/venues/[id]`, add "Manage" affordance.

**Notes:**
- No new top-level nav entry (v1 rule).
- Delete surfaces the 409 as `"Department is still used by assets; reassign them first."`.
- Non-admin roles see the list but not the "New / Edit / Delete" buttons.

## Task 3 — Asset department reassignment

**Rationale:** the app has no create/edit asset form (assets come from PO receive). The spec's Section 3 ("asset form — pick a department") only makes sense once such a form exists. To satisfy Section 3's *intent* (a way to reassign an asset's department, with the venue-home invariant enforced by the server) and the spec's verification step (*"try to edit the asset's home venue to another venue that has no matching department → 400"*), add a **Change home venue & department** dialog that PUTs `{ homeVenueId, departmentId }`.

**Files:**
- Modify: `lib/api/hooks.ts` — add `useUpdateAsset(id)` around `api.PUT("/assets/{id}", …)`.
- Create: `components/assets/change-home-dialog.tsx` — venue Select + dependent department Select; clears department on venue change; empty department option `— None —`.
- Modify: `lib/assets/transitions.ts` — add a new `home` action type + overflow entry `"Change home"`.
- Modify: `app/(dashboard)/assets/[id]/page.tsx` — mount `ChangeHomeDialog`.

## Task 4 — Assets list filter by department

**Files:**
- Modify: `app/(dashboard)/assets/page.tsx` — add `department` state + a Select in the toolbar. Enabled only when `venue` is set; cleared whenever `venue` changes. Thread through `AssetFilters.department`.

## Task 5 — Asset detail: show department name

**Files:**
- Modify: `lib/assets/view.ts` — add `departments: Map<id,name>` lookup and `departmentName` on `AssetRow`.
- Modify: `app/(dashboard)/assets/[id]/page.tsx` — feed `useAssetDepartments(asset.homeVenueId)` into lookups; add a `DetailRow label="Home department"`.

## Task 6 — Public scan page: department name

**Files:**
- Modify: `app/(public)/scan/[qrToken]/page.tsx` — render `data.departmentName` under the home-venue row as small subdued type.

## Task 7 — Reports

**Files:**
- Modify: `app/(dashboard)/reports/page.tsx`:
  - New "By department" `Section` with a venue picker; non-admins must pick a venue before the query fires. Renders the `HorizontalBarChart` (department name Y, count X).
  - Extend the "Inventory by venue" render to show a per-venue `byDepartment` breakdown as inline pill list (small badges under each bar's row) via a new section.

## Task 8 — PO receive: optional home department

**Files:**
- Modify: `components/purchase-orders/receive-dialog.tsx` — Zod schema gains `departmentId?: string`; department Select populated by `useAssetDepartments(watch("venueId"))`; empty → send `undefined`; server rejects → `applyFormError` on `departmentId`.

## Task 9 — Import template docs

**Files:**
- Modify: `components/imports/upload-step.tsx` — add `{ col: "departmentCode", fallback: "no department" }` to `OPTIONAL_COLUMNS`.

## Task 10 — Verification

- `npm run gen:api && npm run build` → clean.
- `npm run dev` walkthrough of the golden path with the mock server (`scripts/mock-api.mjs` if present).
- Screenshots: departments table, department column on asset, by-department chart.

## Self-review checks

- Spec coverage: every section 1–8 is mapped to a task above.
- No placeholders — every step names its file(s).
- Type consistency: hook names, keys, and DTO refs match the schema exactly.
