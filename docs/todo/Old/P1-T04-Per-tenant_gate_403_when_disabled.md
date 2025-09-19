# P1-T04 — Per-tenant gate (403 when disabled)

**Goal**: Block all plugin routes for tenants where the plugin is disabled.

**Edit**: `src/server/lib/modules/route-registry.ts`, inside `mountModuleRoutes()` **before** `this.app.use(prefix, router)`
```ts
import { db } from '../db';

const gate = async (req: any, res: any, next: any) => {
  try {
    const tenantId = req.user?.activeTenantId || req.auth?.tenant_id;
    if (!tenantId) return res.status(401).json({ error: 'NO_TENANT' });

    const result = await db.execute(
      `select enabled from sys_tenant_plugins where tenant_id = $1 and plugin_id = $2`,
      [tenantId, config.id] as any
    );
    const enabled = Array.isArray(result) ? (result as any)[0]?.enabled : (result as any).rows?.[0]?.enabled;

    if (!enabled) return res.status(403).json({ error: 'PLUGIN_DISABLED', pluginId: config.id, tenantId });

    (req as any).pluginId = config.id;
    (req as any).tenantId = tenantId;
    next();
  } catch (e) { next(e); }
};

this.app.use(prefix, gate);
```

**Accept**:
- Disabled → `403 { error: "PLUGIN_DISABLED", ... }`.
- Enabled (after T05) → normal 200s.

---
