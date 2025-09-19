# P1-T06 — Request logging with `{pluginId, tenantId}`

**Goal**: Add one line to log plugin requests.

**Edit**: `src/server/lib/modules/route-registry.ts`, right before `this.app.use(prefix, router)`
```ts
this.app.use(prefix, (req, _res, next) => {
  const tenantId = (req as any).tenantId || (req as any).user?.activeTenantId || 'unknown';
  console.log(JSON.stringify({ level: 'info', at: 'plugin', pluginId: config.id, tenantId, method: req.method, path: req.path }));
  next();
});
```

**Accept**:
- Each plugin request prints one JSON log line with `pluginId` and `tenantId`.

---
