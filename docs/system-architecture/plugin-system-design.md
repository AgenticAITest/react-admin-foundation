# Plugin System Architecture Design

## Overview

This document outlines the design for a plugin-based architecture that enables business analysts to develop functional modules using AI assistance, which can then be seamlessly integrated into the main application.

## Core Design Principles

1. **Standardization**: All modules follow identical patterns and interfaces
2. **Isolation**: Modules can be developed independently without conflicts
3. **Integration**: Seamless merging with automatic registration and discovery
4. **Simplicity**: Business analysts need minimal technical knowledge
5. **Scalability**: Foundation supports unlimited business modules

## Plugin System Structure

### 1. Module Directory Structure

```
src/
├── foundation/           # Core foundation code (unchanged)
│   ├── server/
│   ├── client/
│   └── shared/
├── modules/             # All business modules
│   ├── module-registry.ts    # Auto-generated module registry
│   ├── inventory/            # Example: Inventory Management Module
│   │   ├── module.config.ts  # Module configuration & metadata
│   │   ├── server/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── schemas/      # Validation schemas
│   │   │   ├── services/     # Business logic
│   │   │   └── types/        # TypeScript interfaces
│   │   ├── client/
│   │   │   ├── pages/        # React pages/components
│   │   │   ├── components/   # Module-specific UI components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   └── types/        # Frontend type definitions
│   │   ├── database/
│   │   │   ├── schema.ts     # Database tables & relations
│   │   │   └── seed.ts       # Initial data
│   │   ├── permissions/
│   │   │   └── permissions.ts # Module permissions & roles
│   │   └── README.md         # Module documentation
│   ├── sales/               # Another business module
│   └── reporting/           # Another business module
└── tools/                   # Development and merge tools
    ├── module-generator/    # Scaffolding tools
    ├── merge-validator/     # Pre-merge validation
    └── conflict-detector/   # Detect module conflicts
```

### 2. Module Configuration System

Each module has a `module.config.ts` file that defines its metadata and integration requirements:

```typescript
// modules/inventory/module.config.ts
export const inventoryModule = {
  // Basic module information
  id: "inventory",
  name: "Inventory Management",
  version: "1.0.0",
  description: "Complete inventory tracking and management system",
  author: "Business Analyst Name",
  
  // System integration
  dependencies: [], // Other modules this depends on
  permissions: ["inventory.view", "inventory.add", "inventory.edit", "inventory.delete"],
  roles: ["INVENTORY_MANAGER", "WAREHOUSE_STAFF"],
  
  // Database requirements
  database: {
    tables: ["inventory_items", "inventory_categories", "stock_movements"],
    requiresSeeding: true
  },
  
  // API endpoints this module provides
  apiRoutes: {
    prefix: "/api/inventory",
    endpoints: [
      { path: "/items", methods: ["GET", "POST", "PUT", "DELETE"] },
      { path: "/categories", methods: ["GET", "POST"] },
      { path: "/stock-movements", methods: ["GET", "POST"] }
    ]
  },
  
  // Frontend integration
  navigation: {
    section: "Operations",
    items: [
      { path: "/console/inventory/items", label: "Items", icon: "Package" },
      { path: "/console/inventory/categories", label: "Categories", icon: "Tags" },
      { path: "/console/inventory/reports", label: "Reports", icon: "BarChart" }
    ]
  },
  
  // Feature flags
  features: {
    barcodeScanning: true,
    lowStockAlerts: true,
    exportReports: true
  }
}
```

### 3. Automatic Module Registration

The system automatically discovers and registers modules:

```typescript
// modules/module-registry.ts (auto-generated)
import { inventoryModule } from './inventory/module.config';
import { salesModule } from './sales/module.config';
import { reportingModule } from './reporting/module.config';

export const moduleRegistry = {
  inventory: inventoryModule,
  sales: salesModule,
  reporting: reportingModule
};

export type ModuleId = keyof typeof moduleRegistry;
export type ModuleConfig = typeof moduleRegistry[ModuleId];
```

### 4. Database Architecture: Schema-Per-Tenant

**Architecture Decision: Each tenant has its own PostgreSQL schema for complete data isolation**

#### Database Structure:
```
Database: business_foundation
├── public (shared foundation tables)
│   ├── tenants                    # Tenant registry
│   ├── global_users               # Cross-tenant user accounts  
│   ├── system_modules             # Available modules
│   └── system_configuration       # Global settings
├── tenant_acme (tenant: acme.com)
│   ├── users                      # Tenant-specific users
│   ├── roles                      # Tenant-specific roles
│   ├── permissions                # Tenant-specific permissions
│   ├── inventory_items            # Business module tables
│   ├── inventory_categories       # Business module tables
│   └── [all other module tables]
├── tenant_widget_corp (tenant: widget-corp.com)
│   ├── users                      # Isolated tenant data
│   ├── roles
│   ├── permissions
│   ├── inventory_items
│   └── [all other module tables]
└── tenant_[other_tenants]
```

#### Module Schema Definition (Business Analyst View):
Business analysts write simple, clean schema definitions without tenant complexity:

```typescript
// modules/inventory/database/schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, uuid, varchar, integer, decimal, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';

// Simple table definition - NO tenant_id needed!
export const inventoryItems = pgTable('inventory_items', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  
  // Business fields only
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  categoryId: uuid('category_id').references(() => inventoryCategories.id),
  
  // Inventory tracking
  quantityOnHand: integer('quantity_on_hand').default(0),
  minimumLevel: integer('minimum_level').default(0),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }),
  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  // Simple unique constraints
  uniqueIndex("inventory_items_sku_idx").on(t.sku),
]);

// Clean relations without tenant complexity
export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  category: one(inventoryCategories, {
    fields: [inventoryItems.categoryId],
    references: [inventoryCategories.id],
  }),
  stockMovements: many(stockMovements),
}));
```

#### Foundation Abstraction Layer:
The foundation handles all tenant complexity behind the scenes:

```typescript
// foundation/server/lib/db/tenant-connection.ts
export const getTenantDb = (tenantId: string) => {
  const schemaName = `tenant_${tenantId}`;
  return drizzle(connectionPool, { 
    schema: allModuleSchemas,
    schemaFilter: (tableName) => `${schemaName}.${tableName}`
  });
};

// foundation/server/middleware/authMiddleware.ts
export const authenticated = () => async (req, res, next) => {
  // ... auth logic ...
  
  // Automatically set tenant-scoped database connection
  req.db = getTenantDb(user.activeTenantId);
  next();
};
```

#### Automatic Schema Deployment:
When modules are deployed, they're automatically applied to all tenant schemas:

```typescript
// foundation/tools/deploy-module.ts
export const deployModuleToAllTenants = async (moduleName: string) => {
  const tenants = await getActiveTenants();
  
  for (const tenant of tenants) {
    const tenantDb = getTenantDb(tenant.id);
    await applyModuleSchema(tenantDb, moduleName);
    await seedModuleData(tenantDb, moduleName);
  }
};
```

#### Benefits of Schema-Per-Tenant:
✅ **True Data Isolation**: Physical separation prevents any cross-tenant data access
✅ **Superior Performance**: Each tenant has dedicated tables and indexes
✅ **Easy Backup/Restore**: `pg_dump --schema=tenant_acme` for specific tenant
✅ **Scalability**: Can move tenants to different databases as needed
✅ **Compliance**: GDPR deletion, data residency requirements easily met
✅ **Customization**: Per-tenant schema modifications possible
✅ **Simple Development**: Business analysts write clean code without tenant complexity
```

### 5. API Route Pattern

All modules follow the same API structure:

```typescript
// modules/inventory/server/routes/items.ts
import { Router } from 'express';
import { authenticated, authorized } from '@foundation/server/middleware/authMiddleware';
import { validateData } from '@foundation/server/middleware/validationMiddleware';
import { inventoryItemSchema } from '../schemas/inventorySchemas';

const itemsRouter = Router();

// All routes require authentication
itemsRouter.use(authenticated());

/**
 * @swagger
 * /api/inventory/items:
 *   get:
 *     tags:
 *       - Inventory - Items
 *     summary: Get inventory items
 *     security:
 *       - bearerAuth: []
 */
itemsRouter.get("/", 
  authorized('INVENTORY_MANAGER', 'inventory.view'), 
  async (req, res) => {
    // Standard pagination, filtering, sorting pattern
    // Implementation follows foundation patterns
  }
);

itemsRouter.post("/", 
  authorized('INVENTORY_MANAGER', 'inventory.add'),
  validateData(inventoryItemSchema),
  async (req, res) => {
    // Create new item with tenant scoping
  }
);

export default itemsRouter;
```

### 6. Frontend Integration Pattern

Module pages integrate seamlessly with the foundation:

```typescript
// modules/inventory/client/pages/InventoryItemsPage.tsx
import { PageLayout } from '@foundation/client/components/layout/PageLayout';
import { DataTable } from '@foundation/client/components/data/DataTable';
import { useAuth } from '@foundation/client/provider/AuthProvider';
import { Authorized } from '@foundation/client/components/auth/Authorized';

export const InventoryItemsPage = () => {
  const { user } = useAuth();
  
  return (
    <Authorized permissions={["inventory.view"]}>
      <PageLayout
        title="Inventory Items"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Inventory", href: "/console/inventory" },
          { label: "Items", href: "/console/inventory/items" }
        ]}
        actions={
          <Authorized permissions={["inventory.add"]}>
            <AddItemButton />
          </Authorized>
        }
      >
        <DataTable
          endpoint="/api/inventory/items"
          columns={inventoryItemColumns}
          searchable={true}
          filterable={true}
        />
      </PageLayout>
    </Authorized>
  );
};
```

## Module Development Templates

### 1. CRUD Module Template
For basic data management modules (customers, products, etc.)

### 2. Workflow Module Template  
For process-driven modules (order processing, approval workflows, etc.)

### 3. Reporting Module Template
For analytics and reporting modules

### 4. Integration Module Template
For modules that connect to external systems

## Module Merge Process

### 1. Pre-Merge Validation
- **Schema Compatibility**: Ensure no table/column conflicts
- **API Conflicts**: Check for overlapping endpoints
- **Permission Conflicts**: Verify unique permission codes
- **Dependency Resolution**: Ensure all dependencies are available

### 2. Automated Integration
- **Route Registration**: Automatically register module API routes
- **Navigation Updates**: Add module navigation items to sidebar
- **Permission Seeding**: Add module permissions to all tenant schemas
- **Database Migration**: Apply module schema changes to all tenant schemas
- **Tenant Provisioning**: Automatically create module tables in existing tenant schemas

### 3. Post-Merge Testing
- **Integration Tests**: Verify module works with foundation
- **Permission Tests**: Ensure security controls work correctly
- **UI Tests**: Confirm navigation and pages render correctly

## Development Tools

### 1. Module Generator
Tool to scaffold new modules with all required files and patterns:
```bash
npm run create-module <module-name> <template-type>
```

### 2. Merge Validator
Tool to validate modules before merging:
```bash
npm run validate-module <module-path>
```

### 3. Conflict Detector
Tool to identify potential conflicts between modules:
```bash
npm run check-conflicts <module1> <module2>
```

## Security Considerations

1. **Tenant Isolation**: Physical schema separation provides complete data isolation
2. **Permission Integration**: Modules define their own permissions following foundation patterns
3. **API Security**: All module endpoints inherit foundation authentication/authorization
4. **Input Validation**: All modules use foundation validation patterns
5. **Schema-Level Security**: PostgreSQL schema permissions prevent cross-tenant access
6. **Connection Security**: Tenant database connections are automatically scoped to correct schema

## Benefits of This Design

1. **Consistent Development Experience**: All modules follow identical patterns
2. **Reduced Complexity**: Business analysts work with familiar, standardized templates
3. **Automatic Integration**: No manual wiring required when merging modules
4. **Conflict Prevention**: Built-in validation prevents most merge conflicts
5. **Scalable Architecture**: Can support unlimited business modules
6. **Maintainable Codebase**: Clear separation between foundation and business logic

## Next Steps

1. Implement the module registration system
2. Create module templates for common patterns
3. Build development tools (generator, validator, conflict detector)
4. Create comprehensive documentation for business analysts
5. Set up automated testing for module integration

## Implementation Timeline

### Phase 1: Foundation Enhancements (Week 1-2)
- Refactor current code into foundation structure with schema-per-tenant architecture
- Implement tenant schema management system
- Create tenant provisioning and database abstraction layer
- Implement module registry system
- Create module configuration interfaces
- Set up automatic module discovery and deployment to tenant schemas

### Phase 2: Module Templates (Week 3-4)
- Create CRUD module template
- Create workflow module template
- Create reporting module template
- Build module generator tool

### Phase 3: Integration Tools (Week 5-6)
- Build merge validator
- Create conflict detector
- Implement automated integration system
- Set up testing framework

### Phase 4: Documentation & Training (Week 7-8)
- Create comprehensive developer handbook
- Build tutorial modules
- Create video training materials
- Set up support documentation

This design provides a robust foundation for your plugin-based development approach, enabling business analysts to create functional modules with AI assistance while maintaining code quality and system integrity.