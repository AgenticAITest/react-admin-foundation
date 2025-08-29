# WMS TODO — Steps 22–30 (Corrected to Final API + DB Schema)
_Last updated: 2025-08-29_

This replaces your original **Steps 22–30** so they match **WMS_API_Documentation_basecode.md** and the consolidated DB schema.
Conventions: Base path `/api`, JSON bodies, JWT auth (`Authorization: Bearer <token>`), tenant‑scoped.

---

## STEP 22 — Inventory Overview & Analytics
**Objective:** Build dashboards from documented inventory endpoints (no ad‑hoc endpoints).

### 22A — Backend data sources (replace old endpoints)
- ✅ **Use** `GET /inventory/stock-overview?status=in_stock|low|oos&near_expiry_days=` — summary + item list
- ✅ **Use** `GET /reports/movements?type=receive|putaway|pick|relocation|adjustment&from=&to=&export=csv` — trends
- 🛑 **Remove** `GET /api/inventory/summary` (not in spec)

**Stock overview — sample 200**
```json
{
  "summary": { "in_stock": 124, "low": 9, "oos": 3, "near_expiry": 6 },
  "items": [{ "product_id": 2001, "sku": "SKU-001", "available": 95, "min_stock": 10, "near_expiry": false }]
}
```

### 22B — Dashboard UI
- **InventoryOverview.jsx**: metric cards (in_stock, low, oos, near_expiry), table with search/filter.
- Auto‑refresh optional; keep a manual refresh action for SMB/SME simplicity.

### 22C — Warning indicators
- Compute warning tiers from `min_stock` and `near_expiry_days` query.
- Color code in UI; **no extra backend**.

### 22D — (Re‑scoped) Movement trends
- **Bin utilization** is **not** exposed in the API; defer or add later as a report.
- For now: chart inbound/outbound trends using **/reports/movements** by type and date range.

---

## STEP 23 — Cycle Count & Audit
**Objective:** Use cycle‑count actions from Inventory Ops and standard adjustments for variances.

### 23A — Cycle count endpoints
- `POST /inventory/cycle-counts` — create
- `GET /inventory/cycle-counts?status=created|submitted|approved|rejected` — list
- `POST /inventory/cycle-counts/:id/submit` — submit for approval
- `POST /inventory/cycle-counts/:id/approve` — approve
- `POST /inventory/cycle-counts/:id/reject` — reject

> Variance application uses **Adjustments** (below), not a custom cycle‑count “apply” endpoint.

### 23B — Create flow (UI)
- **CreateCycleCount.jsx**: select scope (filters: zone/aisle/bins), schedule immediate vs scheduled.
- Assign to counter(s). Show status “Created/Submitted/Approved/Rejected”.

### 23C — Counting & variance
- Counting UI: capture counted qty per product/bin; compute deltas client‑side for preview.
- **Apply variances** by calling `POST /inventory/adjustments` per line with `reason: "CycleCountVariance"` and reference to the CC number in `notes`.

---

## STEP 24 — Inventory Movements (Relocation & Adjustment)
**Objective:** Use the documented relocation/adjustment endpoints. Remove ad‑hoc routes.

### 24A — Relocation (backend)
- `POST /inventory/relocations`
```json
{ "product_id": 2001, "qty": 10, "from_bin_id": 9001, "to_bin_id": 9003 }
```
**200**
```json
{ "moved": true, "movement_id": "MV-20250827-0001" }
```

### 24B — Relocation (UI)
- **InventoryRelocation.jsx**: pick source bin → current stock; choose destination bin (capacity check in UI); quantity; confirm.

### 24C — Adjustment (backend)
- `POST /inventory/adjustments`
```json
{ "product_id": 2001, "qty_delta": -2, "reason": "Damaged", "notes": "Broken on floor" }
```
**200**
```json
{ "adjusted": true, "movement_id": "MV-20250827-0002" }
```

### 24D — Adjustment (UI)
- **InventoryAdjustment.jsx**: reasons dropdown, validation (non‑zero deltas), optional approval flow **in UI** (no dedicated endpoint).

---

## STEP 25 — Workflow Monitoring & Overrides
**Objective:** Use workflow overview + entity details; use official override action.

### 25A — Backend data sources
- `GET /workflow/overview` — aggregate counters for inbound/outbound states
- `GET /inbound/pos/:id` and `GET /outbound/sos/:id` — entity detail and current status

### 25B — Monitor UI
- **WorkflowOverview.jsx**: show counters from `/workflow/overview`; drill‑down to filtered lists.

### 25C — PO/SO progress views
- **PurchaseOrderTracking.jsx**: show current step (Created→Approved→Received→Putaway→Completed).
- **SalesOrderTracking.jsx**: show current step (Created→Allocated→Picked→Packed→Shipped→Delivered).

### 25D — Admin Overrides
- `POST /workflow/override` with payload `{ "entity": "PO"|"SO", "entity_id": "...", "action": "advance|cancel", "reason": "..." }`
- Log reason; surface resulting audit id in UI.

---

## STEP 26 — Reporting & Documents
**Objective:** Use only the documented reports + documents endpoints.

### 26A — Standard reports
- `GET /reports/standard?type=po|so|audit|relocation|adjustment&from=&to=&status=&supplier=&customer=`

### 26B — Financial reports
- `GET /reports/financial?month=&year=` → revenue, gross_profit, inventory_valuation, aov

### 26C — Movement history
- `GET /reports/movements?type=receive|putaway|pick|relocation|adjustment&from=&to=&export=csv` (enable CSV export via `export=csv`)

### 26D — Documents
- `GET /documents/:type/:id` → returns `{ "format": "html", "url": "..." }` for PO/Receiving/Putaway/Picking/Packing/Shipment

> 🛑 Remove any custom `/api/admin/export` or “report builder” endpoints. If a custom builder is needed later, spec it separately.

---

## STEP 27 — Backups & Data Management (Process, not API)
**Objective:** Remove custom backup endpoints; use platform tools.

### 27A — Backups
- 🛑 **Remove** `POST /api/admin/backup` (not in spec).  
- **Use cloud DB backups** (provider‑native snapshots, PITR). Document schedule/retention.

### 27B — Data export/import
- **Export**: use `/reports/movements?export=csv` and master list endpoints (products/suppliers/customers) at the UI layer.
- **Import**: provide CSV templates + client‑side validation; server uses existing **create** endpoints (`POST /master/*`). No special import API.

### 27C — Tenant data console (UI)
- **TenantDataManagement.jsx**: show backup docs/links, export actions, and tenant info. No privileged endpoints.

---

## STEP 28 — DevOps, Environments & CI/CD
**Objective:** Infra deliverables with no server API changes.

- Env config: `.env.example` + validation on boot; secrets via provider
- CI: test → build → deploy; feature flags for non‑prod
- Deployment scripts: vendor‑specific (ECS/EKS, Azure Container Apps, Cloud Run) kept in `/infra/`

> Keep this step **API‑free**.

---

## STEP 29 — Production Database & Migration
**Objective:** Cloud DB setup, perf config, safe cut‑over. No app endpoints required.

- Parameter tuning, connection pooling, read replicas (if needed)
- Migration plan with downtime window or blue/green
- Observability: slow query logs, dashboards, alerts

---

## STEP 30 — Scalability & Performance
**Objective:** Load testing + optimizations; still no app endpoints.

- Load tests (arrival patterns, think time); capture SLIs/SLOs
- DB query tuning, indexes from slow log
- App metrics + APM instrumentation; caching where safe
- Performance report with recommendations

---

## Controller Guardrails (preserved)
- **MUST ASK** / **MUST PRESENT** / **MUST GET** gates remain as in your process.  
- SMB/SME simplification: prefer minimal flows; avoid heavy “realtime” unless explicitly justified.

