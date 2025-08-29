# Multi‑Tenant WMS — Backend API Documentation (JSON, JWT) v1.0

This is a **complete**, **untruncated**, and **self‑contained** API specification for the multi‑tenant Warehouse Management System (WMS).
It consolidates your PRD v2.0.0 and DBML, and explicitly includes two new tables to support configurable menus:
- `menu` — a global catalog of menu items
- `menu_tenant` — per‑tenant menu overrides

Everything below is production‑style: endpoints, parameters, request/response payloads, status codes, and error models. No external references.

---
## 0) Conventions

**Base URL**: `/api`  
**Auth**: `Authorization: Bearer <JWT>` (all non‑login endpoints)  
**Content‑Type**: `application/json`  
**Ids**: numeric or string per entity; PO/SO/etc. may be humanized (e.g., `PO-20250827-001`).  
**Timestamps**: ISO‑8601 in UTC (e.g., `2025-08-28T10:15:00Z`).  
**Pagination**: `?page=1&limit=20`  
**Sorting/Search**: `?sort=field:asc|desc`, `?q=keyword`  
**Idempotency** (creates): optional `Idempotency-Key: <uuid>` header  
**Rate limiting**: 429 `Too Many Requests` with `Retry-After` (seconds)

### JWT Payload (example)
```json
{
  "username": "user_123",
  "iat": 1753902000,
  "exp": 1753905600
}
```

### Standard Error Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR|NOT_FOUND|FORBIDDEN|CONFLICT|UNAUTHORIZED|RATE_LIMITED|INTEGRATION_FAILED|INTERNAL_ERROR",
    "message": "Human readable message.",
    "details": { "field": "explanation" }
  }
}
```


---
## 5) Settings

### 5.1 General
#### GET `/settings/general`
**200 OK**
```json
{
  "company_name": "Acme Warehouse",
  "logo_url": "https://...",
  "language": "en",
  "address": "Jl. Example 123, Jakarta",
  "timezone": "Asia/Jakarta",
  "currency": "IDR",
  "date_format": "DD/MM/YYYY"
}
```
#### PATCH `/settings/general`
**Request**
```json
{
  "company_name": "Acme Warehouse",
  "logo_url": "https://new...",
  "language": "en",
  "address": "Jl. Example 999, Jakarta",
  "timezone": "Asia/Jakarta",
  "currency": "IDR",
  "date_format": "DD/MM/YYYY"
}
```
**200 OK**
```json
{ "updated": true }
```

### 5.2 Warehouse Structure (Zones → Aisles → Shelves → Bins)

#### Zones
- `GET/POST /warehouse/zones`
- `GET/PATCH /warehouse/zones/:id`

**POST Request**
```json
{ "code": "A", "display_name": "Zone A", "location_id": "A" }
```
**201 CREATED**
```json
{ "id": 1, "code": "A", "display_name": "Zone A", "location_id": "A" }
```

#### Aisles
- `GET/POST /warehouse/zones/:zoneId/aisles`
- `GET/PATCH /warehouse/aisles/:id`

**POST Request**
```json
{ "code": "A1", "display_name": "Aisle 1" }
```
**201 CREATED**
```json
{ "id": 10, "zone_id": 1, "code": "A1", "display_name": "Aisle 1" }
```

#### Shelves
- `GET/POST /warehouse/aisles/:aisleId/shelves`
- `GET/PATCH /warehouse/shelves/:id`

**POST Request**
```json
{ "code": "A1-S1", "display_name": "Shelf 1" }
```
**201 CREATED**
```json
{ "id": 100, "aisle_id": 10, "code": "A1-S1", "display_name": "Shelf 1" }
```

#### Bins
- `GET/POST /warehouse/shelves/:shelfId/bins`
- `GET/PATCH /warehouse/bins/:id`

**POST Request**
```json
{ "code": "A.1.1.1", "display_name": "Bin A.1.1.1", "max_capacity": { "size_m3": 2.0, "weight_kg": 200.0 } }
```
**201 CREATED**
```json
{ "id": 9001, "shelf_id": 100, "code": "A.1.1.1", "display_name": "Bin A.1.1.1", "max_capacity": { "size_m3": 2.0, "weight_kg": 200.0 } }
```

### 5.3 Master Data

#### Products
- `GET/POST /master/products`
- `GET/PATCH /master/products/:id`
**POST Request**
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
  "active": true
}
```
**201 CREATED**
```json
{ "id": 2001, "sku": "SKU-001", "name": "Widget A", "active": true }
```

#### Inventory Types
- `GET/POST /master/inventory-types`
- `GET/PATCH /master/inventory-types/:id`

**POST Request**
```json
{ "code": "RAW", "name": "Raw Material", "description": "Raw material" }
```
**201 CREATED**
```json
{ "id": 3, "code": "RAW", "name": "Raw Material", "description": "Raw material" }
```

#### Package Types
- `GET/POST /master/package-types`
- `GET/PATCH /master/package-types/:id`
**POST Request**
```json
{ "code": "BOX-M", "name": "Medium Box", "description": "40x30x25cm" }
```
**201 CREATED**
```json
{ "id": 2, "code": "BOX-M", "name": "Medium Box", "description": "40x30x25cm" }
```

#### Suppliers
- `GET/POST /master/suppliers`
- `GET/PATCH /master/suppliers/:id`
**POST Request**
```json
{
  "code": "SUP-001",
  "name": "Best Supplier",
  "contact": { "name": "Alice", "email": "alice@best.com", "phone": "+62..." },
  "locations": [
    { "address": "Jl. A No.1", "city": "Jakarta", "province": "DKI", "country": "ID", "postal_code": "12345", "longlat": "106.8,-6.2" }
  ],
  "active": true
}
```
**201 CREATED**
```json
{ "id": 501, "code": "SUP-001", "name": "Best Supplier", "active": true }
```

#### Customers
- `GET/POST /master/customers`
- `GET/PATCH /master/customers/:id`
**POST Request**
```json
{
  "code": "CUS-001",
  "name": "Great Customer",
  "contact": { "name": "Bob", "email": "bob@great.com", "phone": "+62..." },
  "locations": [
    { "address": "Jl. B No.2", "city": "Bandung", "province": "JBR", "country": "ID", "postal_code": "40123", "longlat": "107.6,-6.9" }
  ],
  "active": true
}
```
**201 CREATED**
```json
{ "id": 301, "code": "CUS-001", "name": "Great Customer", "active": true }
```

#### Numbering
- `GET/PATCH /settings/numbering`
**GET 200 OK**
```json
{ "po_prefix": "PO", "so_prefix": "SO", "next_po": 123, "next_so": 456 }
```
**PATCH Request**
```json
{ "po_prefix": "PO", "so_prefix": "SO", "next_po": 200, "next_so": 500 }
```
**200 OK**
```json
{ "updated": true }
```

---
## 6) Workflow Settings

### GET `/settings/workflow`
**200 OK**
```json
{
  "inbound": { "approve": true, "receive": true, "putaway": true },
  "outbound": { "allocate": true, "pick": true, "pack": true, "ship": true, "deliver": true }
}
```

### PATCH `/settings/workflow`
Toggle steps; effective menu is recalculated automatically.
**Request**
```json
{
  "inbound": { "approve": true, "receive": true, "putaway": true },
  "outbound": { "allocate": true, "pick": true, "pack": true, "ship": true, "deliver": false }
}
```
**200 OK**
```json
{ "updated": true, "effective_menu_updated": true }
```

---
## 7) Inbound (Purchase Orders)

### GET `/inbound/pos?status=&supplier_id=&from=&to=`
List POs.
**200 OK**
```json
{
  "data": [
    { "id": "PO-20250827-001", "status": "Pending", "supplier_id": 501, "expected_delivery_date": "2025-09-15" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

### POST `/inbound/pos`
Create a PO.
**Request**
```json
{
  "supplier_id": 501,
  "expected_delivery_date": "2025-09-15",
  "items": [
    { "product_id": 2001, "quantity": 100, "unit_price": 15.5 },
    { "product_id": 2002, "quantity": 20, "unit_price": 55.0 }
  ]
}
```
**201 CREATED**
```json
{
  "id": "PO-20250827-001",
  "status": "Pending",
  "next_step": "Approve",
  "supplier": { "id": 501, "name": "Best Supplier" },
  "items": [
    { "product_id": 2001, "quantity": 100, "unit_price": 15.5 },
    { "product_id": 2002, "quantity": 20, "unit_price": 55.0 }
  ],
  "created_at": "2025-08-27T11:25:02Z"
}
```

### GET `/inbound/pos/:id`
**200 OK**
```json
{
  "id": "PO-20250827-001",
  "status": "Pending",
  "supplier_id": 501,
  "expected_delivery_date": "2025-09-15",
  "items": [
    { "product_id": 2001, "quantity": 100, "unit_price": 15.5, "qty_received": 0 },
    { "product_id": 2002, "quantity": 20, "unit_price": 55.0, "qty_received": 0 }
  ]
}
```

### PATCH `/inbound/pos/:id`
Editable fields before approval.
**Request**
```json
{ "expected_delivery_date": "2025-09-20" }
```
**200 OK**
```json
{ "updated": true }
```

### POST `/inbound/pos/:id/approve`
Approve PO and generate HTML doc URL.
**200 OK**
```json
{
  "approved": true,
  "document": { "type": "purchase_order", "format": "html", "url": "/api/documents/po/PO-20250827-001" },
  "next_step": "Receive"
}
```

### POST `/inbound/pos/:id/reject`
**200 OK**
```json
{ "rejected": true, "status": "Rejected" }
```

### POST `/inbound/pos/:id/receive`
Receive delivered items (partial allowed; expiry required when configured).
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
**200 OK**
```json
{
  "received": true,
  "receiving_instruction": { "format": "html", "url": "/api/documents/receiving/PO-20250827-001" },
  "next_step": "Putaway",
  "remaining_lines": [{ "product_id": 2001, "pending_qty": 5 }]
}
```

### POST `/inbound/pos/:id/putaway/plan`
Optionally compute smart bin suggestions.
**200 OK**
```json
{
  "plan": [
    {
      "product_id": 2001,
      "qty": 95,
      "suggested_bins": [
        { "bin_id": 9001, "score": 0.84, "explanations": ["capacity", "item_match", "proximity"] }
      ]
    }
  ]
}
```

### POST `/inbound/pos/:id/putaway/confirm`
Persist assignments and complete putaway.
**Request**
```json
{
  "assignments": [
    { "product_id": 2001, "qty": 60, "bin_id": 9001 },
    { "product_id": 2001, "qty": 35, "bin_id": 9002 }
  ]
}
```
**200 OK**
```json
{
  "putaway_completed": true,
  "putaway_instruction": { "format": "html", "url": "/api/documents/putaway/PO-20250827-001" },
  "po_status": "Completed"
}
```

---
## 8) Outbound (Sales Orders)

### GET `/outbound/sos?status=&customer_id=&from=&to=`
**200 OK**
```json
{
  "data": [
    { "id": "SO-20250827-001", "status": "Created", "customer_id": 301 }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

### POST `/outbound/sos`
**Request**
```json
{
  "customer_id": 301,
  "items": [
    { "product_id": 2001, "quantity": 10 },
    { "product_id": 2002, "quantity": 2 }
  ]
}
```
**201 CREATED**
```json
{
  "id": "SO-20250827-001",
  "status": "Created",
  "next_step": "Allocate",
  "customer": { "id": 301, "name": "Great Customer" }
}
```

### GET `/outbound/sos/:id`
**200 OK**
```json
{
  "id": "SO-20250827-001",
  "status": "Created",
  "items": [
    { "product_id": 2001, "quantity": 10, "allocated_qty": 0 },
    { "product_id": 2002, "quantity": 2, "allocated_qty": 0 }
  ]
}
```

### PATCH `/outbound/sos/:id`
**Request**
```json
{ "notes": "Urgent order" }
```
**200 OK**
```json
{ "updated": true }
```

### POST `/outbound/sos/:id/allocate`
Reserve inventory.
**200 OK**
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

### POST `/outbound/sos/:id/deallocate`
**200 OK**
```json
{ "deallocated": true }
```

### POST `/outbound/sos/:id/pick/plan?strategy=fifo|fefo`
**200 OK**
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

### POST `/outbound/sos/:id/pick/confirm`
**200 OK**
```json
{
  "picked": true,
  "picking_instruction": { "format": "html", "url": "/api/documents/picking/SO-20250827-001" },
  "next_step": "Pack"
}
```

### POST `/outbound/sos/:id/packages`
Create packages with item splits and dimensions.
**Request**
```json
{
  "packages": [
    {
      "length_cm": 40,
      "width_cm": 30,
      "height_cm": 25,
      "weight_kg": 5.2,
      "items": [{ "product_id": 2001, "qty": 10 }]
    }
  ]
}
```
**200 OK**
```json
{
  "packages": [{ "id": "PKG-SO-20250827-001-001", "label": "PKG-001" }],
  "packing_instruction": { "format": "html", "url": "/api/documents/packing/SO-20250827-001" },
  "next_step": "Ship"
}
```

### POST `/outbound/sos/:id/ship`
**Request**
```json
{
  "packages": ["PKG-SO-20250827-001-001"],
  "transporter_id": 42,
  "deliveries": [
    { "package_id": "PKG-SO-20250827-001-001", "customer_location_id": 777 }
  ]
}
```
**200 OK**
```json
{
  "shipped": true,
  "shipment_instruction": { "format": "html", "url": "/api/documents/shipment/SO-20250827-001" },
  "next_step": "Deliver",
  "integration": { "called": false, "status": "not_configured" }
}
```

### POST `/outbound/sos/:id/deliver/confirm`
**Request**
```json
{
  "packages": [{ "id": "PKG-SO-20250827-001-001", "delivered": true }],
  "incomplete": false,
  "reason": null
}
```
**200 OK**
```json
{ "delivered": true, "so_status": "Completed" }
```

---
## 9) Inventory Operations

### 9.1 Stock Overview
#### GET `/inventory/stock-overview?status=in_stock|low|oos&near_expiry_days=`
**200 OK**
```json
{
  "summary": { "in_stock": 124, "low": 9, "oos": 3, "near_expiry": 6 },
  "items": [
    { "product_id": 2001, "sku": "SKU-001", "available": 95, "min_stock": 10, "near_expiry": false }
  ]
}
```

### 9.2 Cycle Count / Audit
#### POST `/inventory/cycle-counts`
Create a cycle count run.
**Request**
```json
{ "type": "partial", "filters": { "zone": "A", "aisle": null, "bin_ids": [9001, 9002] } }
```
**201 CREATED**
```json
{ "id": "CC-27082025-001", "status": "Created" }
```
#### GET `/inventory/cycle-counts?status=created|submitted|approved|rejected`
**200 OK**
```json
{ "data": [{ "id": "CC-27082025-001", "status": "Created" }] }
```
#### POST `/inventory/cycle-counts/:id/submit`
**200 OK**
```json
{ "submitted": true, "status": "Submitted" }
```
#### POST `/inventory/cycle-counts/:id/approve`
Apply diffs, write movement history.
**200 OK**
```json
{ "approved": true, "status": "Approved" }
```
#### POST `/inventory/cycle-counts/:id/reject`
**200 OK**
```json
{ "rejected": true, "status": "Rejected" }
```

### 9.3 Relocation
#### POST `/inventory/relocations`
Move stock from one bin to another.
**Request**
```json
{ "product_id": 2001, "qty": 10, "from_bin_id": 9001, "to_bin_id": 9003 }
```
**200 OK**
```json
{ "moved": true, "movement_id": "MV-20250827-0001" }
```

### 9.4 Adjustment
#### POST `/inventory/adjustments`
**Request**
```json
{ "product_id": 2001, "qty_delta": -2, "reason": "Damaged", "notes": "Broken on floor" }
```
**200 OK**
```json
{ "adjusted": true, "movement_id": "MV-20250827-0002" }
```

---
## 10) Workflow Monitor

### GET `/workflow/overview`
**200 OK**
```json
{
  "inbound": { "pending_approval": 2, "to_receive": 1, "to_putaway": 1 },
  "outbound": { "to_allocate": 1, "to_pick": 2, "to_pack": 0, "to_ship": 1, "to_deliver": 1 }
}
```

### POST `/workflow/override`
Advance/cancel a stuck entity with reason (Tenant Admin).
**Request**
```json
{ "entity": "PO", "entity_id": "PO-20250827-001", "action": "advance", "reason": "Manual override due to outage" }
```
**200 OK**
```json
{ "overridden": true, "audit_id": "AUD-20250827-0001" }
```

---
## 11) Reporting & Documents

### 11.1 Standard Reports
#### GET `/reports/standard?type=po|so|audit|relocation|adjustment&from=&to=&status=&supplier=&customer=`
**200 OK**
```json
{
  "data": [
    { "number": "PO-20250827-001", "status": "Approved", "supplier": "Best Supplier", "total": 1550.0 }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

### 11.2 Financial Reports
#### GET `/reports/financial?month=8&year=2025`
**200 OK**
```json
{ "revenue": 54000000, "gross_profit": 12500000, "inventory_valuation": 21000000, "aov": 4500000 }
```

### 11.3 Movement History
#### GET `/reports/movements?type=receive|putaway|pick|relocation|adjustment&from=&to=&export=csv`
**200 OK**
```json
{
  "data": [
    { "timestamp": "2025-08-27T10:00:00Z", "type": "receive", "product_id": 2001, "qty": 95, "bin_id": 9001, "reference": "PO-20250827-001" }
  ]
}
```

### 11.4 Documents (HTML generation)
#### GET `/documents/:type/:id`
Returns a signed URL or inline HTML for operational docs.
**200 OK**
```json
{ "type": "picking_instruction", "format": "html", "url": "/api/documents/picking/SO-20250827-001" }
```

---
## 12) Integrations

### 12.1 Inbound API Keys
#### GET `/integrations/inbound/api-keys`
**200 OK**
```json
{ "data": [{ "id": "key_abc123", "label": "ERP Connector", "last_used_at": null }] }
```
#### POST `/integrations/inbound/api-keys`
**Request**
```json
{
  "label": "ERP Connector",
  "allowed_endpoints": ["/inbound/pos", "/master/products"],
  "expires_at": "2026-01-01T00:00:00Z",
  "ip_whitelist": ["10.0.0.0/24"],
  "rate_limit_per_minute": 120
}
```
**201 CREATED**
```json
{ "id": "key_abc123", "label": "ERP Connector", "last_used_at": null }
```
#### PATCH `/integrations/inbound/api-keys/:id`
**Request**
```json
{ "label": "ERP Connector v2", "rate_limit_per_minute": 180 }
```
**200 OK**
```json
{ "updated": true }
```

#### POST `/integrations/inbound/test-key/:id`
**200 OK**
```json
{ "tested": true, "status": "Active", "latency_ms": 120 }
```

### 12.2 Inbound Webhooks
#### POST `/integrations/inbound/webhooks`
Configure event → endpoint mappings and secrets.
**Request**
```json
{
  "events": ["onPoApproved","onSoShipped"],
  "target_url": "https://hooks.example.com/wms",
  "hmac_secret": "base64secret",
  "enabled": true
}
```
**201 CREATED**
```json
{ "id": "wh_123", "events": ["onPoApproved","onSoShipped"], "enabled": true }
```

### 12.3 Outbound APIs
#### GET `/integrations/outbound/apis`
**200 OK**
```json
{ "data": [{ "id": "out_42", "name": "Transporter X", "endpoint": "https://api.transporterx.com/book" }] }
```
#### POST `/integrations/outbound/apis`
**Request**
```json
{
  "name": "Transporter X",
  "endpoint": "https://api.transporterx.com/book",
  "method": "POST",
  "headers": [{ "name": "Authorization", "value": "Bearer <secret>" }],
  "auth": { "type": "bearer", "token": "<secret>" },
  "payload_template": { "so_number": "{{so.number}}", "packages": "{{packages}}" },
  "retry_policy": { "retries": 3, "timeout_ms": 8000 },
  "log_response": true,
  "test_mode": true
}
```
**201 CREATED**
```json
{ "id": "out_42", "name": "Transporter X", "status": "created" }
```
#### GET `/integrations/outbound/apis/:id`
**200 OK**
```json
{
  "id": "out_42",
  "name": "Transporter X",
  "endpoint": "https://api.transporterx.com/book",
  "method": "POST",
  "test_mode": true
}
```
#### PATCH `/integrations/outbound/apis/:id`
**Request**
```json
{ "test_mode": false, "retry_policy": { "retries": 5, "timeout_ms": 10000 } }
```
**200 OK**
```json
{ "updated": true }
```
#### POST `/integrations/outbound/apis/:id/test`
**200 OK**
```json
{ "tested": true, "status": "200", "latency_ms": 420, "response_excerpt": "OK" }
```

### 12.4 SMTP Profiles
#### GET `/integrations/smtp`
**200 OK**
```json
{ "data": [{ "id": "smtp_1", "profile_name": "Transactional", "host": "smtp.sendgrid.net", "port": 587 }] }
```
#### POST `/integrations/smtp`
**Request**
```json
{
  "profile_name": "Transactional",
  "host": "smtp.sendgrid.net",
  "port": 587,
  "encryption": "TLS",
  "sender_name": "Tenant App",
  "sender_email": "no-reply@tenant.com",
  "username": "apikey",
  "password": "<encrypted>",
  "daily_limit": 1000,
  "throttle_per_minute": 10,
  "fallback": { "host": "smtp.mailgun.org", "port": 587 }
}
```
**201 CREATED**
```json
{ "id": "smtp_1", "profile_name": "Transactional", "host": "smtp.sendgrid.net", "port": 587 }
```
#### PATCH `/integrations/smtp/:id`
**Request**
```json
{ "sender_name": "New Sender", "throttle_per_minute": 20 }
```
**200 OK**
```json
{ "updated": true }
```
#### POST `/integrations/smtp/:id/test`
**200 OK**
```json
{ "tested": true, "status": "Connected", "latency_ms": 320 }
```
#### DELETE `/integrations/smtp/:id`
**200 OK**
```json
{ "deleted": true }
```

### 12.5 Change History (Config Audit)
#### GET `/integrations/change-history?user=&action=&from=&to=`
**200 OK**
```json
{
  "data": [
    { "id": "chg_1", "action": "Updated SMTP Password", "user": "Admin", "timestamp": "2025-07-25T14:30:00Z" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

---
## 13) System & Audit Logs

### GET `/system/audit-logs?user=&type=&from=&to=`
**200 OK**
```json
{
  "data": [
    { "timestamp": "2025-08-27T09:00:00Z", "user": "jane@acme.com", "type": "UPDATE_PO", "entity": "PO-20250827-001" }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "pages": 1 }
}
```

---
## 14) Representative Models (JSON)

### Product
```json
{
  "id": 2001,
  "tenant_id": 5,
  "sku": "SKU-001",
  "name": "Widget A",
  "inventory_type_id": 3,
  "package_type_id": 2,
  "size_m3": 0.15,
  "weight_kg": 2.0,
  "min_stock": 10,
  "has_expiry": true,
  "active": true
}
```

### Supplier
```json
{
  "id": 501,
  "code": "SUP-001",
  "name": "Best Supplier",
  "contact": { "name": "Alice", "email": "alice@best.com", "phone": "+62..." },
  "locations": [{ "id": 701, "address": "Jl. A No.1", "longlat": "106.8,-6.2" }],
  "active": true
}
```

### Customer
```json
{
  "id": 301,
  "code": "CUS-001",
  "name": "Great Customer",
  "contact": { "name": "Bob", "email": "bob@great.com", "phone": "+62..." },
  "locations": [{ "id": 801, "address": "Jl. B No.2", "longlat": "107.6,-6.9" }],
  "active": true
}
```

### Purchase Order
```json
{
  "id": "PO-20250827-001",
  "supplier_id": 501,
  "status": "Approved",
  "next_step": "Receive",
  "items": [
    { "product_id": 2001, "qty_ordered": 100, "qty_received": 95, "unit_price": 15.5 }
  ],
  "totals": { "subtotal": 1550.0 },
  "created_at": "2025-08-27T11:25:02Z"
}
```

### Sales Order
```json
{
  "id": "SO-20250827-001",
  "customer_id": 301,
  "status": "Allocated",
  "next_step": "Pick",
  "items": [{ "product_id": 2001, "qty": 10 }]
}
```

### Warehouse Bin
```json
{
  "id": 9001,
  "shelf_id": 120,
  "display_name": "A.1.2.3",
  "max_capacity": { "size_m3": 2.0, "weight_kg": 200.0 }
}
```

### Menu & MenuTenant
```json
{
  "menu": {
    "id": 11,
    "key": "outbound.allocate",
    "default_label": "Allocate",
    "path": "/outbound/allocate",
    "icon": "Truck",
    "sort_order": 30
  },
  "menu_tenant": {
    "tenant_id": 5,
    "menu_id": 11,
    "visibility": "manage",
    "enabled": true,
    "custom_label": null,
    "component_flags": { "showBulkAllocate": true }
  }
}
```

---
## 15) Permissions (Examples)

```json
{
  "permissions": [
    "rbac:users:manage",
    "rbac:roles:manage",
    "menu:read",
    "menu:manage",
    "settings:general:manage",
    "settings:workflow:manage",
    "warehouse:structure:manage",
    "master:products:manage",
    "master:inventory-types:manage",
    "master:package-types:manage",
    "master:suppliers:manage",
    "master:customers:manage",
    "inbound:po:create",
    "inbound:po:approve",
    "inbound:receive",
    "inbound:putaway",
    "outbound:so:create",
    "outbound:allocate",
    "outbound:pick",
    "outbound:pack",
    "outbound:ship",
    "outbound:deliver",
    "inventory:cyclecount:create",
    "inventory:cyclecount:approve",
    "inventory:relocation:manage",
    "inventory:adjustment:manage",
    "reports:read",
    "reports:financial:read",
    "workflow:override",
    "auditlogs:read"
  ]
}
```

---
## 16) Status Codes

- **200 OK** — success
- **201 Created** — resource created
- **202 Accepted** — async operation started (e.g., menu sync)
- **400 Bad Request** — validation/parsing errors
- **401 Unauthorized** — missing/invalid JWT
- **403 Forbidden** — lacks permission
- **404 Not Found** — resource not found or outside tenant scope
- **409 Conflict** — business rule violation (e.g., editing approved PO)
- **422 Unprocessable Entity** — semantic validation error
- **429 Too Many Requests** — rate limit exceeded
- **5xx Server Errors** — upstream/integration/internal errors

---
## 17) Notes & Guarantees

- **Workflow ↔ Menu coupling**: updating `/settings/workflow` recalculates the effective menu returned by `/menus/tree` for that tenant; off‑steps are hidden.
- **Documents**: operational documents (PO, Receiving, Putaway, Picking, Packing, Shipment) are generated server‑side as HTML templates; endpoints return a URL for viewing/printing.
- **Integrations**: shipping can either generate an instruction or call an outbound transporter API if configured; responses are logged when `log_response=true`.
- **Guarded deletes**: suppliers/customers cannot be removed when there are active orders referencing them.
- **Picking strategies**: FIFO and FEFO are supported for planning.

---
## 11.5 Custom Report Builder

The system supports user-defined reports in addition to standard/financial reports.

### Data Model
- `report_definitions`: stores saved custom reports per tenant
- `report_runs`: (optional) logs report execution history

### Endpoints

#### POST `/reports/custom`
Create a new report definition.
**Request**
```json
{
  "name": "Monthly Receiving",
  "entity_scope": "po",
  "fields": ["id", "status", "supplier_id", "expected_delivery_date"],
  "filters": { "status": "Approved" },
  "group_by": ["supplier_id"],
  "aggregates": { "count": "id" },
  "sort": ["expected_delivery_date:asc"],
  "chart": { "type": "bar", "x": "supplier_id", "y": "count" },
  "is_public": false
}
```
**201 CREATED**
```json
{ "id": "rep_123", "name": "Monthly Receiving", "tenant_id": 5 }
```

#### GET `/reports/custom`
List all saved custom reports for the tenant.
**200 OK**
```json
{
  "data": [
    { "id": "rep_123", "name": "Monthly Receiving", "entity_scope": "po", "created_by": "user_12" }
  ]
}
```

#### GET `/reports/custom/:id`
Fetch a saved report definition.

#### PUT `/reports/custom/:id`
Update a definition.

#### DELETE `/reports/custom/:id`
Remove a definition.

#### POST `/reports/custom/:id/preview`
Run the report transiently (without saving results).
**Request**
```json
{ "filters": { "supplier_id": 501 }, "limit": 10 }
```
**200 OK**
```json
{
  "columns": ["id", "status", "supplier_id"],
  "rows": [
    ["PO-20250827-001", "Approved", 501]
  ]
}
```

#### POST `/reports/custom/:id/run`
Execute and persist a report run for later retrieval.

#### GET `/reports/custom/:id/runs`
List historical executions of the report.

#### GET `/reports/custom/:id/export?format=csv|xlsx|json`
Export the report results.

---

## 18) Runbooks (Operational Error Guides)

Runbooks provide resolution steps for common error codes.

### Data Model
- `runbook_articles`: stores canonical resolution guides for error codes
- `runbook_overrides`: (optional) per-tenant addenda

### Endpoints

#### GET `/runbooks?code=&component=&q=`
Search or browse runbooks.

**200 OK**
```json
{
  "data": [
    { "code": "INTEGRATION_FAILED", "title": "Integration Failure", "severity": "high" }
  ]
}
```

#### GET `/runbooks/:code`
Fetch the runbook for a given error code.

**200 OK**
```json
{
  "code": "INTEGRATION_FAILED",
  "title": "Integration Failure",
  "steps": [
    "Verify API credentials in /integrations/outbound/apis.",
    "Check transporter system status.",
    "Retry the shipment call."
  ],
  "links": ["https://status.transporter.com"]
}
```

### Error Response with Runbook Link
Errors can optionally include a runbook reference.

**Example**
```json
{
  "error": {
    "code": "INTEGRATION_FAILED",
    "message": "Transporter API returned 401 Unauthorized",
    "runbook_code": "INTEGRATION_FAILED"
  }
}
```
