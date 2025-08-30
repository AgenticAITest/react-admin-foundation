# WMS Development Breakdown & Checklist

This document outlines the detailed development tasks from **Step 10** onwards, fully aligned with the final versions of the **PRD**, **ERD**, and **API** documentation.

---

## Conventions

- **[ ]**: Checklist item to be marked as complete upon execution.  
- **API Documentation**: `./docs/WMS_API_Documentation_basecode.md`  
- **Database Schema**: `./docs/WMS_Database_Schema_basecode.dbml`  

### API Development Rules
When creating new APIs, you **MUST** follow these steps:

1. Create the routes following the API documentation patterns.  
2. Add proper **JSDoc/OpenAPI** comments to each endpoint.  
3. Ensure the new routes are included in the **Swagger** scanning paths.  
4. Test that the new endpoints appear correctly in the **/api-docs** interface.  

> **Database Guardrail:** Do **NOT** modify tables or fields other than what is defined in `./docs/WMS_Database_Schema_basecode.dbml` when creating any API.

---

## STEP 10 — Master Data: Products & Inventory Types

**Objective:** Implement the full backend and frontend for managing products and their related inventory types.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**: Must present a detailed approach and get explicit approval before execution.  
- ❓ **MUST ASK**: Do you have existing inventory data, field requirements, or business rules preferences?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface design, and validation rules.  
- ✅ **MUST GET**: Explicit “Yes, proceed” before writing any code.

### API Development Instructions
For the following tasks, you **MUST** adhere to the API development rules above. Use the data models and endpoints defined in `./docs/WMS_API_Documentation_basecode.md` and **do not** modify tables or fields outside `./docs/WMS_Database_Schema_basecode.dbml`.

- [ ] Implement API for **Products**.  
- [ ] Create endpoints:  
  - `GET /master/products`  
  - `POST /master/products`  
  - `GET /master/products/:id`  
  - `PATCH /master/products/:id`  
- [ ] Implement API for **Product Types**.  
- [ ] Create endpoints:  
  - `GET /master/product-types`  
  - `POST /master/product-types`  
  - `GET /master/product-types/:id`  
  - `PATCH /master/product-types/:id`

### Frontend UI Instructions (React)
- [ ] Build **Products** UI.  
  - [ ] Page for paginated list with search/filter.  
  - [ ] Forms for creating and editing products.  
- [ ] Build **Product Types** UI.  
  - [ ] Page for paginated list.  
  - [ ] Forms for creating and editing product types.

---

## STEP 11 — Master Data: Package Types

**Objective:** Implement the full backend and frontend for managing different package types.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Package Types**.  
- [ ] Create endpoints:  
  - `GET /master/package-types`  
  - `POST /master/package-types`  
  - `GET /master/package-types/:id`  
  - `PATCH /master/package-types/:id`

### Frontend UI Instructions (React)
- [ ] Build **Package Types** UI.  
  - [ ] Paginated list with search.  
  - [ ] Forms for create/edit.

---

## STEP 12 — Master Data: Suppliers & Customers

**Objective:** Implement the full backend and frontend for managing suppliers and customers.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Suppliers** and **Supplier Locations**.  
  - Endpoints:  
    - `GET /master/suppliers`  
    - `POST /master/suppliers`  
    - `GET /master/suppliers/:id`  
    - `PATCH /master/suppliers/:id`  
    - Nested location endpoints (as per API docs).  
- [ ] Implement API for **Customers** and **Customer Locations**.  
  - Endpoints:  
    - `GET /master/customers`  
    - `POST /master/customers`  
    - `GET /master/customers/:id`  
    - `PATCH /master/customers/:id`  
    - Nested location endpoints (as per API docs).

### Frontend UI Instructions (React)
- [ ] Build **Suppliers** UI.  
  - [ ] Paginated list page.  
  - [ ] Forms for create/edit, including locations.  
- [ ] Build **Customers** UI.  
  - [ ] Paginated list page.  
  - [ ] Forms for create/edit, including locations.

---

## STEP 13 — Warehouse Setup: Zones, Aisles, Shelves, Bins

**Objective:** Implement the backend and frontend for the 4‑level warehouse hierarchy.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Warehouses**.  
  - Endpoints: `GET /warehouse`, `POST /warehouse`, `GET /warehouse/:id`, `PATCH /warehouse/:id`.  
- [ ] Implement API for **Zones, Aisles, Shelves, and Bins** with nested endpoints:  
  - `/warehouse/zones`, `/warehouse/aisles`, `/warehouse/shelves`, `/warehouse/bins` (see API docs).

### Frontend UI Instructions (React)
- [ ] Build **Warehouse Structure** UI.  
  - [ ] Visualization/management page for hierarchy.  
  - [ ] Forms to create/manage zones, aisles, shelves, bins.

---

## STEP 14 — Inventory Inbound Workflow

**Objective:** Implement the **Purchase Order (PO)** receiving workflow, including approval and putaway.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Purchase Orders**.  
  - Endpoints: `GET /inbound/pos`, `POST /inbound/pos`, `GET /inbound/pos/:id`, `PATCH /inbound/pos/:id`.  
- [ ] Implement **PO approval & receiving**:  
  - `POST /inbound/pos/:id/approve`  
  - `POST /inbound/pos/:id/receive`  
  - `POST /inbound/pos/:id/putaway` (as per API docs)

### Frontend UI Instructions (React)
- [ ] Build **Inbound workflow** UI.  
  - [ ] Manage **Purchase Orders** page.  
  - [ ] UI for **Approve PO**, **Receive Items**, and **Putaway**.

---

## STEP 15 — Inventory Outbound Workflow

**Objective:** Implement the **Sales Order (SO)** fulfillment workflow: allocation, picking, packing, shipping.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Sales Orders**.  
  - Endpoints: `GET /outbound/sos`, `POST /outbound/sos`, `GET /outbound/sos/:id`, `PATCH /outbound/sos/:id`.  
- [ ] Implement **SO allocation, picking, packing**:  
  - `POST /outbound/sos/:id/allocate`  
  - `POST /outbound/sos/:id/pick`  
  - `POST /outbound/sos/:id/pack`  
- [ ] Implement **Shipping & Delivery**:  
  - `POST /outbound/sos/:id/ship`  
  - `POST /outbound/sos/:id/deliver`

### Frontend UI Instructions (React)
- [ ] Build **Outbound workflow** UI.  
  - [ ] Manage **Sales Orders** page.  
  - [ ] UI for **Allocate**, **Pick**, **Pack**, **Ship**, **Deliver** steps.

---

## STEP 16 — Inventory Operations: Cycle Count & Relocation

**Objective:** Implement APIs and UI for managing inventory audits and relocations.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Cycle Counts**.  
  - Endpoints: `GET /inventory/cycle-counts`, `POST /inventory/cycle-counts`, `GET /inventory/cycle-counts/:id`, `PATCH /inventory/cycle-counts/:id`.  
- [ ] Implement API for **Relocations**.  
  - Endpoint: `POST /inventory/relocation`.

### Frontend UI Instructions (React)
- [ ] Build **Inventory Operations** UI.  
  - [ ] Page to manage/perform cycle counts.  
  - [ ] Page or modal for relocating inventory items.

---

## STEP 17 — Reporting & Dashboards

**Objective:** Implement APIs and UI for generating reports and displaying key metrics.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Dashboard metrics** (e.g., `GET /reports/dashboard`).  
- [ ] Implement API for **Standard reports**:  
  - `GET /reports/inventory-summary`  
  - `GET /reports/movement-history`  
  - `GET /reports/audit-logs`

### Frontend UI Instructions (React)
- [ ] Build **Dashboards and Reports** UI.  
  - [ ] Main dashboard with charts and metric cards.  
  - [ ] Dedicated pages for each standard report.

---

## STEP 18 — User Management & RBAC

**Objective:** Implement the UI for user and role management, fully utilizing the existing RBAC backend.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Role & Permission Management**:  
  - `GET /auth/roles`, `POST /auth/roles`, `PATCH /auth/roles/:id`  
  - Similar endpoints for **permissions** (as per API docs).

### Frontend UI Instructions (React)
- [ ] Build **User Management** UI.  
  - [ ] Admin page to manage users (create/edit/deactivate).  
  - [ ] UI to assign roles to users.  
- [ ] Build **Role Management** UI.  
  - [ ] Admin page to create/edit roles and assign permissions.

---

## STEP 19 — Menu & Navigation Management

**Objective:** Implement the UI and API for the configurable menu structure.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Menu Management** (backed by `sys_menu` in DB).  
  - Endpoints include fetch and create/update menu items (see API docs).

### Frontend UI Instructions (React)
- [ ] Build **Menu Management** UI.  
  - [ ] Admin-only page to manage the menu hierarchy.  
  - [ ] Render main navigation dynamically based on roles + menu API data.

---

## STEP 20 — Configurable Workflow Editor

**Objective:** Implement the UI that allows tenants to visually configure their workflows, as specified in the PRD.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: Existing data/fields/business rules?  
- 🔍 **MUST PRESENT**: Proposed data model, CRUD interface, validation rules.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API to **create/update workflows** under `/settings/workflows`.  
- [ ] Save to `workflow_templates` and `workflow_steps` tables (see DB schema).

### Frontend UI Instructions (React)
- [ ] Build **Visual Workflow Editor** UI.  
  - [ ] Drag-and-drop builder for custom inbound/outbound workflows.  
  - [ ] Persist configuration via the new endpoints.

---

## STEP 21 — Logging, Auditing & Events

**Objective:** Implement APIs and UI for logging, auditing, and event management.

### Mandatory Approval & Planning
- 🚨 **MANDATORY APPROVAL REQUIRED**  
- ❓ **MUST ASK**: What are your log retention policies, required audit fields, or specific event trigger needs?  
- 🔍 **MUST PRESENT**: Proposed logging/auditing framework, event notification mechanisms, and a sample audit trail.  
- ✅ **MUST GET**: Explicit go-ahead before coding.

### API Development Instructions
- [ ] Implement API for **Audit Logs**:  
  - `GET /logs/audit`  
- [ ] Implement API for **Events**:  
  - `GET /events`, `GET /events/:id`

### Frontend UI Instructions (React)
- [ ] Build **Audit Logs** UI (searchable, filterable).  
- [ ] Build **Events** UI (listing + detail).

---

## STEP 22 — Inventory Overview & Analytics

**Objective:** Build dashboards from documented inventory endpoints (no ad‑hoc endpoints).

### 22A — Backend data sources (replace old endpoints)
- ✅ Use `GET /inventory/stock-overview?status=in_stock|low|oos&near_expiry_days=` — summary + item list  
- ✅ Use `GET /reports/movements?type=receive|putaway|pick|relocation|adjustment&from=&to=&export=csv` — trends  
- 🛑 Remove `GET /api/inventory/summary` (not in spec)

**Stock overview — sample 200**
```json
{
  "summary": { "in_stock": 124, "low": 9, "oos": 3, "near_expiry": 6 },
  "items": [{ "product_id": 2001, "sku": "SKU-001", "available": 95, "min_stock": 10, "near_expiry": false }]
}
```

### 22B — Dashboard UI
- `InventoryOverview.jsx`: metric cards (in_stock, low, oos, near_expiry), table for stock, and chart for movements.

---

## STEP 23 — Document & Label Generation

**Objective:** Backend + UI for on‑demand document generation using the documented endpoints.

- ✅ Backend: Use `POST /documents/generate` for PDF/HTML generation, no ad‑hoc endpoints.  
- ✅ Frontend: Build a “Generate Labels” UI that sends requests to the `POST` endpoint and displays the returned document URL for printing.

---

## STEP 24 — Webhooks & Integration Setup

**Objective:** Backend + UI for configuring outbound webhooks.

### 24A — Backend
- ✅ Use: `GET /integrations/webhooks`, `POST /integrations/webhooks` for CRUD on webhooks.  
- ✅ Use: `GET /integrations/webhook-events` to list available events.

### 24B — Webhook UI
- `Webhooks.jsx`: manage webhooks, select event, enter URL, toggle active.

---

## STEP 25 — Runbooks & Error Handling

**Objective:** Backend + UI to provide structured error resolution guides.

### 25A — Backend
- ✅ Use: `GET /runbooks?code=&q=` to search, and `GET /runbooks/:code` to fetch details.

### 25B — Runbook UI
- `Runbooks.jsx`: searchable list of runbooks.  
- `RunbookDetail.jsx`: display steps, links, related info.

---

## STEP 26 — Custom Report Builder

**Objective:** Backend + UI to let users build custom reports.

### 26A — Backend
- ✅ Use: `POST /reports/custom` to save a custom report definition (JSON payload).  
- ✅ Use: `POST /reports/custom/:id/run` to execute a report.

### 26B — Report Builder UI
- `ReportBuilder.jsx`: drag‑and‑drop columns, filters, aggregations.  
- `ReportViewer.jsx`: display results of a report run.

---

## STEP 27 — Tenant & Data Management

**Objective:** Tools for managing tenant data (import/export).

### 27A — Backend: No specific API changes needed
- **Data Import**: Use existing create endpoints (`POST /master/*`).  
- **Data Export**: Use existing report endpoints with `export=csv|xlsx`.

### 27B — Data Import UI
- `DataImport.jsx`: upload CSV templates and validate client‑side before sending.

### 27C — Tenant data console (UI)
- `TenantDataManagement.jsx`: backup docs/links, export actions, tenant info. No privileged endpoints.

---

## STEP 28 — DevOps, Environments & CI/CD

**Objective:** Infra deliverables with no server API changes.

- Env config: `.env.example` + validation on boot; secrets via provider.  
- CI: test → build → deploy; feature flags for non‑prod.  
- Deployment scripts: vendor‑specific (ECS/EKS, Azure Container Apps, Cloud Run) kept in `/infra/`.  

> Keep this step **API‑free**.

---

## STEP 29 — Production Database & Migration

**Objective:** Cloud DB setup, performance config, safe cut‑over. No app endpoints required.

- Parameter tuning, connection pooling, read replicas (if needed).  
- Migration plan with downtime window or blue/green.  
- Observability: slow query logs, dashboards, alerts.  

---

## STEP 30 — Scalability & Performance

**Objective:** Load testing + optimizations; still no app endpoints.

- Load tests (arrival patterns, think time); capture SLIs/SLOs.  
- DB query tuning, indexes from slow log.  
- App metrics + APM instrumentation; caching where safe.  
- Performance report with recommendations.  

---

## Controller Guardrails (Preserved)

- **MUST ASK / MUST PRESENT / MUST GET** gates remain as in your process.  
- **SMB/SME simplification**: prefer minimal flows; avoid heavy “realtime” unless explicitly justified.
