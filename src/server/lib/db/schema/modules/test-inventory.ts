import { relations, sql } from 'drizzle-orm';
import { boolean, integer, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenant } from '../system';

export const testInventoryItems = pgTable('testInventoryItems', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  
  sku: varchar('sku', { length: 50 }).notNull(),
  quantity: integer('quantity').notNull(),
  isAvailable: boolean('isAvailable').default(false),
  lastRestocked: timestamp('lastRestocked'),

  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("testInventoryItems_name_unique_idx").on(t.tenantId, t.name),
  uniqueIndex("testInventoryItems_sku_unique_idx").on(t.tenantId, t.sku)
]);

// Relations
export const testInventoryItemsRelations = relations(testInventoryItems, ({ one }) => ({
  tenant: one(tenant, {
    fields: [testInventoryItems.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type TestInventoryItem = typeof testInventoryItems.$inferSelect;
export type NewTestInventoryItem = typeof testInventoryItems.$inferInsert;
