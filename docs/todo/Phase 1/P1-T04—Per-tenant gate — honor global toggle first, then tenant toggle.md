# P1-T04 — Per-tenant gate — honor global toggle first, then tenant toggle

**Goal**: Block routes when plugin is globally off, or tenant-disabled. Missing tenant row = disabled.

**Edit**: `src/server/lib/modules/route-registry.ts` (inside `mountModuleRoutes()`), place **before** route handler mount:
```ts
import { db } from '../db';

const gate = async (req: any, res: any, next: any) => {
  try {
    const tenantId = req.user?.activeTenantId || req.auth?.tenant_id;
    if (!tenantId) return res.status(401).json({ error: 'NO_TENANT' });

    // 1) Global toggle
    const p = await db.execute(
      `select enabled_global from sys_plugins where plugin_id = $1`,
      [config.id] as any
    );
    const enabledGlobal = ((p as any).rows ?? p)[0]?.enabled_global ?? false;
    if (!enabledGlobal) {
      res.setHeader('X-Plugin-Denied', 'global-off');
      return res.status(403).json({ error: 'PLUGIN_GLOBALLY_DISABLED', pluginId: config.id, tenantId });
    }

    // 2) Tenant toggle (missing row => disabled)
    const tp = await db.execute(
      `select enabled from sys_tenant_plugins where tenant_id = $1 and plugin_id = $2`,
      [tenantId, config.id] as any
    );
    const enabledTenant = ((tp as any).rows ?? tp)[0]?.enabled === true;
    if (!enabledTenant) {
      res.setHeader('X-Plugin-Denied', 'tenant-off');
      return res.status(403).json({ error: 'PLUGIN_DISABLED', pluginId: config.id, tenantId });
    }

    (req as any).pluginId = config.id;
    (req as any).tenantId = tenantId;
    next();
  } catch (e) {
    next(e);
  }
};

this.app.use(prefix, gate);
```

**Accept**:
- Global OFF → 403 with `X-Plugin-Denied: global-off`.
- Global ON + tenant missing/off → 403 with `X-Plugin-Denied: tenant-off`.
- Both enabled → normal 2xx.
