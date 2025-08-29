# WMS TODO — Steps 10–21 (Corrected to Final API + DB Schema)
_Last updated: 2025-08-29_

This replaces your original Steps 10–21 so they match **WMS_API_Documentation_basecode.md** and **WMS_Database_Schema_basecode.dbml**.  
Conventions: Base path `/api`, JSON bodies, JWT auth (`Authorization: Bearer <token>`), tenant‑scoped.

---

## STEP 10 — Master Data: **Products**
**Objective:** CRUD UI + backend using the documented **Products** endpoints.

### Endpoints
- `GET /master/products?search=&page=&limit=` — list with pagination/search
- `POST /master/products` — create
- `GET /master/products/:id` — detail
- `PATCH /master/products/:id` — partial update (no DELETE; deactivate via `PATCH`)

### Request examples
**POST** `/master/products`
```json
{
  "sku": "SKU-001",
  "name": "Widget A",
  "inventory_type_id": 3,
  "package_type_id": 2,
  "size_m3": 0.15,
  "weight_kg": 2.0,
  "min_stock": 10,
  "has_expiry": true,
  "barcode": "8991234567",
  "brand_id": 12,
  "active": true
}
```

### Response examples
**GET list 200**
```json
{
  "data": [{ "id": 2001, "sku": "SKU-001", "name": "Widget A", "active": true }],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```
**POST 201**
```json
{ "id": 2001, "sku": "SKU-001", "name": "Widget A", "active": true }
```

### Acceptance
- Uses `PATCH` for updates; **no** `DELETE`.  
- UI table columns: SKU, Name, Type, Package, Min Stock, Status, Actions.  
- Form validates required fields and positive numbers.

---

## STEP 11 — Master Data: **Suppliers & Customers**
**Objective:** CRUD for suppliers/customers including locations and contacts.

### Endpoints
- **Suppliers**  
  - `GET/POST /master/suppliers`  
  - `GET/PATCH /master/suppliers/:id`
- **Customers**  
  - `GET/POST /master/customers`  
  - `GET/PATCH /master/customers/:id`

### Shapes (create)
```json
{
  "code": "SUP-001",
  "name": "Best Supplier",
  "contact": { "name": "Alice", "email": "alice@best.com", "phone": "+62..." },
  "locations": [
    {
      "address": "Jl. A No.1",
      "city": "Jakarta",
      "province": "DKI",
      "country": "ID",
      "postal_code": "12345",
      "longlat": "106.8,-6.2"
    }
  ],
  "active": true
}
```
> Same schema for customers (`CUS-xxx`).

### Acceptance
- **No `DELETE`** endpoints; use `PATCH :id` to update or deactivate.  
- Server must **409** if entity is referenced by active orders.  
- List pages with search, pagination; detail pages with locations sub‑grid.

---

## STEP 12 — Warehouse Structure (Zones → Aisles → Shelves → Bins)
**Objective:** CRUD by level, not a generic “structure” API.

### Endpoints
- **Zones**: `GET/POST /warehouse/zones`, `GET/PATCH /warehouse/zones/:id`
- **Aisles**: `GET/POST /warehouse/zones/:zoneId/aisles`, `GET/PATCH /warehouse/aisles/:id`
- **Shelves**: `GET/POST /warehouse/aisles/:aisleId/shelves`, `GET/PATCH /warehouse/shelves/:id`
- **Bins**: `GET/POST /warehouse/shelves/:shelfId/bins`, `GET/PATCH /warehouse/bins/:id`

**Notes**
- Each entity uses `code`, `display_name`; **bin** exposes capacity (e.g., `max_capacity.size_m3`, `max_capacity.weight_kg`) and a human‑readable `code` like `"A.1.1.1"`.
- Auto‑generate hierarchical codes on create; **no** `DELETE` endpoints.

---

## STEP 13 — User & RBAC (UI only) + Menu visibility
**Objective:** Use existing RBAC/entitlements; do **not** add ad‑hoc `/users` APIs.

### Requirements
- Read current user entitlements and tenant from `/api/auth/user` (already present in base code).  
- Menu visibility follows **Workflow Settings** and per‑tenant menu overrides (schema includes `menu` and `menu_tenant`).  
- Provide an **Admin UI** to preview which menu items are visible given current workflow toggles.

**Acceptance**
- No public user/role CRUD in this phase.  
- Navigation guards rely on roles/permissions from the auth payload and menu/workflow settings.

---

## STEP 14 — Settings (General, Workflow, Numbering)
**Objective:** Implement exactly the three settings groups from the spec.

### Endpoints
- `GET/PATCH /settings/general`
- `GET/PATCH /settings/workflow`
- `GET/PATCH /settings/numbering`

**Workflow Settings** toggles the steps below and **recalculates effective menu** server‑side.

**Numbering** example (**GET 200**):
```json
{
  "po_prefix": "PO",
  "so_prefix": "SO",
  "next_po": 123,
  "next_so": 456
}
```

---

## STEP 15 — Purchase Orders (Create & Approve)
**Objective:** Create POs and approve using **action endpoints** (not generic status updates).

### Endpoints
- `GET /inbound/pos?status=&supplier_id=&from=&to=`
- `POST /inbound/pos`
- `GET /inbound/pos/:id`
- `PATCH /inbound/pos/:id` (editable fields before approval only)
- **Actions**:
  - `POST /inbound/pos/:id/approve`
  - `POST /inbound/pos/:id/reject`

**Notes**
- **Remove** “suggestions” endpoint from the todo.  
- On approve, server emits a **Purchase Order document** (HTML URL from `/documents`).

---

## STEP 16 — Receiving (Inbound)
**Objective:** Receive items (partial allowed), then move to Putaway.

### Endpoints
- `POST /inbound/pos/:id/receive`

**Request**
```json
{
  "lines": [
    { "product_id": 2001, "received_qty": 95, "expiry_date": "2026-12-31" },
    { "product_id": 2002, "received_qty": 20 }
  ],
  "close_if_incomplete": false,
  "reason_if_incomplete": "Partial shipment"
}
```
**Response 200**
```json
{
  "received": true,
  "next_step": "Putaway",
  "remaining_lines": [{ "product_id": 2001, "pending_qty": 5 }],
  "receiving_instruction": { "format": "html", "url": "/api/documents/receiving/PO-..." }
}
```

---

## STEP 17 — Putaway (Plan & Confirm)
**Objective:** Optional smart suggestions → confirm assignments → inventory updates & movement logs happen server‑side.

### Endpoints
- `POST /inbound/pos/:id/putaway/plan` — compute suggestions (optional)
- `POST /inbound/pos/:id/putaway/confirm` — persist assignments & complete

**Confirm Request**
```json
{
  "assignments": [
    { "product_id": 2001, "qty": 60, "bin_id": 9001 },
    { "product_id": 2001, "qty": 35, "bin_id": 9002 }
  ]
}
```

**Response 200**
```json
{
  "putaway_completed": true,
  "putaway_instruction": { "format": "html", "url": "/api/documents/putaway/PO-..." },
  "po_status": "Completed"
}
```

---

## STEP 18 — Sales Orders (Create)
**Objective:** Create SOs; **stock is reserved at allocation**, not at create time.

### Endpoints
- `GET /outbound/sos?status=&customer_id=&from=&to=`
- `POST /outbound/sos`
- `GET /outbound/sos/:id`

**POST body**
```json
{
  "customer_id": 301,
  "items": [
    { "product_id": 2001, "quantity": 10 },
    { "product_id": 2002, "quantity": 2 }
  ]
}
```

---

## STEP 19 — Allocation
**Objective:** Reserve inventory for an SO (or reverse it).

### Endpoints
- `POST /outbound/sos/:id/allocate`
- `POST /outbound/sos/:id/deallocate`

**Allocate 200**
```json
{
  "allocated": true,
  "items": [
    { "product_id": 2001, "allocated_qty": 10 },
    { "product_id": 2002, "allocated_qty": 2 }
  ],
  "next_step": "Pick"
}
```

---

## STEP 20 — Picking (Plan & Confirm)
**Objective:** Plan by FIFO/FEFO and confirm picks; generate picking instruction document.

### Endpoints
- `POST /outbound/sos/:id/pick/plan?strategy=fifo|fefo`
- `POST /outbound/sos/:id/pick/confirm`

**Plan 200 (shape excerpt)**
```json
{
  "plan": [
    {
      "product_id": 2001,
      "qty": 10,
      "bins": [
        { "bin_id": 9101, "qty": 6, "source": "expiry:2025-10-01" },
        { "bin_id": 9105, "qty": 4, "source": "expiry:2025-12-01" }
      ]
    }
  ]
}
```

**Confirm 200**
```json
{
  "picked": true,
  "picking_instruction": { "format": "html", "url": "/api/documents/picking/SO-..." },
  "next_step": "Pack"
}
```

---

## STEP 21 — Packing & Shipping
**Objective:** Create packages, then ship (optionally via integration), then deliver.

### Endpoints
- `POST /outbound/sos/:id/packages` — create packages and splits
- `POST /outbound/sos/:id/ship` — ship packages (returns shipment instruction)
- `POST /outbound/sos/:id/deliver/confirm` — (optional) confirm delivery

**Packages — Request**
```json
{
  "packages": [
    {
      "length_cm": 40,
      "width_cm": 30,
      "height_cm": 25,
      "weight_kg": 5.2,
      "items": [
        { "product_id": 2001, "qty": 6 },
        { "product_id": 2001, "qty": 4 }
      ]
    }
  ]
}
```

**Packages — 200**
```json
{
  "packages": [{ "id": "PKG-SO-20250827-001-001", "label": "PKG-001" }],
  "packing_instruction": { "format": "html", "url": "/api/documents/packing/SO-..." },
  "next_step": "Ship"
}
```

**Ship — Request**
```json
{
  "packages": ["PKG-SO-20250827-001-001"],
  "transporter_id": 42,
  "deliveries": [
    { "package_id": "PKG-SO-20250827-001-001", "customer_location_id": 777 }
  ]
}
```

**Ship — 200**
```json
{
  "shipped": true,
  "shipment_instruction": { "format": "html", "url": "/api/documents/shipment/SO-..." },
  "next_step": "Deliver",
  "integration": { "called": false, "status": "not_configured" }
}
```

---

## Done/Not‑Done checkpoints (use across steps)
- ✅ Uses `PATCH` instead of `PUT` for partial updates on master/settings.  
- ✅ No `DELETE` on master data; use deactivate flags via `PATCH`.  
- ✅ Inbound/outbound **workflow actions use `POST` action endpoints** (approve, receive, putaway, allocate, pick, packages, ship).  
- ✅ List endpoints return a `{ "data": [...], "pagination": { ... } }` object.  
- ✅ Documents are retrieved via `/documents/:type/:id` (server returns `{ "format": "html", "url": "..." }`).

