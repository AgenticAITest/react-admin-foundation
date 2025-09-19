// sandbox/server.ts
import express from 'express';
import type { Router, RequestHandler } from 'express';
import { bootstrap } from './bootstrap';
import { withTenantTx } from './withTenantTx';
import { requirePerm, seedPermissions } from './rbac';
import plugin, { permissions as pluginPermissions } from '../server/index';

type PluginContext = {
  router: Router;
  rbac: { require: (perm: string) => RequestHandler };
  withTenantTx: typeof withTenantTx;
  log: (msg: string, meta?: object) => void;
};

async function main() {
  console.log('🚀 Starting sandbox server...');
  
  const app = express();
  app.use(express.json());

  console.log('📦 Running bootstrap...');
  const { devTenantId } = await bootstrap();
  console.log('✅ Bootstrap completed, devTenantId:', devTenantId);

  // Dev auth injection
  app.use((req: any, _res, next) => {
    req.auth = { tenant_id: devTenantId, user_id: 'dev' };
    next();
  });

  const MODULE_ID = plugin.meta?.id || '<module-id>';
  console.log('🔌 Registering plugin:', MODULE_ID);

  // Prepare PluginContext with real RBAC check
  const ctx: PluginContext = {
    router: express.Router(),
    rbac: { require: requirePerm },
    withTenantTx,
    log: (msg, meta) => console.log(`[${MODULE_ID}]`, msg, meta || {}),
  };

  await plugin.register(ctx as any);
  console.log('✅ Plugin registered successfully');

  // Seed declared permissions (or a sane default set)
  const perms = Array.isArray(pluginPermissions) && pluginPermissions.length
    ? pluginPermissions
    : [
        `${MODULE_ID}.items.read`,
        `${MODULE_ID}.items.create`,
        `${MODULE_ID}.items.update`,
        `${MODULE_ID}.items.delete`,
      ];
  
  console.log('🔐 Seeding permissions:', perms);
  try {
    const seedingPromise = seedPermissions(devTenantId, perms, { roleCode: 'OWNER', userId: 'dev' });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Permission seeding timeout')), 10000)
    );
    await Promise.race([seedingPromise, timeoutPromise]);
    console.log('✅ Permissions seeded successfully');
  } catch (error) {
    console.error('❌ Permission seeding failed:', error);
    // Continue without permissions for testing
    console.log('⚠️ Continuing without permission seeding...');
  }

  // Namespace + health pre-router
  const prefix = `/api/plugins/${MODULE_ID}`;
  const pre = express.Router();
  pre.get('/health', (_req, res) => res.json({ ok: true, plugin: MODULE_ID }));

  app.use(prefix, pre, ctx.router);
  console.log('🛣️ Routes mounted at:', prefix);

  const port = Number(process.env.PORT || 5173);
  console.log('🚀 Starting server on port:', port);
  
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`🌐 Sandbox @ http://localhost:${port}`);
    console.log(`📡 API    @ ${prefix}`);
    console.log('✅ Server is ready for requests!');
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📤 Received SIGTERM, shutting down gracefully...');
    server.close(() => {
      console.log('👋 Server closed');
      process.exit(0);
    });
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});