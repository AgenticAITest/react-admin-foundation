# Phase 1.5 — Module Sandbox (Dev Enablement) — **RBAC-aware**

## What it is
A tiny, self-contained **host app** that lets a BA build and run a **single business module** (plugin) *without* the core foundation. It mirrors the core plugin contract **including a minimal, real RBAC** that reads **per-tenant** tables in the tenant schema.

## Why we’re doing this
- **Unblock BA development** in Replit with Neon + Drizzle.
- **Freeze the contract**: same `/api/plugins/<id>/*`, `PluginContext`, and `/health`.
- **Realistic security**: simple **per-tenant RBAC** (not “allow all”) so flows match production.
- **Risk isolation**: experiment without touching the core.

## Definition of Done
- API lives under `/api/plugins/<module-id>/*`; `/health` returns 200.
- CRUD works against a **tenant schema** via `withTenantTx`.
- **RBAC enforcement** works via `rbac.require(<permission>)` with data stored in the tenant’s schema.
- A default `OWNER` role and `dev` user are seeded so BA can use the app immediately.
- When done, module files drop into core with minimal edits.

## How it works (quick)
- **Tenant bootstrap**: creates public `sys_tenant`, a dev schema (e.g., `tenant_dev`), sample table `items`, and **RBAC tables** in the tenant schema:
  - `rbac_permissions`, `rbac_roles`, `rbac_role_permissions`, `rbac_user_roles`.
- **RBAC**:
  - `rbac.require('plugin.resource.action')` checks the tenant’s RBAC tables.
  - On startup, the sandbox seeds the module’s declared permissions into the tenant tables and grants them to `OWNER` → `dev`.
- **Plugin contract**:
  - `meta: { id, version, api: '1.x' }`
  - `register(ctx)` with `{ router, withTenantTx, rbac.require, log }`

## Non-goals (for 1.5)
- No SSO; a simple dev user is assumed (`req.auth.user_id = 'dev'`).
- No platform kill switches/metrics (live in core).
- No complex role editor UI (can be added later).

## Hand-off back to core
1) Copy `server/index.ts` + `client/*` into core plugin folder.
2) Keep `meta.api === '1.x'` and route namespace.
3) Enable for a test tenant via Admin API and run the Phase-1 gate matrix.
