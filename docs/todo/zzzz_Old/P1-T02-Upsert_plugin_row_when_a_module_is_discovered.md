# P1-T02 — Upsert plugin row when a module is discovered

**Goal**: When a module is registered, record/refresh it in `sys_plugins`.

**Edit**: `src/server/lib/modules/module-registry.ts`

Add helper near the top:
```ts
import { db } from '../db';

async function upsertSysPlugin(meta: { id: string; version: string; api: string }) {
  await db.execute(`
    insert into sys_plugins(plugin_id, api_version, version_installed)
    values ($1, $2, $3)
    on conflict (plugin_id)
    do update set api_version = excluded.api_version,
                  version_installed = excluded.version_installed,
                  updated_at = now()
  `, [meta.id, meta.api, meta.version] as any);
}
```

Call it inside `registerModule(config)` **before** mounting routes:
```ts
await upsertSysPlugin({ id: config.id, version: config.version, api: '1.x' });
```

**Accept**:
- `select * from sys_plugins` shows each module after startup.

---
