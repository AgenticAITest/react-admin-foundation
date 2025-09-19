// server/index.ts
import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';

type PluginContext = {
  router: import('express').Router;
  rbac: { require: (perm: string) => import('express').RequestHandler };
  withTenantTx: <T>(tenantId: string, run: (db: any) => Promise<T>) => Promise<T>;
  log: (msg: string, meta?: object) => void;
};

const MODULE_ID = 'sample';

// Permissions this plugin uses (seeded by the sandbox host)
export const permissions = [
  `${MODULE_ID}.items.read`,
  `${MODULE_ID}.items.create`,
  `${MODULE_ID}.items.update`,
  `${MODULE_ID}.items.delete`,
];

const plugin = {
  meta: { id: MODULE_ID, version: '0.1.0', api: '1.x' },

  async register(ctx: PluginContext) {
    ctx.log(`Registering ${MODULE_ID} plugin`, { version: this.meta.version });

    // Health check endpoint
    ctx.router.get('/health', (_req: Request, res: Response) => {
      res.json({ 
        ok: true, 
        plugin: MODULE_ID, 
        version: this.meta.version,
        timestamp: new Date().toISOString()
      });
    });

    // READ - Get all items (with RBAC)
    ctx.router.get('/items', ctx.rbac.require(`${MODULE_ID}.items.read`), async (req: any, res: Response) => {
      try {
        const tenantId = req.auth?.tenant_id;
        if (!tenantId) {
          return res.status(400).json({ error: 'TENANT_REQUIRED' });
        }

        const rows = await ctx.withTenantTx(tenantId, async (db) => {
          const r = await db.execute(sql`select id, name, created_at from items order by created_at desc`);
          return (r as any).rows ?? r;
        });

        res.json(rows);
      } catch (error) {
        ctx.log('Error fetching items', { error: error.message });
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    });

    // CREATE - Create new item (with RBAC and validation)
    ctx.router.post('/items', ctx.rbac.require(`${MODULE_ID}.items.create`), async (req: any, res: Response) => {
      try {
        const tenantId = req.auth?.tenant_id;
        const { name } = req.body ?? {};

        // Validation
        if (!tenantId) {
          return res.status(400).json({ error: 'TENANT_REQUIRED' });
        }
        if (!name || !String(name).trim()) {
          return res.status(400).json({ error: 'NAME_REQUIRED' });
        }

        const row = await ctx.withTenantTx(tenantId, async (db) => {
          const r = await db.execute(sql`insert into items (name) values (${String(name).trim()}) returning id, name, created_at`);
          return ((r as any).rows ?? r)[0];
        });

        ctx.log('Created item', { itemId: row.id, name: row.name });
        res.status(201).json(row);
      } catch (error) {
        ctx.log('Error creating item', { error: error.message });
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    });

    // UPDATE - Update item (with RBAC)
    ctx.router.put('/items/:id', ctx.rbac.require(`${MODULE_ID}.items.update`), async (req: any, res: Response) => {
      try {
        const tenantId = req.auth?.tenant_id;
        const { id } = req.params;
        const { name } = req.body ?? {};

        // Validation
        if (!tenantId) {
          return res.status(400).json({ error: 'TENANT_REQUIRED' });
        }
        if (!name || !String(name).trim()) {
          return res.status(400).json({ error: 'NAME_REQUIRED' });
        }

        const row = await ctx.withTenantTx(tenantId, async (db) => {
          const r = await db.execute(sql`update items set name = ${String(name).trim()} where id = ${id} returning id, name, created_at`);
          return ((r as any).rows ?? r)[0];
        });

        if (!row) {
          return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
        }

        ctx.log('Updated item', { itemId: row.id, name: row.name });
        res.json(row);
      } catch (error) {
        ctx.log('Error updating item', { error: error.message });
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    });

    // DELETE - Delete item (with RBAC)
    ctx.router.delete('/items/:id', ctx.rbac.require(`${MODULE_ID}.items.delete`), async (req: any, res: Response) => {
      try {
        const tenantId = req.auth?.tenant_id;
        const { id } = req.params;

        if (!tenantId) {
          return res.status(400).json({ error: 'TENANT_REQUIRED' });
        }

        const result = await ctx.withTenantTx(tenantId, async (db) => {
          const r = await db.execute(sql`delete from items where id = ${id}`);
          return r;
        });

        const rowCount = (result as any).rowCount ?? (result as any).count ?? 0;
        if (rowCount === 0) {
          return res.status(404).json({ error: 'ITEM_NOT_FOUND' });
        }

        ctx.log('Deleted item', { itemId: id });
        res.status(204).send();
      } catch (error) {
        ctx.log('Error deleting item', { error: error.message });
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    });

    ctx.log(`${MODULE_ID} plugin registered successfully`);
  },
};

export default plugin;