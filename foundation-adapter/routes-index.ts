// Foundation adapter: src/modules/sample/server/routes/index.ts
// This file would be placed in the foundation repo to integrate the sandbox plugin

import { Router } from 'express';
import plugin, { permissions as pluginPermissions } from '../../../server/plugin'; // Path to your sandbox plugin
import { withTenantTx } from '../../../../lib/db/tenant-db'; // Foundation's tenant helper
import { requirePermission } from '../../../../lib/security/rbac'; // Foundation's RBAC factory

const router = Router();

// Create plugin context adapter
const ctx = {
  router,
  rbac: { 
    require: (perm: string) => requirePermission(perm) 
  },
  withTenantTx,
  log: (msg: string, meta?: object) =>
    console.log(JSON.stringify({ 
      at: 'plugin', 
      plugin: plugin.meta?.id ?? 'sample', 
      msg, 
      ...meta 
    })),
};

// Register the plugin with foundation context
await plugin.register(ctx);

// Export permissions for foundation system
export const permissions = pluginPermissions;

// Export router for foundation route registry
export default router;