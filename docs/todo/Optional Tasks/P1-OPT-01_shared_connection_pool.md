# P1-OPT-01 — Use a shared PostgreSQL connection pool

**Goal**  
Ensure all DB access uses a singleton `pg.Pool` so requests don’t create per-request clients. This reduces connection churn and avoids exhausting Neon connection limits.

---

## Files
- Create: `src/server/lib/db/pool.ts`
- Update (if needed): `src/server/lib/modules/route-registry.ts` gate to use the pool
- Note: If your existing `db.execute(...)` already uses a singleton pool, you can mark this task **N/A**.

## Patch
```ts
// src/server/lib/db/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optional tuning:
  // max: 10,                 // pool size
  // idleTimeoutMillis: 30_000,
  // connectionTimeoutMillis: 5_000,
});
```

**(Optional) Use pool directly inside the gate**  
If your gate uses `db.execute`, you can keep it. If not, switch to `pool.query`:

```ts
// src/server/lib/modules/route-registry.ts (inside gate)
import { pool } from '../db/pool';

const { rows: [row] } = await pool.query(
  `select p.enabled_global,
          coalesce(tp.enabled,false) as enabled_tenant
     from sys_plugins p
left join sys_tenant_plugins tp
       on tp.plugin_id = p.plugin_id and tp.tenant_id = $1
    where p.plugin_id = $2`,
  [tenantId, config.id]
);
```

---

## Accept (checklist)
- Server boots normally with no increase in connection count under load.
- Gate query uses a pooled connection (`pool.query`) or an equivalent `db.execute` backed by a singleton pool.
- No per-request `new Client()` anywhere in code.
