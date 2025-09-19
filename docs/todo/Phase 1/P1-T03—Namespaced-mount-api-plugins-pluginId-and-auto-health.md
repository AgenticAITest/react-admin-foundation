# P1-T03 — Namespaced mount `/api/plugins/:pluginId/*` + auto `/health`

**Goal**  
Mount every plugin/module under the new namespaced prefix and add a free `GET /health` route for each plugin.

---

## File to edit
- `src/server/lib/modules/route-registry.ts` (or your central module/route registry)

## Patch (paste-in)
```ts
import { Router } from 'express';

// Compute the namespaced prefix for this plugin
const prefix = `/api/plugins/${config.id}`;

// Small pre-router that is always present (no auth needed)
const pre = Router();
pre.get('/health', (_req, res) => res.json({ ok: true, plugin: config.id }));

// Mount the pre-router and the plugin router under the namespace
this.app.use(prefix, pre);
this.app.use(prefix, router);

// OPTIONAL (temporary): keep legacy mount for transition, then remove later
const legacy = (config as any).apiRoutes?.prefix;
if (legacy && legacy !== prefix) {
  this.app.use(legacy, router);
}
```

> Note: In **T04** you’ll insert the per-tenant gate *before* `this.app.use(prefix, router)` and in **T06** you’ll add request logging in the same spot. This task only handles the namespace + health route.

---

## Accept (checklist)
- `GET /api/plugins/<module-id>/health` returns `200 { ok: true, plugin: "<module-id>" }`.
- Existing plugin endpoints are reachable under `/api/plugins/<module-id>/*`.
- (If legacy mount kept) Hitting the legacy path returns the same response during transition.

---

## Common gotchas
- Don’t mount the plugin router at both the legacy prefix and the new namespace long-term (it can double-handle requests). Keep legacy only during migration, then remove.
- If you have global/tenant gating (T04) make sure the **gate** middleware is registered **before** `this.app.use(prefix, router)` so it guards *all* plugin routes (health can remain open).
