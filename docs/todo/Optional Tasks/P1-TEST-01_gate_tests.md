# P1-TEST-01 — Automated gate tests (matrix with Supertest)

**Goal**  
Add a minimal automated test that verifies the gate behavior for all toggle combinations. Uses Supertest to hit the real app and updates DB rows for setup.

---

## Files
- Create: `tests/plugin-gate.test.ts`
- Ensure you have a test script in `package.json`: `"test": "vitest"` or `"test": "jest"`
- Dev deps (choose one stack):
  - **Vitest**: `npm i -D vitest supertest @types/supertest`
  - **Jest**: `npm i -D jest supertest @types/jest @types/supertest ts-jest`

> The example below shows **Vitest**. Adjust imports if you use Jest.

## Env assumptions
- You have a plugin id you can target (default: `inventory`). Override via `TEST_PLUGIN_ID` env var.
- You have a known tenant id for testing. Override via `TEST_TENANT_ID`; if not set, tests will only run health checks.

## Test (Vitest + Supertest)
```ts
// tests/plugin-gate.test.ts
import request from 'supertest';
import { describe, it, beforeAll, expect } from 'vitest';
import { app } from '../src/server/main'; // adjust to your export
import { db } from '../src/server/lib/db'; // or import your pool

const PLUGIN = process.env.TEST_PLUGIN_ID || 'inventory';
const TENANT = process.env.TEST_TENANT_ID || null;

// Helper to exec SQL; adapt to your db layer
async function q(sql: string, params: any[] = []) {
  if ((db as any).execute) return (await (db as any).execute(sql, params)).rows ?? [];
  const { pool } = await import('../src/server/lib/db/pool');
  const r = await pool.query(sql, params);
  return r.rows;
}

describe('plugin gate', () => {
  beforeAll(async () => {
    await q(
      `insert into sys_plugins(plugin_id, api_version, version_installed, enabled_global)
       values ($1,'1.x','0.1.0', true)
       on conflict (plugin_id) do update set api_version=excluded.api_version,
                                           version_installed=excluded.version_installed`,
      [PLUGIN]
    );
  });

  it('health is always open', async () => {
    const res = await request(app).get(`/api/plugins/${PLUGIN}/health`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('global OFF blocks requests', async () => {
    await q(`update sys_plugins set enabled_global=false where plugin_id=$1`, [PLUGIN]);
    const res = await request(app).get(`/api/plugins/${PLUGIN}/anything`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PLUGIN_GLOBALLY_DISABLED');
  });

  it('global ON but tenant OFF or missing blocks requests (if tenant is provided)', async () => {
    await q(`update sys_plugins set enabled_global=true where plugin_id=$1`, [PLUGIN]);
    if (!TENANT) return; // skip if no tenant to test with
    await q(`delete from sys_tenant_plugins where tenant_id=$1 and plugin_id=$2`, [TENANT, PLUGIN]);
    let res = await request(app).get(`/api/plugins/${PLUGIN}/anything`).set('X-Tenant-Id', TENANT);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('PLUGIN_DISABLED');

    await q(
      `insert into sys_tenant_plugins(tenant_id, plugin_id, enabled, version_installed)
       values ($1,$2,true,'0.1.0')
       on conflict (tenant_id,plugin_id) do update set enabled=excluded.enabled`,
      [TENANT, PLUGIN]
    );
    res = await request(app).get(`/api/plugins/${PLUGIN}/anything`).set('X-Tenant-Id', TENANT);
    expect(res.status).not.toBe(403); // could be 200/401/404 depending on your route
  });
});
```

> **Note**: The test uses `GET /api/plugins/${PLUGIN}/anything` as a generic protected path. Replace `anything` with a known route (e.g., `products`, `items`) if you want a strict `200` on the enabled case.

---

## Accept (checklist)
- `npm test` runs and exercises the matrix (skips tenant-specific checks when `TEST_TENANT_ID` not set).
- Health test always passes.
- Disabled cases return `403` with expected `error` codes.
- Enabled case no longer returns `403` for a real protected path.
