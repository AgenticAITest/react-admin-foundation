import { relations } from 'drizzle-orm';
import { boolean, decimal, integer, pgTable, uniqueIndex, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { tenant } from './system';

export const productTypes = pgTable('product_types', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex("product_types_unique_idx").on(t.tenantId, t.name),
  ]
);

export const packageTypes = pgTable('package_types', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  unitsPerPackage: integer('units_per_package'),
  barcode: varchar('barcode', { length: 100 }),
  dimensions: varchar('dimensions', { length: 100 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex("package_types_unique_idx").on(t.tenantId, t.name),
  ]
);

export const products = pgTable('products', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenant.id),
  inventoryTypeId: integer('inventory_type_id')
    .references(() => productTypes.id),
  packageTypeId: integer('package_type_id')
    .references(() => packageTypes.id),
  sku: varchar('sku', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  minimumStockLevel: integer('minimum_stock_level'),
  reorderPoint: integer('reorder_point'),
  requiredTemperatureMin: decimal('required_temperature_min', { precision: 5, scale: 2 }),
  requiredTemperatureMax: decimal('required_temperature_max', { precision: 5, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: varchar('dimensions', { length: 100 }),
  active: boolean('active').default(true),
  hasExpiryDate: boolean('has_expiry_date').default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
},
  (t) => [
    uniqueIndex("products_unique_idx").on(t.tenantId, t.sku),
  ]
);

// Relations
export const productTypesRelations = relations(productTypes, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [productTypes.tenantId],
    references: [tenant.id],
  }),
  products: many(products),
}));

export const packageTypesRelations = relations(packageTypes, ({ one, many }) => ({
  tenant: one(tenant, {
    fields: [packageTypes.tenantId],
    references: [tenant.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  tenant: one(tenant, {
    fields: [products.tenantId],
    references: [tenant.id],
  }),
  inventoryType: one(productTypes, {
    fields: [products.inventoryTypeId],
    references: [productTypes.id],
  }),
  packageType: one(packageTypes, {
    fields: [products.packageTypeId],
    references: [packageTypes.id],
  }),
}));

// Types
export type ProductType = typeof productTypes.$inferSelect;
export type PackageType = typeof packageTypes.$inferSelect;
export type Product = typeof products.$inferSelect;