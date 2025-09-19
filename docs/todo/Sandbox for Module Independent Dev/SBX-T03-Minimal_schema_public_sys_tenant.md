# SBX-T03 — Minimal schema (public `sys_tenant`)

**Create**: `db/schema.ts`
```ts
// db/schema.ts
import { pgTable, text, uuid, timestamp } from 'drizzle-orm/pg-core';

/** Public table to resolve schemas */
export const sysTenant = pgTable('sys_tenant', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  domain: text('domain'),
  schemaName: text('schema_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

---
