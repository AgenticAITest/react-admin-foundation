# SBX-T07 — Sandbox host (Express + Vite on one port)

**Create**: `sandbox/server.ts`
```ts
// sandbox/server.ts
import express from 'express';
import type { Router, RequestHandler } from 'express';
import { bootstrap } from './bootstrap';
import { withTenantTx } from './withTenantTx';
import plugin from '../server/index';

type PluginContext = {
  router: Router;
  rbac: { require: (perm: string) => RequestHandler };
  withTenantTx: typeof withTenantTx;
  log: (msg: string, meta?: object) => void;
};

async function attachVite(app: express.Express) {
  const vite = await import('vite');
  const react = await import('@vitejs/plugin-react');
  const viteServer = await vite.createServer({
    root: 'client',
    plugins: [react.default()],
    server: { middlewareMode: true },
    appType: 'custom',
  } as any);
  app.use(viteServer.middlewares);
}

async function main() {
  const app = express();
  app.use(express.json());

  const { devTenantId } = await bootstrap();

  app.use((req: any, _res, next) => {
    req.auth = { tenant_id: devTenantId };
    next();
  });

  const MODULE_ID = '<module-id>';
  const ctx: PluginContext = {
    router: express.Router(),
    rbac: { require: (_perm: string) => (_req, _res, next) => next() },
    withTenantTx,
    log: (msg, meta) => console.log(`[${MODULE_ID}] ${msg}`, meta || {}),
  };

  await plugin.register(ctx as any);

  const pre = express.Router();
  pre.get('/health', (_req, res) => res.json({ ok: true, plugin: MODULE_ID }));

  app.use(`/api/plugins/${MODULE_ID}`, pre, ctx.router);

  await attachVite(app);

  const port = Number(process.env.PORT || 5173);
  app.listen(port, () => {
    console.log(`Sandbox @ http://localhost:${port}`);
    console.log(`API    @ /api/plugins/${MODULE_ID}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---
