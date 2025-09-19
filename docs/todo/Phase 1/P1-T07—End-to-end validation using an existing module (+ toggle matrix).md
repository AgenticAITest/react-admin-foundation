# P1-T07 — End-to-end validation using an existing module (+ toggle matrix)

**Goal**: Validate namespace, gating, and toggles with a real module (e.g., `inventory`).

**Test endpoints**
- `/api/system/plugins`
- `/api/system/plugins/:pluginId/global`
- `/api/system/tenants/:tenantId/plugins/:pluginId`
- `/api/plugins/:pluginId/health`

**Matrix**
1. Global OFF, Tenant ON → `403 PLUGIN_GLOBALLY_DISABLED`
2. Global ON, Tenant MISSING → `403 PLUGIN_DISABLED`
3. Global ON, Tenant OFF → `403 PLUGIN_DISABLED`
4. Global ON, Tenant ON → `200`

**Steps (example)**
1) `PUT /api/system/plugins/inventory/global` `{ "enabled_global": true }`  
2) `PUT /api/system/tenants/<tenantId>/plugins/inventory` `{ "enabled": true }`  
3) `GET /api/plugins/inventory/health` → 200  
4) Flip tenant OFF → 403 (`X-Plugin-Denied: tenant-off`)  
5) Flip global OFF → 403 (`X-Plugin-Denied: global-off`)

**Legacy note**
- If legacy mount is temporarily kept, it should mirror the same behavior until removed.

**Accept**
- All four outcomes match expected responses.
