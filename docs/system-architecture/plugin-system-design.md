# Plugin System Architecture Design

## Overview

This document outlines the design for a production-ready plugin system that enables business analysts to develop functional modules using AI assistance. The system provides true runtime plugin capabilities with proper isolation, lifecycle management, and operational controls needed for enterprise deployment.

## Core Design Principles

1. **Standardization**: All plugins follow identical patterns and interfaces
2. **Isolation**: Plugins operate through controlled API boundaries without direct system access
3. **Runtime Control**: Plugins can be enabled/disabled per tenant without code changes
4. **Operational Safety**: Built-in migration management, observability, and kill switches
5. **Scalability**: Architecture supports hundreds of tenants and dozens of plugins
6. **Governance**: Clear separation between plugin suggestions and tenant administrative control

## Plugin System Structure

### 1. Module Directory Structure

```
src/
├── foundation/           # Core foundation code (unchanged)
│   ├── server/
│   ├── client/
│   └── shared/
├── plugins/             # All business plugins
│   ├── plugin-registry.ts    # Auto-generated plugin registry
│   ├── inventory/            # Example: Inventory Management Plugin
│   │   ├── plugin.config.ts  # Plugin configuration & metadata
│   │   ├── server/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── schemas/      # Validation schemas
│   │   │   ├── services/     # Business logic
│   │   │   └── types/        # TypeScript interfaces
│   │   ├── client/
│   │   │   ├── pages/        # React pages/components
│   │   │   ├── components/   # Plugin-specific UI components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── manifest.ts   # Frontend integration manifest
│   │   │   └── types/        # Frontend type definitions
│   │   ├── database/
│   │   │   ├── schema.ts     # Database tables & relations
│   │   │   ├── migrations/   # Public and tenant migrations
│   │   │   │   ├── public/   # Cross-tenant migrations
│   │   │   │   └── tenant/   # Per-tenant migrations
│   │   │   └── seed.ts       # Initial data
│   │   ├── permissions/
│   │   │   ├── permissions.ts # Plugin permissions
│   │   │   └── role-templates.ts # Suggested role templates
│   │   └── README.md         # Plugin documentation
│   ├── sales/               # Another business plugin
│   └── reporting/           # Another business plugin
└── tools/                   # Development and deployment tools
    ├── plugin-generator/    # Scaffolding tools
    ├── migration-runner/    # Plugin migration management
    ├── plugin-validator/    # Pre-deployment validation
    └── conflict-detector/   # Detect plugin conflicts
```

### 2. Plugin Configuration System

Each plugin has a `plugin.config.ts` file that defines its metadata and runtime requirements:

```typescript
// plugins/inventory/plugin.config.ts
export const inventoryPlugin = {
  // Plugin identity and versioning
  id: "inventory",
  name: "Inventory Management",
  version: "1.2.0",
  apiVersion: "1.0", // Host API compatibility
  description: "Complete inventory tracking and management system",
  author: "Business Analyst Name",
  
  // System integration
  dependencies: [], // Other plugins this depends on
  permissions: [
    "inventory.view", 
    "inventory.add", 
    "inventory.edit", 
    "inventory.delete",
    "inventory.reconcile"
  ],
  
  // Role templates (suggestions only - tenant decides)
  roleTemplates: [
    {
      key: "INVENTORY_MANAGER",
      displayName: "Inventory Manager", 
      permissions: ["inventory.view", "inventory.add", "inventory.edit", "inventory.delete", "inventory.reconcile"]
    },
    {
      key: "WAREHOUSE_STAFF",
      displayName: "Warehouse Staff",
      permissions: ["inventory.view", "inventory.add"]
    }
  ],
  
  // Database requirements
  database: {
    tables: ["inventory_items", "inventory_categories", "stock_movements"],
    requiresSeeding: true,
    migrationPath: "./database/migrations"
  },
  
  // Feature configuration
  features: {
    barcodeScanning: true,
    lowStockAlerts: true,
    exportReports: true
  },
  
  // Runtime capabilities needed
  capabilities: [
    "database", "cron", "events", "config"
  ]
}
```

### 3. Plugin Registry System

The system maintains a persistent registry of plugins with full lifecycle tracking:

#### Database Registry Tables

```sql
-- Global plugin registry
CREATE TABLE sys_plugins (
  plugin_id          text PRIMARY KEY,
  api_version        text NOT NULL,
  version_installed  text NOT NULL,
  enabled_global     boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Per-tenant plugin enablement and configuration
CREATE TABLE sys_tenant_plugins (
  tenant_id          uuid NOT NULL,
  plugin_id          text NOT NULL REFERENCES sys_plugins(plugin_id),
  enabled            boolean NOT NULL DEFAULT false,
  version_installed  text NOT NULL,
  config             jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, plugin_id)
);

-- Migration tracking with drift detection
CREATE TYPE plugin_scope AS ENUM ('public','tenant');

CREATE TABLE sys_plugin_migrations (
  id                 bigserial PRIMARY KEY,
  plugin_id          text NOT NULL REFERENCES sys_plugins(plugin_id),
  scope              plugin_scope NOT NULL,
  tenant_id          uuid NULL,                       -- NULL for public scope
  name               text NOT NULL,                   -- e.g. 001_init.sql
  version            text NOT NULL,                   -- plugin version at apply
  checksum           text NOT NULL,                   -- sha256 of file contents
  applied_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plugin_id, scope, tenant_id, name)
);

-- Role template tracking
CREATE TABLE sys_plugin_role_templates (
  plugin_id     text NOT NULL,
  role_key      text NOT NULL,            -- e.g. INVENTORY_MANAGER
  display_name  text NOT NULL,
  permissions   text[] NOT NULL,          -- namespaced perms
  version       text NOT NULL,
  PRIMARY KEY (plugin_id, role_key, version)
);
```

#### Runtime Plugin Registry

```typescript
// plugins/plugin-registry.ts (auto-generated)
import { inventoryPlugin } from './inventory/plugin.config';
import { salesPlugin } from './sales/plugin.config';
import { reportingPlugin } from './reporting/plugin.config';

export const pluginRegistry = {
  inventory: inventoryPlugin,
  sales: salesPlugin,
  reporting: reportingPlugin
};

export type PluginId = keyof typeof pluginRegistry;
export type PluginConfig = typeof pluginRegistry[PluginId];
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

### 5. Plugin Context Injection System

Plugins receive a controlled context with all needed capabilities, preventing direct access to system internals:

#### Plugin Context Interface

```typescript
export interface PluginContext {
  router: Router;
  rbac: { 
    require: (perm: string) => RequestHandler 
  };
  withTenantTx: <T>(tenantId: string, run: (db: DB) => Promise<T>) => Promise<T>;
  resolveTenant: (q: { domain?: string; code?: string }) => Promise<{id:string; code:string; schema:string}|null>;
  config: { 
    getGlobal<T>(k:string):Promise<T|undefined>; 
    getTenant<T>(tid:string,k:string):Promise<T|undefined> 
  };
  events: { 
    on(n:string,h:(e:any)=>Promise<void>):void; 
    emit(n:string,p:any):Promise<void> 
  };
  cron: { 
    register(spec:string, job:(ctx:{tenantId?:string})=>Promise<void>): void 
  };
  log: (msg:string, meta?:object)=>void;
}
```

#### Plugin Registration Pattern

```typescript
// plugins/inventory/server/index.ts
import { PluginContext } from '@foundation/types/plugin';

export const register = (ctx: PluginContext) => {
  const { router, rbac, withTenantTx, log } = ctx;

  /**
   * @swagger
   * /api/plugins/inventory/items:
   *   get:
   *     tags:
   *       - Inventory - Items
   *     summary: Get inventory items
   *     security:
   *       - bearerAuth: []
   */
  router.get("/items", 
    rbac.require('inventory.view'),
    async (req, res) => {
      try {
        const result = await withTenantTx(req.tenantId, async (db) => {
          // Clean database access with automatic tenant scoping
          return await db.select().from(inventoryItems);
        });
        
        res.json(result);
      } catch (error) {
        log('Error fetching inventory items', { 
          error: error.message, 
          tenantId: req.tenantId 
        });
        res.status(500).json({ error: 'INVENTORY_FETCH_FAILED' });
      }
    }
  );

  router.post("/items", 
    rbac.require('inventory.add'),
    async (req, res) => {
      await withTenantTx(req.tenantId, async (db) => {
        // Tenant-scoped database operations
        return await db.insert(inventoryItems).values(req.body);
      });
    }
  );
};
```

#### Host Integration

```typescript
// foundation/server/plugin-loader.ts
import { pluginRegistry } from '@plugins/plugin-registry';

export const loadPlugins = (app: Express) => {
  for (const [pluginId, config] of Object.entries(pluginRegistry)) {
    // Namespace all plugin routes
    const pluginRouter = Router();
    
    // Create isolated context for plugin
    const context = createPluginContext(pluginId);
    
    // Load plugin with context injection
    const plugin = require(`@plugins/${pluginId}/server`);
    plugin.register(context);
    
    // Mount under namespaced route with tenant enablement check
    app.use(`/api/plugins/${pluginId}`, 
      requirePluginEnabled(pluginId),
      pluginRouter
    );
  }
};

const requirePluginEnabled = (pluginId: string): RequestHandler => 
  async (req, res, next) => {
    const isEnabled = await checkPluginEnabled(req.tenantId, pluginId);
    if (!isEnabled) {
      return res.status(403).json({ 
        error: 'PLUGIN_DISABLED',
        pluginId,
        tenantId: req.tenantId 
      });
    }
    next();
  };
```

### 6. Frontend Integration with Manifest System

Plugins use a manifest-based approach for frontend integration with conditional rendering based on tenant enablement:

#### Plugin Frontend Manifest

```typescript
// plugins/inventory/client/manifest.ts
export default {
  id: 'inventory',
  routes: [
    { 
      path: '/inventory/items', 
      component: () => import('./pages/InventoryItemsPage'),
      permission: 'inventory.view'
    },
    { 
      path: '/inventory/categories', 
      component: () => import('./pages/CategoriesPage'),
      permission: 'inventory.view'
    }
  ],
  menu: [
    { 
      section: 'Operations', 
      label: 'Inventory', 
      icon: 'Package',
      children: [
        { 
          label: 'Items', 
          to: '/inventory/items', 
          permission: 'inventory.view' 
        },
        { 
          label: 'Categories', 
          to: '/inventory/categories', 
          permission: 'inventory.view' 
        }
      ]
    }
  ],
  widgets: [
    {
      id: 'low-stock-alert',
      component: () => import('./widgets/LowStockWidget'),
      permissions: ['inventory.view'],
      defaultPosition: { dashboard: 'sidebar' }
    }
  ]
} as const;
```

#### Dynamic Plugin Pages

```typescript
// plugins/inventory/client/pages/InventoryItemsPage.tsx
import { PageLayout } from '@foundation/client/components/layout/PageLayout';
import { DataTable } from '@foundation/client/components/data/DataTable';
import { useAuth } from '@foundation/client/provider/AuthProvider';
import { Authorized } from '@foundation/client/components/auth/Authorized';
import { usePluginApi } from '@foundation/client/hooks/usePluginApi';

export const InventoryItemsPage = () => {
  const { user } = useAuth();
  const { apiBase } = usePluginApi('inventory'); // Returns /api/plugins/inventory
  
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
          endpoint={`${apiBase}/items`}  // Computed plugin API path
          columns={inventoryItemColumns}
          searchable={true}
          filterable={true}
        />
      </PageLayout>
    </Authorized>
  );
};
```

#### Host Shell Integration

```typescript
// foundation/client/shell/PluginMenuRenderer.tsx
import { usePluginManifests } from '@foundation/client/hooks/usePluginManifests';
import { useUserPermissions } from '@foundation/client/hooks/useUserPermissions';

export const PluginMenuRenderer = () => {
  const manifests = usePluginManifests(); // Only enabled plugins for current tenant
  const permissions = useUserPermissions();

  return (
    <>
      {manifests.map(manifest => 
        manifest.menu.map(menuItem => {
          // Hide if plugin disabled or user lacks permission
          if (!hasPermission(permissions, menuItem.permission)) return null;
          
          return (
            <MenuSection key={menuItem.section} title={menuItem.section}>
              {menuItem.children.map(child => (
                <MenuItem key={child.to} {...child} />
              ))}
            </MenuSection>
          );
        })
      )}
    </>
  );
};
```

## Plugin Migration Strategy

### Migration Runner with Production Safeguards

```typescript
// tools/migration-runner/index.ts
export class PluginMigrationRunner {
  async runMigrations(options: {
    pluginId: string;
    scope: 'public' | 'tenant';
    tenantId?: string;
    fromMigration?: string;
    dryRun?: boolean;
    batchSize?: number;
  }) {
    // Advisory lock prevents concurrent runs
    const lockKey = this.getLockKey(options);
    const acquired = await this.acquireAdvisoryLock(lockKey);
    
    if (!acquired) {
      throw new Error('Migration already running for this plugin/tenant');
    }

    try {
      if (options.scope === 'tenant' && !options.tenantId) {
        // Batch process all tenants
        return await this.runTenantBatch(options);
      } else {
        return await this.runSingleMigration(options);
      }
    } finally {
      await this.releaseAdvisoryLock(lockKey);
    }
  }

  private async runTenantBatch(options: {
    pluginId: string;
    batchSize = 50;
    dryRun?: boolean;
  }) {
    const tenants = await this.getActiveTenants();
    const results = [];

    for (let i = 0; i < tenants.length; i += options.batchSize) {
      const batch = tenants.slice(i, i + options.batchSize);
      
      for (const tenant of batch) {
        try {
          const result = await this.runSingleMigration({
            ...options,
            scope: 'tenant',
            tenantId: tenant.id
          });
          results.push({ tenantId: tenant.id, status: 'success', result });
        } catch (error) {
          results.push({ 
            tenantId: tenant.id, 
            status: 'error', 
            error: error.message 
          });
          // Continue with other tenants
        }
      }

      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  private async validateMigration(migration: Migration): Promise<void> {
    // Checksum validation for drift detection
    const currentChecksum = await this.calculateChecksum(migration.content);
    const recorded = await this.getRecordedMigration(migration.name);
    
    if (recorded && recorded.checksum !== currentChecksum) {
      throw new Error(
        `Migration drift detected: ${migration.name} checksum mismatch`
      );
    }
  }
}
```

### Migration File Structure

```
plugins/inventory/database/migrations/
├── public/
│   ├── 001_plugin_registry.sql
│   └── 002_role_templates.sql
└── tenant/
    ├── 001_inventory_tables.sql
    ├── 002_add_barcode_column.sql
    └── 003_add_indexes.sql
```

## Operational Controls & Observability

### Plugin Health & Kill Switches

```typescript
// foundation/server/middleware/plugin-health.ts
export const createKillSwitch = () => {
  let globalKillSwitch = false;
  const tenantKillSwitches = new Map<string, Set<string>>();

  return {
    // Global kill switch (environment variable or database)
    setGlobalKillSwitch: (enabled: boolean) => {
      globalKillSwitch = enabled;
    },

    // Per-tenant plugin kill switch
    disablePluginForTenant: (tenantId: string, pluginId: string) => {
      if (!tenantKillSwitches.has(tenantId)) {
        tenantKillSwitches.set(tenantId, new Set());
      }
      tenantKillSwitches.get(tenantId)!.add(pluginId);
    },

    // Health check endpoint
    healthCheck: (pluginId: string) => async (req: Request, res: Response) => {
      const health = {
        pluginId,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: await checkDatabaseHealth(pluginId),
          permissions: await checkPermissionHealth(pluginId),
          dependencies: await checkDependencyHealth(pluginId)
        }
      };

      const isHealthy = Object.values(health.checks).every(check => check === 'ok');
      res.status(isHealthy ? 200 : 503).json(health);
    }
  };
};
```

### Structured Logging & Metrics

```typescript
// foundation/server/observability/plugin-logger.ts
export const createPluginLogger = (pluginId: string) => ({
  log: (message: string, meta: object = {}) => {
    logger.info(message, {
      pluginId,
      ...meta,
      timestamp: new Date().toISOString()
    });
  },

  error: (message: string, error: Error, meta: object = {}) => {
    logger.error(message, {
      pluginId,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...meta
    });
  },

  // Metrics tracking
  incrementCounter: (metric: string, labels: object = {}) => {
    metrics.increment(`plugin.${pluginId}.${metric}`, {
      pluginId,
      ...labels
    });
  },

  recordLatency: (metric: string, duration: number, labels: object = {}) => {
    metrics.histogram(`plugin.${pluginId}.${metric}.duration`, duration, {
      pluginId,
      ...labels
    });
  }
});
```

## Development Tools

### 1. Plugin Generator
Tool to scaffold new plugins with all required files and patterns:
```bash
npm run create-plugin <plugin-name> <template-type>
# Options: crud, workflow, reporting, integration
```

### 2. Migration Runner
Production-ready migration management:
```bash
# Run all pending migrations for a plugin
npm run migrate:plugin inventory

# Dry run to see what would be applied
npm run migrate:plugin inventory --dry-run

# Run migrations for specific tenant
npm run migrate:plugin inventory --tenant acme-corp

# Batch migration with progress tracking
npm run migrate:plugin inventory --batch-size 20 --from 002_add_indexes
```

### 3. Plugin Validator
Tool to validate plugins before deployment:
```bash
npm run validate-plugin <plugin-path>
# Checks: schema conflicts, permission namespacing, API compatibility
```

### 4. Plugin Admin CLI
Operational management commands:
```bash
# Enable/disable plugin for tenant
npm run plugin:enable inventory --tenant acme-corp
npm run plugin:disable inventory --tenant acme-corp

# Check plugin status across tenants
npm run plugin:status inventory

# Export plugin data for tenant
npm run plugin:export inventory --tenant acme-corp --output ./backup.json
```

## Security & Governance

### Security Boundaries

1. **Plugin Isolation**: Plugins cannot access foundation internals directly
2. **API Boundaries**: All capabilities provided through controlled PluginContext
3. **Tenant Data Isolation**: `withTenantTx` ensures proper schema scoping
4. **Permission Namespacing**: All plugin permissions prefixed (e.g., `inventory.view`)
5. **Route Namespacing**: All plugin routes under `/api/plugins/:id/*`
6. **Schema Safety**: No dynamic SQL; sanitized identifiers only

### Role Template Governance

```typescript
// Plugin suggests role templates, tenant admins control adoption
export const handleRoleTemplateUpgrade = async (
  tenantId: string, 
  pluginId: string, 
  newVersion: string
) => {
  const templates = await getPluginRoleTemplates(pluginId, newVersion);
  const existingRoles = await getTenantRoles(tenantId);
  
  const roleDiff = calculateRoleDiff(existingRoles, templates);
  
  // Present diff to tenant admin for approval
  return {
    pluginId,
    version: newVersion,
    changes: roleDiff,
    requiresApproval: roleDiff.length > 0,
    applyUrl: `/admin/plugins/${pluginId}/roles/apply`
  };
};
```

### Data Retention & Uninstall Policies

```typescript
export const createUninstallPolicy = () => ({
  // Plugin disable: keep data, hide UI
  disable: async (tenantId: string, pluginId: string) => {
    await setPluginEnabled(tenantId, pluginId, false);
    // Data remains accessible via direct DB queries
  },

  // Plugin uninstall: archive data, remove tables
  uninstall: async (tenantId: string, pluginId: string, options: {
    exportData?: boolean;
    keepArchive?: boolean;
  }) => {
    if (options.exportData) {
      await exportPluginData(tenantId, pluginId);
    }
    
    if (options.keepArchive) {
      await archivePluginTables(tenantId, pluginId);
    } else {
      await dropPluginTables(tenantId, pluginId);
    }
    
    await removePluginFromRegistry(tenantId, pluginId);
  }
});
```

## Benefits of This Architecture

### For Business Analysts
- **Familiar Patterns**: Standardized templates and development patterns
- **Simplified Development**: No tenant complexity, clean database access
- **AI-Assisted Development**: Templates optimized for AI code generation
- **Rapid Iteration**: Hot-reload development with immediate feedback

### For Operations Teams  
- **Runtime Control**: Enable/disable plugins without code deployment
- **Safe Migrations**: Idempotent, resumable, batchable migrations
- **Observability**: Per-plugin metrics, structured logs, health endpoints
- **Kill Switches**: Emergency controls at global and tenant levels
- **Data Governance**: Clear export/archive/delete policies

### For Platform Architecture
- **True Isolation**: API boundaries prevent plugin-foundation coupling
- **Scalable Tenancy**: Schema-per-tenant with migration batching
- **Version Management**: Plugin API compatibility and migration history
- **Conflict Prevention**: Namespaced routes, permissions, and database objects

## Implementation Roadmap

### Phase 1: Core Infrastructure (High Impact, Low Risk)
**Timeline: 2-3 weeks**

**Deliverables:**
- ✅ Route namespacing: `/api/plugins/:pluginId/*` 
- ✅ Plugin registry tables (`sys_plugins`, `sys_tenant_plugins`, `sys_plugin_migrations`)
- ✅ PluginContext injection system
- ✅ Basic plugin enable/disable per tenant
- ✅ Plugin health endpoints

**Done When:**
- Enable/disable works per tenant via admin UI
- All plugin routes properly namespaced and guarded
- Logs include `{pluginId, tenantId}` context
- One existing module converted to plugin pattern

### Phase 2: Operational Readiness (Migration & Ops)
**Timeline: 3-4 weeks**

**Deliverables:**
- ✅ Migration runner with idempotency and checksums
- ✅ Advisory locking and tenant batching
- ✅ Kill switches (global and per-tenant)
- ✅ Structured logging and baseline metrics
- ✅ Frontend manifest system
- ✅ Role template UI with diff & apply

**Done When:**
- Can upgrade plugins across N tenants safely
- Observe migration progress and recover mid-flight
- Plugin admin UI shows status, versions, configuration
- Frontend menus conditionally render based on enablement + permissions

### Phase 3: Scale & Governance (Enterprise Ready)
**Timeline: 4-5 weeks**

**Deliverables:**
- ✅ Advanced tenant batching with backoff strategies
- ✅ Plugin data export/cleanup policies on uninstall
- ✅ Comprehensive observability (metrics, traces, alerts)
- ✅ Multi-database sharding preparation
- ✅ Plugin marketplace foundations (if needed)
- ✅ Advanced admin controls and audit logging

**Done When:**
- Can safely run upgrades for hundreds+ tenants with predictable SLOs
- Complete plugin lifecycle management (install → enable → configure → upgrade → disable → uninstall)
- Production monitoring and alerting for plugin health
- Ready for third-party plugin development (if required)

### Success Metrics

**Phase 1 Success:**
- Zero plugin route collisions
- Sub-second plugin enable/disable operations
- 100% plugin isolation (no direct foundation imports)

**Phase 2 Success:**
- Zero migration failures in tenant batches
- <30 second plugin upgrades for 50+ tenants
- <1% false positive health check failures

**Phase 3 Success:**
- <5 minute plugin upgrades for 500+ tenants
- 99.9% plugin availability during normal operations
- Zero data loss during plugin lifecycle operations

---

## Testing Strategy

### Plugin Integration Tests

```typescript
// tests/plugins/inventory.integration.test.ts
describe('Inventory Plugin Integration', () => {
  beforeEach(async () => {
    await setupTestTenant('test-tenant');
    await enablePlugin('test-tenant', 'inventory');
  });

  test('plugin lifecycle: enable → migrate → CRUD → disable → 403', async () => {
    // 1. Enable plugin
    const enableResult = await enablePlugin('test-tenant', 'inventory');
    expect(enableResult.success).toBe(true);

    // 2. Run migrations
    await runPluginMigrations('inventory', { tenantId: 'test-tenant' });
    
    // 3. Test CRUD operations
    const response = await request(app)
      .get('/api/plugins/inventory/items')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);
    
    // 4. Disable plugin
    await disablePlugin('test-tenant', 'inventory');
    
    // 5. Verify 403 response
    await request(app)
      .get('/api/plugins/inventory/items')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(403)
      .expect(res => {
        expect(res.body.error).toBe('PLUGIN_DISABLED');
        expect(res.body.pluginId).toBe('inventory');
      });
  });

  test('migration idempotency across multiple runs', async () => {
    // Run migrations multiple times
    const result1 = await runPluginMigrations('inventory', { tenantId: 'test-tenant' });
    const result2 = await runPluginMigrations('inventory', { tenantId: 'test-tenant' });
    
    expect(result1.migrationsApplied).toBeGreaterThan(0);
    expect(result2.migrationsApplied).toBe(0); // No new migrations
  });

  test('plugin context isolation', async () => {
    // Ensure plugin cannot access foundation internals
    const pluginContext = createPluginContext('inventory');
    
    // Should have controlled access
    expect(pluginContext.router).toBeDefined();
    expect(pluginContext.withTenantTx).toBeDefined();
    
    // Should NOT have direct access
    expect(pluginContext.foundationDb).toBeUndefined();
    expect(pluginContext.internalServices).toBeUndefined();
  });
});
```

This architecture transforms the original "merge-based modules" into a production-ready "runtime plugin system" that maintains the developer experience while adding enterprise operational capabilities.