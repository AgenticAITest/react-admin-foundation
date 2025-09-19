# P1-T02 — Upsert plugin rows on discovery (after API check)

**Goal**: When a module is registered, record/update it in `sys_plugins`. This runs **after** the API compatibility check (see T09).

**Edit**: `src/server/lib/modules/module-registry.ts`
```ts
import { db } from '../db';

async function upsertSysPlugin(meta: { id: string; version: string; api: string }) {
  await db.execute(
    `insert into sys_plugins(plugin_id, api_version, version_installed)
     values ($1, $2, $3)
     on conflict (plugin_id) do update set
       api_version = excluded.api_version,
       version_installed = excluded.version_installed,
       updated_at = now()`,
    [meta.id, meta.api, meta.version] as any
  );
}

// Inside registerModule(config):
// 1) (T09) check API compatibility
// 2) then upsert:
await upsertSysPlugin({ id: config.id, version: config.version, api: '1.x' });
```

**Accept**:
- `select * from sys_plugins` shows a row per module after startup.
