# Phase 1.5 — Module Sandbox (Dev Enablement)

## What it is
A tiny, self-contained **host app** that lets a Business Analyst (BA) build and run a **single business module** (plugin) *without* the core foundation. It mimics the core’s plugin contract so whatever works here will drop into the core with minimal edits.

## Why we’re doing this (objectives)
- **Unblock BA development**: Build CRUD screens and flows in Replit against a real Postgres (Neon) **without** waiting on core teams.
- **Freeze a clear contract**: Same URLs, same `PluginContext` shape, same `/health`—so code written here ports cleanly to core.
- **Fast feedback loop**: One repo, one process, hot-reload UI + API; minutes from idea → working screen.
- **Risk isolation**: No chance of breaking the foundation while experimenting.

## Definition of Done (success criteria)
- BA runs `npm run dev` in Replit and sees:
  - Web UI at the sandbox URL
  - Working API under `/api/plugins/<module-id>/*`
  - `/api/plugins/<module-id>/health` returns 200
  - **CRUD works** against a Neon schema dedicated to the dev tenant
- Module uses `withTenantTx` so **all DB hits** run in the tenant schema.
- No dependency on the foundation repo to develop UI/CRUD.
- When ready, the module’s `server/index.ts` + `client/*` can be copied into the core plugin folder and registers cleanly.

## What we’re *not* doing (non-goals for 1.5)
- No SSO, no production auth—just a simple dev tenant injected by middleware.
- No multi-tenant toggles, kill switches, or metrics dashboards (those live in core).
- No fancy RBAC—stubbed `rbac.require()` that always allows (the real RBAC is in core).

## How it works (at a glance)
- **Tech**: Express (API) + Vite/React (UI) in one process; Neon Postgres via **Drizzle**.
- **Bootstrap**:
  - Creates/ensures **public** table `sys_tenant`
  - Creates/ensures one **tenant schema** (e.g., `tenant_dev`)
  - Creates a sample **tenant table** (e.g., `items`)
- **Request flow**:
  - Dev middleware injects `req.auth.tenant_id = <devTenantId>`
  - Plugin routes live under `/api/plugins/<module-id>/*`
  - DB calls are wrapped in `withTenantTx(tenantId, run)` → sets `search_path` to the tenant schema for the request
- **Plugin contract mirrored**:
  - `meta: { id, version, api: '1.x' }`
  - `register(ctx)` with `{ router, withTenantTx, rbac.require, log }`
  - Must expose `GET /health`

## Who uses it & how
- **BA**
  1) Open Sandbox repo in Replit  
  2) Set secret `DATABASE_URL` (Neon)  
  3) Run `npm run dev`  
  4) Build screens + CRUD; keep endpoints under `/api/plugins/<module-id>`
- **Core programmer**
  - Answers contract questions, not day-to-day feature coding
  - Later, lifts the module into the core’s `plugins/<module-id>/` folder

## Deliverables the programmer will set up
- **Server**: `sandbox/server.ts` (host), `server/index.ts` (plugin entry)
- **DB**: `db/client.ts` (pool + drizzle), `sandbox/bootstrap.ts`, `sandbox/withTenantTx.ts`
- **UI**: `client/index.html`, `client/src/main.tsx` as a minimal page hitting `/api/plugins/<module-id>/items`
- **Env**: `.env` with `DATABASE_URL`, plus optional `DEV_TENANT_SCHEMA`

## Guardrails we care about
- **Tenant isolation**: Every write/read runs under `withTenantTx` (enforces `search_path` per request).
- **Contract fidelity**: URLs, `PluginContext`, and `/health` match Phase-1 spec.
- **Real database**: No in-memory DB; always Neon + Drizzle.

## Hand-off back to core (when BA says “done”)
1) Copy `server/index.ts` (routes/business logic) and `client/*` (React screens) into core’s plugin folder.
2) Ensure `meta.api === '1.x'`, plugin id matches folder name, and paths are still `/api/plugins/<id>/*`.
3) Enable for a test tenant via the **Admin API** (Phase-1 T05).
4) Run the Phase-1 toggle matrix (T07) to confirm behavior in core.

## Mini-milestones (what the sandbox will provide)
1) **Bootstrapped dev tenant** (public `sys_tenant` + `tenant_dev` schema)  
2) **withTenantTx** helper (per-request `search_path`)  
3) **Plugin host** with `/api/plugins/<module-id>/health`  
4) **Sample CRUD** (`GET/POST /items`) stored in tenant schema  
5) **Minimal React page** listing/adding items  
6) **Template repo** a BA can fork in Replit without CLI
