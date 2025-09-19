# P1-T05 — Admin API — list & toggle (tenant) + global toggle

**Goal**: Management endpoints for operators.

**Create**: `src/server/routes/system/plugin-admin.ts`
```ts
import { Router } from 'express';
import { db } from '../../lib/db';
import { authenticated, superAdminOnly } from '../../middleware/authMiddleware';

const r = Router();
r.use(authenticated(), superAdminOnly());

// List all plugins (includes global flag)
r.get('/plugins', async (_req, res, next) => {
  try {
    const rows = await db.execute(
      `select plugin_id, api_version, version_installed, enabled_global
       from sys_plugins
       order by plugin_id`
    );
    res.json((rows as any).rows ?? rows);
  } catch (e) { next(e); }
});

// View/flip tenant plugin enablement
r.get('/tenants/:tenantId/plugins', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const rows = await db.execute(
      `select p.plugin_id,
              coalesce(tp.enabled,false) as enabled,
              coalesce(tp.version_installed, p.version_installed) as version_installed
       from sys_plugins p
       left join sys_tenant_plugins tp
         on tp.plugin_id = p.plugin_id and tp.tenant_id = $1
       order by p.plugin_id`,
      [tenantId] as any
    );
    res.json((rows as any).rows ?? rows);
  } catch (e) { next(e); }
});

r.put('/tenants/:tenantId/plugins/:pluginId', async (req, res, next) => {
  try {
    const { tenantId, pluginId } = req.params;
    const { enabled } = req.body ?? {};

    const ver = await db.execute(
      `select version_installed from sys_plugins where plugin_id=$1`,
      [pluginId] as any
    );
    const version = ((ver as any).rows ?? ver)[0]?.version_installed;
    if (!version) return res.status(404).json({ error: 'PLUGIN_NOT_FOUND' });

    await db.execute(
      `insert into sys_tenant_plugins(tenant_id, plugin_id, enabled, version_installed)
       values ($1,$2,$3,$4)
       on conflict (tenant_id, plugin_id)
       do update set enabled=$3, version_installed=$4, updated_at=now()`,
      [tenantId, pluginId, !!enabled, version] as any
    );

    res.json({ ok: true, tenantId, pluginId, enabled: !!enabled });
  } catch (e) { next(e); }
});

// Global hard toggle
r.put('/plugins/:pluginId/global', async (req, res, next) => {
  try {
    const { pluginId } = req.params;
    const { enabled_global } = req.body ?? {};
    const upd = await db.execute(
      `update sys_plugins set enabled_global = $1, updated_at = now()
       where plugin_id = $2
       returning plugin_id, enabled_global`,
      [!!enabled_global, pluginId] as any
    );
    const row = ((upd as any).rows ?? upd)[0];
    if (!row) return res.status(404).json({ error: 'PLUGIN_NOT_FOUND' });
    res.json({ ok: true, pluginId, enabled_global: row.enabled_global });
  } catch (e) { next(e); }
});

export default r;
```

**Edit**: `src/server/main.ts`
```ts
import pluginAdmin from './routes/system/plugin-admin';
app.use('/api/system', pluginAdmin);
```

**Accept**:
- `GET /api/system/plugins` shows `enabled_global`.
- `PUT /api/system/plugins/:pluginId/global` flips global flag.
- `PUT /api/system/tenants/:tenantId/plugins/:pluginId` flips tenant flag.
