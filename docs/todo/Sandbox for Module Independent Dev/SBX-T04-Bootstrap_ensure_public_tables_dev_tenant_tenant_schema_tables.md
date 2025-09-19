# SBX-T04 — Bootstrap: ensure public tables, dev tenant & tenant schema/tables

**Create**: `sandbox/bootstrap.ts`
```ts
// sandbox/bootstrap.ts
import { pool } from '../db/client';

const DEV_TENANT_CODE = process.env.DEV_TENANT_CODE || 'dev';
const DEV_TENANT_SCHEMA = process.env.DEV_TENANT_SCHEMA || 'tenant_dev';

export async function bootstrap(): Promise<{ devTenantId: string }> {
  await pool.query(`
    create extension if not exists pgcrypto;

    create table if not exists sys_tenant (
      id uuid primary key default gen_random_uuid(),
      code text not null,
      domain text,
      schema_name text not null,
      created_at timestamptz not null default now()
    );
  `);

  const upsertRes = await pool.query(
    `insert into sys_tenant(code, schema_name)
     values ($1, $2)
     on conflict (code) do update set schema_name = excluded.schema_name
     returning id`,
    [DEV_TENANT_CODE, DEV_TENANT_SCHEMA]
  );
  const devTenantId = upsertRes.rows[0].id as string;

  await pool.query(`create schema if not exists "${DEV_TENANT_SCHEMA}"`);
  await pool.query(`
    create table if not exists "${DEV_TENANT_SCHEMA}".items (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      created_at timestamptz not null default now()
    );
  `);

  return { devTenantId };
}
```

---
