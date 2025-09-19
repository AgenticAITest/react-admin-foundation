import { Router } from 'express';
import postgres from 'postgres';
import { authenticated, superAdminOnly } from '../../middleware/authMiddleware';

const r = Router();
r.use(authenticated(), superAdminOnly());

// List all plugins (includes global flag)
r.get('/plugins', async (_req, res, next) => {
  try {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      const rows = await sql`
        select plugin_id, api_version, version_installed, enabled_global
        from sys_plugins
        order by plugin_id
      `;
      res.json(rows);
    } finally {
      await sql.end();
    }
  } catch (e) { 
    next(e); 
  }
});

// View/flip tenant plugin enablement
r.get('/tenants/:tenantId/plugins', async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      const rows = await sql`
        select p.plugin_id,
               coalesce(tp.enabled, false) as enabled,
               coalesce(tp.version_installed, p.version_installed) as version_installed
        from sys_plugins p
        left join sys_tenant_plugins tp
          on tp.plugin_id = p.plugin_id and tp.tenant_id = ${tenantId}
        order by p.plugin_id
      `;
      res.json(rows);
    } finally {
      await sql.end();
    }
  } catch (e) { 
    next(e); 
  }
});

r.put('/tenants/:tenantId/plugins/:pluginId', async (req, res, next) => {
  try {
    const { tenantId, pluginId } = req.params;
    const { enabled } = req.body ?? {};

    const sql = postgres(process.env.DATABASE_URL!);
    try {
      // Get version from sys_plugins
      const versionResult = await sql`
        select version_installed from sys_plugins where plugin_id = ${pluginId}
      `;
      const version = versionResult[0]?.version_installed;
      if (!version) return res.status(404).json({ error: 'PLUGIN_NOT_FOUND' });

      // Upsert tenant plugin setting
      await sql`
        insert into sys_tenant_plugins(tenant_id, plugin_id, enabled, version_installed)
        values (${tenantId}, ${pluginId}, ${!!enabled}, ${version})
        on conflict (tenant_id, plugin_id)
        do update set enabled = ${!!enabled}, version_installed = ${version}, updated_at = now()
      `;

      res.json({ ok: true, tenantId, pluginId, enabled: !!enabled });
    } finally {
      await sql.end();
    }
  } catch (e) { 
    next(e); 
  }
});

// Global hard toggle
r.put('/plugins/:pluginId/global', async (req, res, next) => {
  try {
    const { pluginId } = req.params;
    const { enabled_global } = req.body ?? {};
    
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      const updateResult = await sql`
        update sys_plugins 
        set enabled_global = ${!!enabled_global}, updated_at = now()
        where plugin_id = ${pluginId}
        returning plugin_id, enabled_global
      `;
      const row = updateResult[0];
      if (!row) return res.status(404).json({ error: 'PLUGIN_NOT_FOUND' });
      res.json({ ok: true, pluginId, enabled_global: row.enabled_global });
    } finally {
      await sql.end();
    }
  } catch (e) { 
    next(e); 
  }
});

export default r;