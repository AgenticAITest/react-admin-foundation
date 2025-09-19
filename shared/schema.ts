import { sql } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Schema-per-tenant: Tables are created in tenant schemas (e.g., tenant_dev.items)
// NO tenantId column needed - isolation is done by search_path
export const items = pgTable('items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Types
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;