# P1-T01 — Create plugin registry tables + indexes (public schema)

**Goal**: Ensure `sys_plugins`, `sys_tenant_plugins`, `sys_plugin_migrations` exist and add tiny indexes.

**Create**: `src/server/lib/db/ensure-plugin-registry.ts`
```ts
// src/server/lib/db/ensure-plugin-registry.ts
import { db } from './index';

export async function ensurePluginRegistryTables() {
  await db.execute(`
  create table if not exists sys_plugins (
    plugin_id text primary key,
    api_version text not null,
    version_installed text not null,
    enabled_global boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists sys_tenant_plugins (
    tenant_id uuid not null,
    plugin_id text not null references sys_plugins(plugin_id),
    enabled boolean not null default false,
    version_installed text not null,
    updated_at timestamptz not null default now(),
    primary key (tenant_id, plugin_id)
  );

  create table if not exists sys_plugin_migrations (
    id bigserial primary key,
    plugin_id text not null references sys_plugins(plugin_id),
    scope text not null,        -- 'public' | 'tenant' (MVP free text)
    tenant_id uuid null,
    name text not null,
    version text not null,
    applied_at timestamptz not null default now(),
    unique (plugin_id, scope, tenant_id, name)
  );

  -- small helpful indexes
  create index if not exists idx_sys_tenant_plugins_tenant_plugin
    on sys_tenant_plugins(tenant_id, plugin_id);

  create index if not exists idx_sys_plugins_enabled_global
    on sys_plugins(enabled_global);
  `);

  // Semantics:
  // - enabled_global = false  => plugin is OFF platform-wide (tenants cannot override).
  // - enabled_global = true   => tenant-level 'enabled' must also be true to allow access.
}
```

**Edit**: `src/server/main.ts` — call during boot, before module discovery
```ts
import { ensurePluginRegistryTables } from './lib/db/ensure-plugin-registry';

await ensurePluginRegistryTables();
```

**Accept**:
- Server boots normally; no SQL errors.
- `\d+ sys_plugins` shows table; indexes present.
