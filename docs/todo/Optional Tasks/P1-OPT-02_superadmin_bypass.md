# P1-OPT-02 — Super‑admin bypass (with tenant requirement)

**Goal**  
Allow platform super‑admins to bypass **enablement checks** while still requiring an explicit tenant context (to avoid cross‑tenant writes). Route‑level RBAC continues to apply.

---

## File
- `src/server/lib/modules/route-registry.ts` (inside the gate middleware)

## Patch (add near the top of the gate)
```ts
// Require a tenant even for super‑admin (to avoid cross‑tenant ops)
if (req.user?.isSuperAdmin) {
  if (!tenantId) {
    return res.status(400).json({ error: 'TENANT_REQUIRED_FOR_SUPERADMIN' });
  }
  res.setHeader('X-Plugin-Bypass', 'super-admin');
  (req as any).pluginId = config.id;
  (req as any).tenantId = tenantId;
  return next();
}
```

> Keep your existing logic below this for non‑super‑admin requests (global toggle → tenant toggle). The `/health` pre‑router remains open and is unchanged.

---

## Accept (checklist)
- Requests from a user marked `isSuperAdmin` skip the enablement checks **but** still require a tenant id (returns `400 TENANT_REQUIRED_FOR_SUPERADMIN` if missing).
- Non‑super‑admin users behave exactly as before.
- `X-Plugin-Bypass: super-admin` header appears on bypassed requests.
