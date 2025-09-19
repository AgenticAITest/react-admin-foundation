# SBX-T05 — withTenantTx helper (Drizzle + search_path)

**Create**: `sandbox/withTenantTx.ts`
```ts
// sandbox/withTenantTx.ts
import { pool, makeDb } from '../db/client';

export async function withTenantTx<T>(
  tenantId: string,
  run: (db: ReturnType<typeof makeDb>) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('select schema_name from sys_tenant where id = $1', [tenantId]);
    if (!rows[0]) throw new Error('TENANT_NOT_FOUND');
    const schema = rows[0].schema_name;

    await client.query('begin');
    await client.query(`set local search_path to "${schema}", public`);

    const db = makeDb(client);
    const result = await run(db);

    await client.query('commit');
    return result;
  } catch (err) {
    try { await pool.query('rollback'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}
```

---
