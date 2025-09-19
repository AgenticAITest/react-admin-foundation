# P1-T06 — Log each plugin request with {pluginId, tenantId}

**Goal**: Basic observability for debugging/metrics later.

**Edit**: `src/server/lib/modules/route-registry.ts` (right before mounting route handlers)
```ts
this.app.use(prefix, (req, _res, next) => {
  const tenantId = (req as any).tenantId || (req as any).user?.activeTenantId || 'unknown';
  console.log(JSON.stringify({
    level: 'info',
    at: 'plugin',
    pluginId: config.id,
    tenantId,
    method: req.method,
    path: req.path
  }));
  next();
});
```

**Accept**:
- Each plugin request prints a JSON line including `{ pluginId, tenantId }`.
