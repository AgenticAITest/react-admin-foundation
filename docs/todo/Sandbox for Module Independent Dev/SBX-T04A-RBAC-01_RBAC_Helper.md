# SBX-RBAC-01 — Sandbox RBAC helper: `requirePerm` + `seedPermissions`

**Goal**  
Provide a tiny RBAC module that enforces permissions using the tenant’s RBAC tables and seeds defaults for the dev environment.

## File
- `sandbox/rbac.ts`

## Patch (new)
```ts
// sandbox/rbac.ts
import { withTenantTx } from './withTenantTx';

/** Express middleware factory */
export function requirePerm(permission: string) {
  return async (req: any, res: any, next: any) => {
    const tenantId = req.auth?.tenant_id;
    const userId = req.auth?.user_id || 'dev';
    if (!tenantId) return res.status(401).json({ error: 'NO_TENANT' });
    try {
      const granted = await withTenantTx(tenantId, async (db: any) => {
        const r = await db.execute(
          \`select 1
             from rbac_user_roles ur
             join rbac_role_permissions rp on rp.role_code = ur.role_code
            where ur.user_id = $1 and rp.permission_code = $2
            limit 1\`,
          [userId, permission]
        );
        const rows = (r as any).rows ?? r;
        return !!rows?.[0];
      });
      if (!granted) return res.status(403).json({ error: 'FORBIDDEN', perm: permission });
      next();
    } catch (e) { next(e); }
  };
}

/** Seed permissions and a default OWNER->dev mapping */
export async function seedPermissions(
  tenantId: string,
  permissions: string[],
  opts?: { roleCode?: string; userId?: string }
) {
  const roleCode = opts?.roleCode ?? 'OWNER';
  const userId = opts?.userId ?? 'dev';
  await withTenantTx(tenantId, async (db: any) => {
    // Ensure role & user-role
    await db.execute(\`insert into rbac_roles(role_code, name) values ($1,$1) on conflict do nothing\`, [roleCode]);
    await db.execute(\`insert into rbac_user_roles(user_id, role_code) values ($1,$2) on conflict do nothing\`, [userId, roleCode]);

    for (const p of permissions) {
      await db.execute(\`
        insert into rbac_permissions(permission_code, description)
        values ($1, $1) on conflict do nothing\`, [p]);
      await db.execute(\`
        insert into rbac_role_permissions(role_code, permission_code)
        values ($1, $2) on conflict do nothing\`, [roleCode, p]);
    }
  });
}
```

## Accept
- `requirePerm('x.y.z')` denies (403) when user lacks permission; allows otherwise.
- `seedPermissions(devTenantId, ['p1','p2'])` creates permissions, role, and maps dev user to that role.
