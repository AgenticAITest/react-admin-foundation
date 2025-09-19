# SBX-T02 — Drizzle client (Neon via pg)

**Create**: `db/client.ts`
```ts
// db/client.ts
import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export function makeDb(clientOrPool = pool) {
  return drizzle(clientOrPool);
}
```

---
