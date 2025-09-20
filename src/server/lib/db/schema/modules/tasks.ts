import { sql } from 'drizzle-orm';
import { boolean, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Schema-per-tenant: Tables created in tenant schemas (e.g., tenant_a.task_managements)
// NO tenantId column needed - isolation is done by search_path
export const taskManagements = pgTable('task_managements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("task_managements_name_unique_idx").on(t.name)
]);

// Types
export type TaskManagement = typeof taskManagements.$inferSelect;
export type NewTaskManagement = typeof taskManagements.$inferInsert;