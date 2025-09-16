# Foundation Enhancement Plan: Multi-Module Architecture

## Overview

This document outlines the detailed plan for enhancing the existing basecode to support a multi-module plugin architecture using schema-per-tenant isolation. The plan maximizes reuse of the current solid foundation while adding the necessary infrastructure for business module development.

## Current Foundation Analysis

### Strong Foundation Assets to Leverage

The existing basecode provides excellent building blocks:

#### **Authentication System**
- JWT-based authentication with `authenticated()` middleware
- Token validation and user session management
- Secure password hashing with bcrypt

#### **Authorization System** 
- Role-based permissions with `authorized()`, `hasRoles()`, `hasPermissions()`
- Flexible permission checking with 'and'/'or' operators
- Tenant-scoped role validation

#### **Database Layer**
- Drizzle ORM with PostgreSQL integration
- Well-designed system schemas (tenant, user, role, permission)
- Proper relational structure with foreign keys and constraints

#### **UI Components**
- Complete shadcn/ui component library
- Consistent layout patterns (PageLayout, DataTable, etc.)
- Error boundaries and user feedback systems

#### **API Patterns**
- Consistent REST API structure with Express.js
- Swagger/OpenAPI documentation
- Standardized response formats and error handling

#### **Validation & Security**
- Zod schemas with validation middleware
- Input sanitization and type safety
- CORS and rate limiting infrastructure

#### **Frontend Architecture**
- React with TypeScript for type safety
- React Router with nested routing
- Context providers for authentication and theming

### Current Schema Structure

```typescript
// Foundation tables already in place:
- sys_tenant: Tenant registry and management
- sys_user: User accounts with tenant association
- sys_role: Hierarchical role system with tenant scoping
- sys_permission: Granular permission system
- sys_user_role: Many-to-many user-role relationships
- sys_role_permission: Many-to-many role-permission relationships
- sys_option: System configuration storage
```

## Detailed Enhancement Plan

### Phase 1: Schema-Per-Tenant Database Refactoring ✅

#### 1.1 Enhance Tenant Management ✅

Extend the existing `sys_tenant` table to support schema management:

```typescript
// Enhance existing src/server/lib/db/schema/system.ts
export const tenant = pgTable('sys_tenant', {
  // Keep existing fields
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 255 }),
  
  // Add new fields for multi-tenant schema management
  schemaName: varchar('schema_name', { length: 255 }).notNull().unique(), // tenant_acme
  status: varchar('status', { 
    length: 50, 
    enum: ["active", "inactive", "suspended", "provisioning"] 
  }).default("active"),
  databaseUrl: varchar('database_url', { length: 500 }), // For future multi-DB support
  
  // Resource limits
  maxUsers: integer('max_users').default(100),
  maxStorage: bigint('max_storage', { mode: 'number' }).default(1000000), // bytes
  
  // Feature flags
  enabledModules: varchar('enabled_modules', { length: 1000 }), // JSON array of module IDs
  customSettings: varchar('custom_settings', { length: 2000 }), // JSON object
  
  // Keep existing audit fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
```

#### 1.2 Create Tenant Database Abstraction Layer ✅

```typescript
// foundation/server/lib/db/tenant-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import { tenant } from './schema/system';

export class TenantDatabaseManager {
  private connections = new Map<string, ReturnType<typeof drizzle>>();
  private static instance: TenantDatabaseManager;

  static getInstance(): TenantDatabaseManager {
    if (!TenantDatabaseManager.instance) {
      TenantDatabaseManager.instance = new TenantDatabaseManager();
    }
    return TenantDatabaseManager.instance;
  }

  async getTenantDb(tenantId: string) {
    if (!this.connections.has(tenantId)) {
      const tenantInfo = await this.getTenant(tenantId);
      const schemaName = tenantInfo.schemaName;
      
      // Create schema-specific connection
      const connection = drizzle(connectionPool, {
        schema: allModuleSchemas,
        schemaFilter: (tableName) => `${schemaName}.${tableName}`
      });
      
      this.connections.set(tenantId, connection);
    }
    
    return this.connections.get(tenantId)!;
  }

  async getTenant(tenantId: string) {
    const [tenantRecord] = await db
      .select()
      .from(tenant)
      .where(and(
        eq(tenant.id, tenantId),
        eq(tenant.status, 'active')
      ))
      .limit(1);

    if (!tenantRecord) {
      throw new Error(`Active tenant not found: ${tenantId}`);
    }

    return tenantRecord;
  }

  async createTenantSchema(tenantId: string, schemaName: string) {
    // Create PostgreSQL schema
    await this.executeSQL(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Apply all foundation schemas
    await this.applyFoundationSchemas(schemaName);
    
    // Deploy all registered modules
    await this.deployAllModulesToTenant(tenantId);
    
    console.log(`✅ Created tenant schema: ${schemaName}`);
  }

  async applyFoundationSchemas(schemaName: string) {
    // Apply system tables to tenant schema
    const foundationTables = [
      'users', 'roles', 'permissions', 
      'user_roles', 'role_permissions', 'options'
    ];

    for (const table of foundationTables) {
      await this.executeSQL(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.${table} 
        (LIKE public.sys_${table} INCLUDING ALL)
      `);
    }
  }

  async deployAllModulesToTenant(tenantId: string) {
    const registeredModules = await moduleRegistry.getActiveModules();
    
    for (const module of registeredModules) {
      await this.deployModuleToTenant(module, tenantId);
    }
  }

  private async executeSQL(sql: string) {
    // Execute raw SQL with proper error handling
    return await db.execute(sql);
  }
}

export const tenantDbManager = TenantDatabaseManager.getInstance();
```

#### 1.3 Enhance Authentication Middleware ✅

Build upon the existing authentication middleware:

```typescript
// Enhance existing src/server/middleware/authMiddleware.ts
import { tenantDbManager } from '../lib/db/tenant-db';

// Extend existing Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        activeTenantId: string;
        userId: string;
        isSuperAdmin?: boolean;
      };
      db?: ReturnType<typeof drizzle>; // Tenant-scoped database connection
    }
  }
}

export const authenticated = () => async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No Bearer token provided or invalid format.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as DecodedToken;
    if (!decoded.username) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Keep existing user validation logic
    const currentUser = await db
      .select()
      .from(user)
      .where(and(
        eq(user.username, decoded.username),
        eq(user.status, "active"))
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!currentUser) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // Enhanced user context
    req.user = { 
      username: currentUser.username, 
      activeTenantId: currentUser.activeTenantId,
      userId: currentUser.id,
      isSuperAdmin: currentUser.isSuperAdmin || false
    };
    
    // NEW: Automatically set tenant-scoped database connection
    if (!currentUser.isSuperAdmin) {
      req.db = await tenantDbManager.getTenantDb(currentUser.activeTenantId);
    } else {
      // Super admins get global database access
      req.db = db;
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// New super admin middleware
export const superAdminOnly = () => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: 'Super admin access required.' });
  }
  next();
};
```

### Phase 2: Module System Implementation

#### 2.1 Create Module Registry System ✅

```typescript
// foundation/server/lib/modules/module-registry.ts
export interface ModuleConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  
  // Dependencies and compatibility
  dependencies: string[];
  compatibleVersions: string[];
  
  // Security and permissions
  permissions: string[];
  roles: string[];
  
  // Database requirements
  database: {
    tables: string[];
    requiresSeeding: boolean;
    migrations?: string[];
  };
  
  // API integration
  apiRoutes: {
    prefix: string;
    endpoints: Array<{ 
      path: string; 
      methods: string[]; 
      permissions?: string[];
    }>;
  };
  
  // Frontend integration
  navigation: {
    section: string;
    items: Array<{ 
      path: string; 
      label: string; 
      icon: string;
      permissions?: string[];
    }>;
  };
  
  // Feature configuration
  features: Record<string, boolean>;
  settings: Record<string, any>;
}

export class ModuleRegistry {
  private modules = new Map<string, ModuleConfig>();
  private static instance: ModuleRegistry;

  static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  async discoverModules() {
    const modulesDirs = await fs.readdir('src/modules');
    
    for (const moduleDir of modulesDirs) {
      const configPath = `src/modules/${moduleDir}/module.config.ts`;
      if (await fs.exists(configPath)) {
        try {
          const { default: config } = await import(configPath);
          this.modules.set(config.id, config);
          console.log(`✅ Discovered module: ${config.name}`);
        } catch (error) {
          console.error(`❌ Failed to load module ${moduleDir}:`, error);
        }
      }
    }
  }

  async registerModule(config: ModuleConfig) {
    // Validate module configuration
    await this.validateModule(config);
    
    // Check dependencies
    await this.validateDependencies(config);
    
    // Register API routes
    await this.registerRoutes(config);
    
    // Deploy to all active tenant schemas
    await this.deployToAllTenants(config);
    
    // Store in registry
    this.modules.set(config.id, config);
    
    console.log(`✅ Module ${config.name} registered successfully`);
  }

  async validateModule(config: ModuleConfig): Promise<void> {
    const requiredFields = ['id', 'name', 'version', 'database', 'apiRoutes'];
    
    for (const field of requiredFields) {
      if (!config[field as keyof ModuleConfig]) {
        throw new Error(`Module ${config.id} missing required field: ${field}`);
      }
    }

    // Validate unique module ID
    if (this.modules.has(config.id)) {
      throw new Error(`Module ID ${config.id} already exists`);
    }

    // Validate API route conflicts
    await this.checkRouteConflicts(config);
  }

  async validateDependencies(config: ModuleConfig): Promise<void> {
    for (const depId of config.dependencies) {
      if (!this.modules.has(depId)) {
        throw new Error(`Module ${config.id} depends on missing module: ${depId}`);
      }
    }
  }

  async deployToAllTenants(config: ModuleConfig) {
    const tenants = await db.select().from(tenant).where(eq(tenant.status, 'active'));
    
    for (const tenantRecord of tenants) {
      await this.deployModuleToTenant(config, tenantRecord.id);
    }
  }

  getActiveModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();
```

#### 2.2 Create Module Templates System

```typescript
// tools/module-generator/templates/crud-template.ts
export interface TemplateOptions {
  moduleName: string;
  entityName: string;
  fields?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required?: boolean;
    unique?: boolean;
  }>;
}

export const generateCrudModule = (options: TemplateOptions) => {
  const { moduleName, entityName, fields = [] } = options;
  const entityNameLower = entityName.toLowerCase();
  const entityNameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const entityNamePlural = `${entityNameLower}s`;

  return {
    // Module configuration
    config: `
export const ${entityNameCamel}Module = {
  id: "${moduleName}",
  name: "${entityName} Management",
  version: "1.0.0",
  description: "Complete ${entityName.toLowerCase()} management system",
  author: "Module Generator",
  
  dependencies: [],
  permissions: [
    "${moduleName}.view",
    "${moduleName}.add", 
    "${moduleName}.edit",
    "${moduleName}.delete"
  ],
  roles: ["${moduleName.toUpperCase()}_MANAGER", "${moduleName.toUpperCase()}_USER"],
  
  database: {
    tables: ["${entityNamePlural}"],
    requiresSeeding: true
  },
  
  apiRoutes: {
    prefix: "/api/${moduleName}",
    endpoints: [
      { path: "/${entityNamePlural}", methods: ["GET", "POST"] },
      { path: "/${entityNamePlural}/:id", methods: ["GET", "PUT", "DELETE"] }
    ]
  },
  
  navigation: {
    section: "Business",
    items: [
      { 
        path: "/console/${moduleName}/${entityNamePlural}", 
        label: "${entityName}s", 
        icon: "Package",
        permissions: ["${moduleName}.view"]
      }
    ]
  },
  
  features: {
    export: true,
    import: true,
    advancedFiltering: true
  }
};

export default ${entityNameCamel}Module;`,

    // Database schema using existing patterns
    schema: `
import { pgTable, uuid, varchar, timestamp, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Clean table definition - foundation handles tenant isolation
export const ${entityNamePlural} = pgTable('${entityNamePlural}', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  
  ${fields.map(field => {
    switch (field.type) {
      case 'string':
        return `${field.name}: varchar('${field.name}', { length: 255 })${field.required ? '.notNull()' : ''},`;
      case 'number':
        return `${field.name}: integer('${field.name}')${field.required ? '.notNull()' : ''},`;
      case 'boolean':
        return `${field.name}: boolean('${field.name}').default(false),`;
      case 'date':
        return `${field.name}: timestamp('${field.name}')${field.required ? '.notNull()' : ''},`;
      default:
        return `${field.name}: varchar('${field.name}', { length: 255 }),`;
    }
  }).join('\n  ')}
  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("${entityNamePlural}_name_idx").on(t.name),
]);

// Relations (add as needed)
export const ${entityNamePlural}Relations = relations(${entityNamePlural}, ({ one, many }) => ({
  // Add relations to other entities here
}));`,

    // API routes leveraging existing middleware and patterns
    routes: `
import { Router } from 'express';
import { and, asc, count, desc, eq, ilike } from 'drizzle-orm';
import { authenticated, authorized } from '@foundation/server/middleware/authMiddleware';
import { validateData } from '@foundation/server/middleware/validationMiddleware';
import { ${entityNameCamel}Schema, ${entityNameCamel}EditSchema } from '../schemas/${entityNameCamel}Schema';
import { ${entityNamePlural} } from '../database/schema';

const ${entityNameCamel}Router = Router();

// All routes require authentication (using existing middleware)
${entityNameCamel}Router.use(authenticated());

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}:
 *   get:
 *     tags:
 *       - ${entityName} Management
 *     summary: Get ${entityName.toLowerCase()}s
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.get("/", 
  authorized('${moduleName.toUpperCase()}_MANAGER', '${moduleName}.view'), 
  async (req, res) => {
    // Use existing pagination pattern
    const pageParam = req.query.page as string | undefined;
    const perPageParam = req.query.perPage as string | undefined;
    const sortParam = req.query.sort || 'name';
    const orderParam = req.query.order || 'asc';
    const filterParam = req.query.filter || '';

    const page = pageParam ? parseInt(pageParam) : 1;
    const perPage = perPageParam ? parseInt(perPageParam) : 10;
    const offset = (page - 1) * perPage;

    // Build filter condition (leverage existing patterns)
    const filterCondition = filterParam
      ? ilike(${entityNamePlural}.name, \`%\${filterParam}%\`)
      : undefined;

    // Get total count
    const [{ value: total }] = await req.db!
      .select({ value: count() })
      .from(${entityNamePlural})
      .where(filterCondition);

    // Get items with sorting
    const sortColumn = ${entityNamePlural}[sortParam as keyof typeof ${entityNamePlural}] || ${entityNamePlural}.name;
    const items = await req.db!
      .select()
      .from(${entityNamePlural})
      .where(filterCondition)
      .orderBy(orderParam === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(perPage)
      .offset(offset);

    res.json({
      items,
      count: total,
      page,
      perPage,
      sort: sortParam,
      order: orderParam,
      filter: filterParam
    });
  }
);

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}:
 *   post:
 *     tags:
 *       - ${entityName} Management
 *     summary: Create ${entityName.toLowerCase()}
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.post("/",
  authorized('${moduleName.toUpperCase()}_MANAGER', '${moduleName}.add'),
  validateData(${entityNameCamel}Schema),
  async (req, res) => {
    try {
      const [newItem] = await req.db!
        .insert(${entityNamePlural})
        .values({
          id: crypto.randomUUID(),
          ...req.body
        })
        .returning();

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}/{id}:
 *   get:
 *     tags:
 *       - ${entityName} Management
 *     summary: Get ${entityName.toLowerCase()} by ID
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.get("/:id",
  authorized('${moduleName.toUpperCase()}_MANAGER', '${moduleName}.view'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [item] = await req.db!
        .select()
        .from(${entityNamePlural})
        .where(eq(${entityNamePlural}.id, id))
        .limit(1);

      if (!item) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

export default ${entityNameCamel}Router;`,

    // Frontend component using existing UI patterns
    component: `
import React from 'react';
import { PageLayout } from '@foundation/client/components/layout/PageLayout';
import { DataTable } from '@foundation/client/components/data/DataTable';
import { Authorized } from '@foundation/client/components/auth/Authorized';
import { Button } from '@foundation/client/components/ui/button';
import { Plus } from 'lucide-react';

const ${entityName}sPage = () => {
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description", 
      header: "Description",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }: any) => (
        <span className={\`px-2 py-1 rounded-full text-xs \${
          row.getValue("isActive") 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }\`}>
          {row.getValue("isActive") ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: any) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString();
      },
    },
  ];

  return (
    <Authorized permissions={["${moduleName}.view"]}>
      <PageLayout
        title="${entityName}s"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "${entityName}s", href: "/console/${moduleName}/${entityNamePlural}" }
        ]}
        actions={
          <Authorized permissions={["${moduleName}.add"]}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add ${entityName}
            </Button>
          </Authorized>
        }
      >
        <DataTable
          endpoint="/api/${moduleName}/${entityNamePlural}"
          columns={columns}
          searchable={true}
          filterable={true}
        />
      </PageLayout>
    </Authorized>
  );
};

export default ${entityName}sPage;`,

    // Validation schemas
    schemas: `
import { z } from 'zod';

export const ${entityNameCamel}Schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(500).optional(),
  ${fields.map(field => {
    switch (field.type) {
      case 'string':
        return `${field.name}: z.string()${field.required ? '' : '.optional()'}${field.name === 'email' ? '.email()' : ''},`;
      case 'number':
        return `${field.name}: z.number()${field.required ? '' : '.optional()'},`;
      case 'boolean':
        return `${field.name}: z.boolean().default(false),`;
      case 'date':
        return `${field.name}: z.date()${field.required ? '' : '.optional()'},`;
      default:
        return `${field.name}: z.string()${field.required ? '' : '.optional()'},`;
    }
  }).join('\n  ')}
});

export const ${entityNameCamel}EditSchema = ${entityNameCamel}Schema.extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type ${entityName} = z.infer<typeof ${entityNameCamel}Schema>;
export type ${entityName}Edit = z.infer<typeof ${entityNameCamel}EditSchema>;`
  };
};
```

## Phase 2 Integration Gaps - Technical Debt

The following integration issues were identified during Phase 2.2 implementation and must be resolved to make the module generation system fully functional:

### Critical Integration Gaps (Must be resolved in Phase 2 completion)

#### 2.3.1 Permission System Integration ✅ **[CRITICAL]**
**Problem**: Generated modules create new permissions (e.g., `inventory.items.view`, `inventory.items.add`) but these are not automatically integrated into the system.

**Impact**: Generated modules fail authorization checks because permissions don't exist in the system.

**Required Solution**: 
- Extend module generator to automatically add new permissions to `src/server/lib/constants/permissions.ts`
- Update database seeders to grant new permissions to appropriate roles (SYSADMIN, USER)
- Ensure permission seeding runs automatically during module generation

#### 2.3.2 API Route Mounting ✅ **[CRITICAL]**
**Problem**: Generated routes expect to be accessible at specific paths (e.g., `/api/inventory/items`) but there's no guarantee the Module Registry mounts them correctly.

**Impact**: Frontend API calls return 404 errors, breaking all module functionality.

**Required Solution**:
- Enhance Module Registry to automatically mount module routes at predictable paths
- Ensure generated routes match frontend endpoint expectations
- Add route validation and conflict detection

#### 2.3.3 Database Schema Integration ✅ **[CRITICAL]** 
**Problem**: Generated database schemas are not automatically integrated with the existing Drizzle ORM setup.

**Impact**: TypeScript compilation fails due to missing table imports, and database tables don't exist at runtime.

**Required Solution**:
- Auto-generate or append to module-specific schema files in `src/server/lib/db/schema/`
- Automatically run `npm run db:push --force` to create database tables
- Ensure proper schema exports and imports resolve correctly

#### 2.3.4 Navigation Permission Consistency ✅ **[HIGH]**
**Problem**: Navigation menu items use different permission naming pattern than actual routes.

**Impact**: Navigation items remain hidden even when users have proper permissions to access modules.

**Required Solution**:
- Align navigation permission patterns with route permission patterns
- Ensure consistent use of `${module}.${entityPlural}.view` format throughout

#### 2.3.5 Fix Module Generation ✅ **[CRITICAL]**
**Problem**: CLI only logs generated code but doesn't write files to disk. Template integrators exist but aren't wired to the CLI.

**Impact**: Module generation produces no actual files, breaking the entire automated workflow.

**Required Solution**: 
- Wire file writing in `tools/module-generator/generate-module.ts`
- Connect DatabaseSchemaIntegrator and PermissionIntegrator to CLI
- Generate working `module.config.ts`, schema files, route files, and components
- Export real `generateCrudModuleWithIntegration` function that performs end-to-end integration

#### 2.3.6 Complete Integration Wiring ✅ **[CRITICAL]**
**Problem**: Module discovery and route mounting not initialized in server startup. Generated modules aren't automatically registered.

**Impact**: Generated modules exist as files but aren't functional because they're not discovered or mounted.

**Required Solution**:
- Initialize module registry and route registry in `src/server/main.ts`
- Call `routeRegistry.setExpressApp(app)` and `moduleRegistry.discoverModules()` on startup
- Ensure automatic module discovery and mounting works
- Test that generated modules are immediately functional after generation

#### 2.3.7 Verify Tenant Isolation **[SECURITY]**
**Problem**: Tenant-scoped database context enforcement needs verification across all routes to prevent cross-tenant data leakage.

**Impact**: Potential security vulnerability allowing users to access other tenants' data.

**Required Solution**:
- Verify auth middleware sets tenant context correctly on all routes
- Ensure all database access uses `tenantDbManager` or tenant-scoped connections
- Add integration tests to prevent cross-tenant access
- Validate that `req.db` contains only tenant-scoped data

### Recommended Resolution Timeline

These gaps should be addressed in **Phase 2.3: Integration Completion** before proceeding to Phase 3:

**Week 1-2: Critical Infrastructure**
- [x] Implement automatic permission registration system
- [x] Enhance Module Registry with automatic route mounting
- [x] Create database schema integration pipeline

**Week 3: Testing & Validation** 
- [x] Fix module generation file writing (Phase 2.3.5)
- [x] Complete integration wiring in server startup (Phase 2.3.6)
- [ ] Verify tenant isolation security (Phase 2.3.7)
- [ ] Test complete module generation workflow end-to-end
- [ ] Validate generated modules work without manual intervention

**Success Criteria for Phase 2 Completion**:
- Generate a new module and have it immediately functional without manual integration steps
- All authorization checks pass for generated permissions
- Frontend can successfully call generated API endpoints
- Database tables exist and queries execute successfully

### Phase 3: Enhanced Role System

#### 3.1 Super Admin System ✅

Extend the existing role system to include super admin capabilities:

```typescript
// Enhance existing src/server/lib/db/schema/system.ts
export const user = pgTable('sys_user', {
  // Keep all existing fields
  id: uuid('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullname: varchar('fullname', { length: 255 }).notNull(),
  status: varchar('status', { length: 255, enum: ["active", "inactive"] }).notNull(),
  email: varchar('email', { length: 255 }),
  avatar: varchar('avatar', { length: 255 }),
  activeTenantId: uuid('tenant_id').notNull().references(() => tenant.id),
  
  // Add super admin capabilities
  isSuperAdmin: boolean('is_super_admin').default(false),
  globalPermissions: varchar('global_permissions', { length: 1000 }), // JSON array
  
  // Keep existing audit fields
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// Super admin permissions
export const SUPER_ADMIN_PERMISSIONS = [
  // Tenant Management
  'system.tenant.create',
  'system.tenant.edit',
  'system.tenant.activate',
  'system.tenant.deactivate',
  'system.tenant.delete',
  
  // Module Management
  'system.module.install',
  'system.module.activate',
  'system.module.deactivate',
  'system.module.configure',
  'system.module.remove',
  
  // System Monitoring
  'system.monitoring.view',
  'system.logs.view',
  'system.performance.view',
  'system.health.view',
  
  // Global Configuration
  'system.config.edit',
  'system.backup.manage',
  'system.security.manage',
  
  // User Management
  'system.user.impersonate',
  'system.user.global.view',
];
```

#### 3.2 Super Admin Dashboard

Leverage existing UI components for the super admin interface:

```typescript
// src/client/pages/console/system/SuperAdminDashboard.tsx
import React from 'react';
import { PageLayout } from '@foundation/client/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@foundation/client/components/ui/card';
import { Authorized } from '@foundation/client/components/auth/Authorized';
import { TenantManagementWidget } from './widgets/TenantManagementWidget';
import { ModuleManagementWidget } from './widgets/ModuleManagementWidget';
import { SystemHealthWidget } from './widgets/SystemHealthWidget';
import { SystemMetricsWidget } from './widgets/SystemMetricsWidget';

export const SuperAdminDashboard = () => {
  return (
    <Authorized permissions={["system.manage"]}>
      <PageLayout 
        title="Super Admin Dashboard"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "System", href: "/console/system" },
          { label: "Dashboard", href: "/console/system/dashboard" }
        ]}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tenant Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Tenant Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TenantManagementWidget />
            </CardContent>
          </Card>
          
          {/* Module Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Module Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModuleManagementWidget />
            </CardContent>
          </Card>
          
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemHealthWidget />
            </CardContent>
          </Card>
          
          {/* System Metrics */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemMetricsWidget />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </Authorized>
  );
};

export default SuperAdminDashboard;
```

### Phase 4: Development Tools

#### ~~4.1 Module Generator CLI~~ *(DEPRECATED - Replaced by improved implementation)*

~~Module Generator CLI approach replaced by superior implementation that provides better integration and business analyst workflow.~~

#### 4.1 Runtime Module Hotswap System

```typescript
// src/server/lib/modules/hotswap-manager.ts
import { ModuleRegistry } from './module-registry';
import { RouteRegistry } from './route-registry';
import { tenantDbManager } from '../db/tenant-db';

export class ModuleHotswapManager {
  private static instance: ModuleHotswapManager;
  private moduleRegistry: ModuleRegistry;
  private routeRegistry: RouteRegistry;

  constructor() {
    this.moduleRegistry = ModuleRegistry.getInstance();
    this.routeRegistry = RouteRegistry.getInstance();
  }

  static getInstance(): ModuleHotswapManager {
    if (!ModuleHotswapManager.instance) {
      ModuleHotswapManager.instance = new ModuleHotswapManager();
    }
    return ModuleHotswapManager.instance;
  }

  /**
   * Hotswap a module without server restart
   */
  async hotswapModule(moduleId: string): Promise<void> {
    try {
      console.log(`🔄 Hotswapping module: ${moduleId}`);
      
      // 1. Unmount existing routes
      await this.routeRegistry.unmountModuleRoutes(moduleId);
      
      // 2. Clear module from registry
      this.moduleRegistry.unregisterModule(moduleId);
      
      // 3. Clear require cache for module files
      this.clearModuleCache(moduleId);
      
      // 4. Re-discover and register the module
      await this.moduleRegistry.discoverModule(moduleId);
      
      // 5. Re-mount routes
      const moduleConfig = this.moduleRegistry.getModule(moduleId);
      if (moduleConfig) {
        await this.routeRegistry.mountModuleRoutes(moduleConfig);
      }
      
      // 6. Apply database schema changes to all tenants
      await this.applySchemaChangesToAllTenants(moduleId);
      
      console.log(`✅ Module ${moduleId} hotswapped successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to hotswap module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Import and deploy a new module package
   */
  async importModule(modulePackage: ModulePackage): Promise<void> {
    try {
      console.log(`📦 Importing module package: ${modulePackage.id}`);
      
      // 1. Validate module package
      await this.validateModulePackage(modulePackage);
      
      // 2. Extract module files to modules directory
      await this.extractModuleFiles(modulePackage);
      
      // 3. Register and mount the new module
      await this.hotswapModule(modulePackage.id);
      
      console.log(`✅ Module ${modulePackage.id} imported and deployed`);
      
    } catch (error) {
      console.error(`❌ Failed to import module:`, error);
      throw error;
    }
  }

  /**
   * Export a module as a package for sharing
   */
  async exportModule(moduleId: string): Promise<ModulePackage> {
    try {
      const moduleConfig = this.moduleRegistry.getModule(moduleId);
      if (!moduleConfig) {
        throw new Error(`Module ${moduleId} not found`);
      }

      // Package all module files
      const moduleFiles = await this.collectModuleFiles(moduleId);
      
      const modulePackage: ModulePackage = {
        id: moduleId,
        config: moduleConfig,
        files: moduleFiles,
        exportedAt: new Date(),
        version: moduleConfig.version
      };

      console.log(`📤 Exported module ${moduleId} as package`);
      return modulePackage;
      
    } catch (error) {
      console.error(`❌ Failed to export module:`, error);
      throw error;
    }
  }

  private clearModuleCache(moduleId: string): void {
    const moduleBasePath = path.resolve(`src/modules/${moduleId}`);
    
    // Clear all cached files for this module
    Object.keys(require.cache).forEach(cacheKey => {
      if (cacheKey.startsWith(moduleBasePath)) {
        delete require.cache[cacheKey];
      }
    });
  }

  private async applySchemaChangesToAllTenants(moduleId: string): Promise<void> {
    const activeTenantsQuery = await db.select().from(tenant).where(eq(tenant.status, 'active'));
    
    for (const tenantRecord of activeTenantsQuery) {
      try {
        await tenantDbManager.deployModuleToTenant(moduleId, tenantRecord.id);
        console.log(`✅ Applied schema changes for module ${moduleId} to tenant ${tenantRecord.code}`);
      } catch (error) {
        console.error(`❌ Failed to apply schema changes to tenant ${tenantRecord.code}:`, error);
      }
    }
  }

  private async validateModulePackage(modulePackage: ModulePackage): Promise<void> {
    // Validate package structure
    if (!modulePackage.id || !modulePackage.config || !modulePackage.files) {
      throw new Error('Invalid module package structure');
    }

    // Check for conflicts with existing modules
    const existingModule = this.moduleRegistry.getModule(modulePackage.id);
    if (existingModule) {
      console.log(`ℹ️ Module ${modulePackage.id} already exists, will be replaced`);
    }

    // Validate module configuration
    await this.moduleRegistry.validateModule(modulePackage.config);
  }

  private async extractModuleFiles(modulePackage: ModulePackage): Promise<void> {
    const moduleDir = `src/modules/${modulePackage.id}`;
    
    // Create module directory structure
    await fs.mkdir(moduleDir, { recursive: true });
    
    // Write all module files
    for (const [filePath, content] of Object.entries(modulePackage.files)) {
      const fullPath = path.join(moduleDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }
  }

  private async collectModuleFiles(moduleId: string): Promise<Record<string, string>> {
    const moduleDir = `src/modules/${moduleId}`;
    const files: Record<string, string> = {};
    
    const collectFilesRecursively = async (dir: string, basePath: string = '') => {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
        
        if (item.isDirectory()) {
          await collectFilesRecursively(itemPath, relativePath);
        } else {
          const content = await fs.readFile(itemPath, 'utf8');
          files[relativePath] = content;
        }
      }
    };
    
    await collectFilesRecursively(moduleDir);
    return files;
  }
}

export interface ModulePackage {
  id: string;
  config: ModuleConfig;
  files: Record<string, string>; // filepath -> content
  exportedAt: Date;
  version: string;
}

export const moduleHotswapManager = ModuleHotswapManager.getInstance();
```

**API Endpoints for Hotswap Management:**

```typescript
// src/server/routes/system/modules.ts
import { Router } from 'express';
import { authenticated, superAdminOnly } from '../../middleware/authMiddleware';
import { moduleHotswapManager } from '../../lib/modules/hotswap-manager';

const modulesRouter = Router();

// All routes require super admin access
modulesRouter.use(authenticated(), superAdminOnly());

/**
 * Hotswap a module without server restart
 */
modulesRouter.post('/hotswap/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    await moduleHotswapManager.hotswapModule(moduleId);
    res.json({ success: true, message: `Module ${moduleId} hotswapped successfully` });
  } catch (error) {
    res.status(500).json({ error: `Failed to hotswap module: ${error.message}` });
  }
});

/**
 * Import a module package
 */
modulesRouter.post('/import', async (req, res) => {
  try {
    const modulePackage = req.body;
    await moduleHotswapManager.importModule(modulePackage);
    res.json({ success: true, message: `Module ${modulePackage.id} imported successfully` });
  } catch (error) {
    res.status(500).json({ error: `Failed to import module: ${error.message}` });
  }
});

/**
 * Export a module as package
 */
modulesRouter.get('/export/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const modulePackage = await moduleHotswapManager.exportModule(moduleId);
    res.json(modulePackage);
  } catch (error) {
    res.status(500).json({ error: `Failed to export module: ${error.message}` });
  }
});

export default modulesRouter;
```

#### 4.2 Validation and Testing Tools

```typescript
// tools/validators/module-validator.ts
import { fs } from 'fs/promises';
import { ModuleConfig } from '../foundation/server/lib/modules/module-registry';

export interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
}

export const validateModule = async (modulePath: string): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];
  
  try {
    // 1. Check required files exist
    const requiredFiles = [
      'module.config.ts',
      'database/schema.ts',
      'server/routes',
      'client/pages'
    ];
    
    for (const file of requiredFiles) {
      const filePath = `${modulePath}/${file}`;
      try {
        await fs.access(filePath);
      } catch {
        results.push({
          type: 'error',
          message: `Missing required file: ${file}`,
          file: filePath
        });
      }
    }
    
    // 2. Validate module configuration
    try {
      const configPath = `${modulePath}/module.config.ts`;
      const { default: config } = await import(configPath);
      
      const configResults = validateModuleConfig(config);
      results.push(...configResults);
      
    } catch (error) {
      results.push({
        type: 'error',
        message: `Failed to load module configuration: ${error}`,
        file: 'module.config.ts'
      });
    }
    
    // 3. Validate database schema
    try {
      const schemaPath = `${modulePath}/database/schema.ts`;
      const schemaContent = await fs.readFile(schemaPath, 'utf8');
      
      const schemaResults = validateDatabaseSchema(schemaContent);
      results.push(...schemaResults);
      
    } catch (error) {
      results.push({
        type: 'error',
        message: `Failed to validate database schema: ${error}`,
        file: 'database/schema.ts'
      });
    }
    
    // 4. Validate API routes
    const routesPath = `${modulePath}/server/routes`;
    try {
      const routeFiles = await fs.readdir(routesPath);
      
      for (const routeFile of routeFiles) {
        if (routeFile.endsWith('.ts')) {
          const routeContent = await fs.readFile(`${routesPath}/${routeFile}`, 'utf8');
          const routeResults = validateApiRoutes(routeContent, routeFile);
          results.push(...routeResults);
        }
      }
    } catch (error) {
      results.push({
        type: 'warning',
        message: `Could not validate routes: ${error}`,
        file: 'server/routes'
      });
    }
    
    // 5. Validate frontend components
    const pagesPath = `${modulePath}/client/pages`;
    try {
      const pageFiles = await fs.readdir(pagesPath);
      
      for (const pageFile of pageFiles) {
        if (pageFile.endsWith('.tsx')) {
          const pageContent = await fs.readFile(`${pagesPath}/${pageFile}`, 'utf8');
          const componentResults = validateFrontendComponent(pageContent, pageFile);
          results.push(...componentResults);
        }
      }
    } catch (error) {
      results.push({
        type: 'warning',
        message: `Could not validate frontend components: ${error}`,
        file: 'client/pages'
      });
    }
    
  } catch (error) {
    results.push({
      type: 'error',
      message: `Failed to validate module: ${error}`
    });
  }
  
  return results;
};

const validateModuleConfig = (config: ModuleConfig): ValidationResult[] => {
  const results: ValidationResult[] = [];
  
  // Check required fields
  const requiredFields = ['id', 'name', 'version', 'database', 'apiRoutes'];
  for (const field of requiredFields) {
    if (!config[field as keyof ModuleConfig]) {
      results.push({
        type: 'error',
        message: `Missing required configuration field: ${field}`,
        file: 'module.config.ts'
      });
    }
  }
  
  // Validate ID format
  if (config.id && !/^[a-z][a-z0-9-]*$/.test(config.id)) {
    results.push({
      type: 'error',
      message: 'Module ID must be lowercase letters, numbers, and dashes only',
      file: 'module.config.ts'
    });
  }
  
  // Validate version format
  if (config.version && !/^\d+\.\d+\.\d+$/.test(config.version)) {
    results.push({
      type: 'warning',
      message: 'Version should follow semantic versioning (x.y.z)',
      file: 'module.config.ts'
    });
  }
  
  return results;
};

const validateDatabaseSchema = (schemaContent: string): ValidationResult[] => {
  const results: ValidationResult[] = [];
  
  // Check for proper imports
  if (!schemaContent.includes('pgTable')) {
    results.push({
      type: 'error',
      message: 'Database schema must import pgTable from drizzle-orm',
      file: 'database/schema.ts'
    });
  }
  
  // Check for tenant_id (should NOT be present in schema-per-tenant)
  if (schemaContent.includes('tenantId') || schemaContent.includes('tenant_id')) {
    results.push({
      type: 'warning',
      message: 'Schema should not include tenantId field - handled by foundation',
      file: 'database/schema.ts'
    });
  }
  
  // Check for audit fields
  if (!schemaContent.includes('createdAt')) {
    results.push({
      type: 'warning',
      message: 'Consider adding createdAt audit field',
      file: 'database/schema.ts'
    });
  }
  
  return results;
};

const validateApiRoutes = (routeContent: string, fileName: string): ValidationResult[] => {
  const results: ValidationResult[] = [];
  
  // Check for authentication middleware
  if (!routeContent.includes('authenticated()')) {
    results.push({
      type: 'error',
      message: 'All routes must use authenticated() middleware',
      file: `server/routes/${fileName}`
    });
  }
  
  // Check for authorization middleware
  if (!routeContent.includes('authorized(')) {
    results.push({
      type: 'warning',
      message: 'Routes should use authorized() middleware for access control',
      file: `server/routes/${fileName}`
    });
  }
  
  // Check for Swagger documentation
  if (!routeContent.includes('@swagger')) {
    results.push({
      type: 'warning',
      message: 'Routes should include Swagger documentation',
      file: `server/routes/${fileName}`
    });
  }
  
  // Check for tenant database usage
  if (!routeContent.includes('req.db')) {
    results.push({
      type: 'warning',
      message: 'Routes should use req.db for tenant-scoped database access',
      file: `server/routes/${fileName}`
    });
  }
  
  return results;
};

const validateFrontendComponent = (componentContent: string, fileName: string): ValidationResult[] => {
  const results: ValidationResult[] = [];
  
  // Check for authorization wrapper
  if (!componentContent.includes('<Authorized')) {
    results.push({
      type: 'warning',
      message: 'Components should wrap sensitive content with <Authorized>',
      file: `client/pages/${fileName}`
    });
  }
  
  // Check for PageLayout usage
  if (!componentContent.includes('PageLayout')) {
    results.push({
      type: 'info',
      message: 'Consider using PageLayout for consistent page structure',
      file: `client/pages/${fileName}`
    });
  }
  
  return results;
};
```

## Implementation Timeline

### Week 1-2: Database Foundation
- [ ] Enhance tenant table with schema management fields
- [ ] Create tenant database abstraction layer  
- [ ] Refactor authentication middleware for tenant DB connections
- [ ] Create tenant provisioning system
- [ ] Implement super admin role enhancements

### Week 3-4: Module System Core
- [ ] Implement module registry and discovery system
- [ ] Create module configuration interfaces
- [ ] Build module deployment automation
- [ ] Create CRUD module template
- [ ] Create workflow module template

### Week 5-6: Enhanced Administration
- [ ] Build super admin dashboard using existing UI components
- [ ] Enhance tenant admin capabilities
- [ ] Create module management interfaces
- [ ] Implement system monitoring widgets

### Week 7-8: Development Tools and Testing
- [ ] Build module generator CLI tool
- [ ] Create comprehensive validation system
- [ ] Implement conflict detection tools
- [ ] Create automated testing framework
- [ ] Enhance documentation and training materials

## Success Metrics

### Development Efficiency
- **Module Creation Time**: Target 15 minutes from requirements to working module
- **Code Reuse**: 80%+ of foundation components leveraged in new modules
- **Validation Coverage**: 100% automated validation of module standards

### System Performance
- **Tenant Isolation**: Zero cross-tenant data access incidents
- **Schema Performance**: <100ms average query time per tenant schema
- **Module Deployment**: <5 minutes to deploy module to all tenant schemas

### Developer Experience
- **Learning Curve**: Business analysts productive within 2 hours
- **Error Prevention**: 90% reduction in deployment issues through validation
- **Documentation Quality**: All modules self-documenting with generated docs

## Risk Mitigation

### Database Migration Risks
- **Backup Strategy**: Automatic backup before any schema changes
- **Rollback Plan**: Ability to rollback module deployments
- **Testing**: Comprehensive integration tests before production deployment

### Performance Risks
- **Schema Monitoring**: Track performance impact of new tenant schemas
- **Resource Limits**: Implement tenant resource quotas and monitoring
- **Optimization**: Regular analysis and optimization of query patterns

### Security Risks
- **Permission Validation**: Automated testing of permission systems
- **Tenant Isolation**: Regular audits of cross-tenant access prevention
- **Code Review**: All modules reviewed for security best practices

This enhancement plan transforms the existing solid foundation into a powerful, scalable multi-module platform while preserving and extending the excellent architectural decisions already in place. The schema-per-tenant approach provides enterprise-grade security and performance, while the abstraction layer keeps development simple for business analysts.