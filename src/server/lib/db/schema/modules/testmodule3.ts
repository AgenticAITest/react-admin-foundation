import { relations, sql } from 'drizzle-orm';
import { boolean, integer, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenant } from '../system';

export const testentity3s = pgTable('testentity3s', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  

  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("testentity3s_name_unique_idx").on(t.tenantId, t.name)
]);

// Relations
export const testentity3sRelations = relations(testentity3s, ({ one }) => ({
  tenant: one(tenant, {
    fields: [testentity3s.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type TestEntity3 = typeof testentity3s.$inferSelect;
export type NewTestEntity3 = typeof testentity3s.$inferInsert;
