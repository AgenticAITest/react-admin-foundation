# Plugin Contract Adapter

This directory contains **example files** showing how to integrate the sandbox plugin with the foundation system.

## How It Works

### **Sandbox Authoring (Current)**
Your plugin uses the clean `register(ctx)` pattern:
```typescript
// server/index.ts - UNCHANGED
const plugin = {
  meta: { id: 'sample', version: '0.1.0', api: '1.x' },
  async register(ctx: PluginContext) {
    ctx.router.get('/items', ctx.rbac.require('sample.items.read'), ...);
  }
};
export const permissions = ['sample.items.read', '...'];
export default plugin;
```

### **Foundation Integration (Adapter)**
When integrating with the foundation, create these files:

**1. Router Adapter** (`src/modules/sample/server/routes/index.ts`)
```typescript
import { Router } from 'express';
import plugin, { permissions as pluginPermissions } from '../../../server/plugin';
import { withTenantTx } from '../../../../lib/db/tenant-db';
import { requirePermission } from '../../../../lib/security/rbac';

const router = Router();
const ctx = {
  router,
  rbac: { require: (perm: string) => requirePermission(perm) },
  withTenantTx,
  log: (msg, meta) => console.log(JSON.stringify({...}))
};

await plugin.register(ctx);
export const permissions = pluginPermissions;
export default router; // ← Foundation expects this
```

**2. Module Config** (`src/modules/sample/module.config.ts`)
```typescript
export default {
  id: 'sample',
  name: 'Sample Module',
  version: '1.0.0',
  api: '1.x',
  permissions: ['sample.items.read', 'sample.items.create', ...],
  nav: { basePath: '/app/sample', items: [...] }
};
```

## Benefits

- ✅ **Same Code, Two Environments** - Plugin works in both sandbox and foundation
- ✅ **Clean Authoring API** - Business analysts use simple `register(ctx)` pattern
- ✅ **Foundation Compatible** - Router export satisfies route registry requirements
- ✅ **Zero Breaking Changes** - Existing foundation modules unaffected

## Integration Steps

1. **Copy plugin files to foundation:**
   ```bash
   cp server/index.ts ../foundation/src/modules/sample/server/plugin.ts
   cp shared/schema.ts ../foundation/src/modules/sample/schema.ts
   ```

2. **Create adapter files in foundation:**
   - Copy `routes-index.ts` → `src/modules/sample/server/routes/index.ts`
   - Copy `module-config.ts` → `src/modules/sample/module.config.ts`

3. **Foundation auto-discovers and mounts at `/api/plugins/sample/*`**