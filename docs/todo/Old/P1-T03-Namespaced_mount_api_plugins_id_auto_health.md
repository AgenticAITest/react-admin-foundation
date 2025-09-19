# P1-T03 — Namespaced mount `/api/plugins/:id/*` + auto `/health`

**Goal**: Mount every module under the new namespaced prefix and add a `GET /health` for free.

**Edit**: `src/server/lib/modules/route-registry.ts`

1) Compute namespaced prefix:
```ts
// const prefix = config.apiRoutes.prefix;      // OLD
const prefix = `/api/plugins/${config.id}`;     // NEW
```

2) Add a tiny pre-router for `/health`, then mount:
```ts
const pre = Router();

pre.get('/health', (_req, res) => res.json({ ok: true, plugin: config.id }));

this.app.use(prefix, pre);
this.app.use(prefix, router);
```

*(Optional temporary backward-compat)*
```ts
const legacy = config.apiRoutes.prefix;
if (legacy && legacy !== prefix) this.app.use(legacy, router);
```

**Accept**:
- `GET /api/plugins/<module-id>/health` → `200 { ok: true, plugin: "<module-id>" }`.

---
