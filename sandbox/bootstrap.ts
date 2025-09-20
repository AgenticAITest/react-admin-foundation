// sandbox/bootstrap.ts
import { pool } from '../db/client';

const DEV_TENANT_CODE = process.env.DEV_TENANT_CODE || 'dev';
const DEV_TENANT_SCHEMA = process.env.DEV_TENANT_SCHEMA || 'tenant_dev';

export async function bootstrap(): Promise<{ devTenantId: string }> {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // Ensure sys_tenant table exists before any operations
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.sys_tenant (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code        text UNIQUE NOT NULL,
      name        text        NOT NULL,
      domain      text,
      schema_name text        NOT NULL
    );
  `);

  // Work with existing sys_tenant table structure
  const upsertRes = await pool.query(
    `insert into sys_tenant(id, code, name, domain, schema_name)
     values (gen_random_uuid(), $1, $2, $3, $4)
     on conflict (code) do update set 
       schema_name = excluded.schema_name,
       name = excluded.name,
       domain = excluded.domain
     returning id`,
    [DEV_TENANT_CODE, 'Development Tenant', 'localhost', DEV_TENANT_SCHEMA]
  );
  const devTenantId = upsertRes.rows[0].id as string;

  // Create tenant schema using safer idempotent approach
  await pool.query(`
    DO $$
    DECLARE
      tgt_schema text := '${DEV_TENANT_SCHEMA}';
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = tgt_schema) THEN
        EXECUTE format('CREATE SCHEMA %I', tgt_schema);
      END IF;
    END $$;
  `);

  // Business sample table
  await pool.query(`
    create table if not exists "${DEV_TENANT_SCHEMA}".items (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      created_at timestamptz not null default now()
    );
  `);

  // --- RBAC tables in tenant schema ---
  await pool.query(`
    create table if not exists "${DEV_TENANT_SCHEMA}".rbac_permissions (
      permission_code text primary key,
      description text
    );

    create table if not exists "${DEV_TENANT_SCHEMA}".rbac_roles (
      role_code text primary key,
      name text not null
    );

    create table if not exists "${DEV_TENANT_SCHEMA}".rbac_role_permissions (
      role_code text not null references "${DEV_TENANT_SCHEMA}".rbac_roles(role_code) on delete cascade,
      permission_code text not null references "${DEV_TENANT_SCHEMA}".rbac_permissions(permission_code) on delete cascade,
      primary key (role_code, permission_code)
    );

    create table if not exists "${DEV_TENANT_SCHEMA}".rbac_user_roles (
      user_id text not null,
      role_code text not null references "${DEV_TENANT_SCHEMA}".rbac_roles(role_code) on delete cascade,
      primary key (user_id, role_code)
    );
  `);

  return { devTenantId };
}