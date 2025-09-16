import { relations, sql } from 'drizzle-orm';
import { boolean, integer, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenant } from '../system';

export const testentity2s = pgTable('testentity2s', {
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
  uniqueIndex("testentity2s_name_unique_idx").on(t.tenantId, t.name)
]);

// Relations
export const testentity2sRelations = relations(testentity2s, ({ one }) => ({
  tenant: one(tenant, {
    fields: [testentity2s.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type TestEntity2 = typeof testentity2s.$inferSelect;
export type NewTestEntity2 = typeof testentity2s.$inferInsert;
