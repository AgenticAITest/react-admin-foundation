// sandbox/rbac.ts
import { withTenantTx } from './withTenantTx';
import { sql } from 'drizzle-orm';

/** Express middleware factory */
export function requirePerm(permission: string) {
  return async (req: any, res: any, next: any) => {
    const tenantId = req.auth?.tenant_id;
    const userId = req.auth?.user_id || 'dev';
    if (!tenantId) return res.status(401).json({ error: 'NO_TENANT' });
    try {
      const granted = await withTenantTx(tenantId, async (db: any) => {
        const r = await db.execute(sql`
          select 1
          from rbac_user_roles ur
          join rbac_role_permissions rp on rp.role_code = ur.role_code
          where ur.user_id = ${userId} and rp.permission_code = ${permission}
          limit 1
        `);
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
    await db.execute(sql`
      insert into rbac_roles(role_code, name) values (${roleCode}, ${roleCode}) 
      on conflict do nothing
    `);
    await db.execute(sql`
      insert into rbac_user_roles(user_id, role_code) values (${userId}, ${roleCode}) 
      on conflict do nothing
    `);

    for (const p of permissions) {
      await db.execute(sql`
        insert into rbac_permissions(permission_code, description) values (${p}, ${p}) 
        on conflict do nothing
      `);
      await db.execute(sql`
        insert into rbac_role_permissions(role_code, permission_code) values (${roleCode}, ${p}) 
        on conflict do nothing
      `);
    }
  });
}