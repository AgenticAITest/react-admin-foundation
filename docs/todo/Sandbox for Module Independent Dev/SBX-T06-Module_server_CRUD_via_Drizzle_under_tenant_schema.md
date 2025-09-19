# SBX-T06 — Module server: CRUD via Drizzle under tenant schema

**Create/Edit**: `server/index.ts`
```ts
// server/index.ts
import type { Request, Response } from 'express';

type PluginContext = {
  router: import('express').Router;
  rbac: { require: (perm: string) => import('express').RequestHandler };
  withTenantTx: <T>(tenantId: string, run: (db: any) => Promise<T>) => Promise<T>;
  log: (msg: string, meta?: object) => void;
};

const plugin = {
  meta: { id: '<module-id>', version: '0.1.0', api: '1. x' },
  async register(ctx: PluginContext) {
    ctx.router.get('/health', (_req: Request, res: Response) => {
      res.json({ ok: true, plugin: '<module-id>' });
    });

    ctx.router.get('/items', async (req: any, res: Response) => {
      const tenantId = req.auth?.tenant_id;
      const rows = await ctx.withTenantTx(tenantId, async (db) => {
        const r = await db.execute('select id, name, created_at from items order by created_at desc');
        return (r as any).rows ?? r;
      });
      res.json(rows);
    });

    ctx.router.post('/items', async (req: any, res: Response) => {
      const tenantId = req.auth?.tenant_id;
      const { name } = req.body ?? {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'NAME_REQUIRED' });
      const row = await ctx.withTenantTx(tenantId, async (db) => {
        const r = await db.execute('insert into items (name) values ($1) returning id, name, created_at', [name]);
        return ((r as any).rows ?? r)[0];
      });
      res.status(201).json(row);
    });

    ctx.log('registered');
  },
};

export default plugin;
```

---
