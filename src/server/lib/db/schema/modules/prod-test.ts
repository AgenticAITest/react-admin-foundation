import { relations, sql } from 'drizzle-orm';
import { boolean, integer, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenant } from '../system';

export const validationItems = pgTable('validationItems', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  
  testField: varchar('testField', { length: 255 }).notNull(),

  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("validationItems_name_unique_idx").on(t.tenantId, t.name)
]);

// Relations
export const validationItemsRelations = relations(validationItems, ({ one }) => ({
  tenant: one(tenant, {
    fields: [validationItems.tenantId],
    references: [tenant.id],
  }),
}));

// Types
export type ValidationItem = typeof validationItems.$inferSelect;
export type NewValidationItem = typeof validationItems.$inferInsert;
