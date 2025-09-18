# Plugin System Architecture Design

## Overview

This document outlines the design for a **hybrid monorepo + runtime plugin system** that enables business analysts to develop functional modules using AI assistance. The system combines the development simplicity of a monorepo with the operational benefits of independent plugin deployment, providing both developer experience and enterprise-grade lifecycle management.

## The Hybrid Architecture: Two-Track Approach

**Track A (Development)**: Monorepo with workspace packages
- Plugins developed as workspace packages (e.g., `@nimbus-plugin/inventory`)  
- Instant rebuilds, hot reload, unified development experience
- Only affected packages rebuild via dependency graph analysis

**Track B (Production)**: Independent versioned artifacts
- CI publishes changed plugins to private npm registry
- Runtime loader manages plugin versions per tenant
- Independent deployment, upgrades, and rollback capabilities

This approach provides monorepo development simplicity with plugin deployment flexibility.

## Core Design Principles

1. **Standardization**: All plugins follow identical patterns and interfaces
2. **Isolation**: Plugins operate through controlled API boundaries without direct system access
3. **Runtime Control**: Plugins can be enabled/disabled per tenant without code changes
4. **Operational Safety**: Built-in migration management, observability, and kill switches
5. **Scalability**: Architecture supports hundreds of tenants and dozens of plugins
6. **Governance**: Clear separation between plugin suggestions and tenant administrative control

## Hybrid Monorepo Structure

### 1. Workspace Package Architecture

```
packages/
├── plugins/                    # All business plugins as packages
│   ├── inventory/
│   │   ├── package.json        # @nimbus-plugin/inventory
│   │   ├── src/
│   │   │   ├── server/
│   │   │   │   ├── index.ts    # register(ctx) export
│   │   │   │   ├── routes/     # API endpoints
│   │   │   │   ├── schemas/    # Validation schemas
│   │   │   │   └── services/   # Business logic
│   │   │   └── frontend/
│   │   │       ├── pages/      # React components
│   │   │       ├── manifest.ts # Frontend integration
│   │   │       └── components/ # Plugin UI components
│   │   ├── migrations/
│   │   │   ├── public/         # Cross-tenant migrations
│   │   │   │   └── 001_init.sql
│   │   │   └── tenant/         # Per-tenant migrations
│   │   │       └── 001_tables.sql
│   │   ├── permissions/
│   │   │   ├── permissions.ts  # Plugin permissions
│   │   │   └── roles.ts        # Role templates
│   │   └── README.md
│   ├── sales/                  # @nimbus-plugin/sales
│   └── reporting/              # @nimbus-plugin/reporting
├── foundation/                 # Core platform
│   ├── sdk/                    # @foundation/sdk (Plugin API)
│   │   ├── package.json
│   │   └── src/
│   │       ├── plugin-context.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── server/                 # @foundation/server
│   └── client/                 # @foundation/client
apps/
├── host-api/                   # Main application backend
│   ├── package.json            # Depends on workspace plugins
│   └── src/
│       ├── plugin-loader.ts    # Runtime plugin loading
│       └── server.ts
├── host-web/                   # Main application frontend
└── admin/                      # Plugin management UI
tools/
├── plugin-generator/           # Scaffolding tools
├── migration-runner/           # Plugin migration CLI
└── deployment/                 # CI/CD helpers
pnpm-workspace.yaml             # Workspace configuration
.changeset/                     # Automated versioning
```

### 2. Workspace Dependencies

```json
// apps/host-api/package.json
{
  "name": "@nimbus/host-api",
  "dependencies": {
    "@foundation/sdk": "workspace:*",
    "@nimbus-plugin/inventory": "workspace:*",
    "@nimbus-plugin/sales": "workspace:*"
  }
}

// packages/plugins/inventory/package.json  
{
  "name": "@nimbus-plugin/inventory",
  "version": "1.2.0",
  "main": "./dist/server/index.js",
  "dependencies": {
    "@foundation/sdk": "workspace:*"
  },
  "peerDependencies": {
    "express": "^4.18.0",
    "drizzle-orm": "^0.28.0"
  }
}
```

### 3. Plugin Package Structure

Each plugin is a standalone npm package with its own dependencies and build process:

```typescript
// packages/plugins/inventory/src/server/index.ts
import { PluginContext } from '@foundation/sdk';

export const plugin = {
  id: "inventory",
  name: "Inventory Management",
  version: "1.2.0",
  apiVersion: "1.0", // Host API compatibility
  description: "Complete inventory tracking and management system",
  author: "Business Analyst Name",
  
  permissions: [
    "inventory.view", 
    "inventory.add", 
    "inventory.edit", 
    "inventory.delete",
    "inventory.reconcile"
  ]
};

// Plugin registration function
export const register = (ctx: PluginContext) => {
  const { router, rbac, withTenantTx, log } = ctx;

  router.get("/items", 
    rbac.require('inventory.view'),
    async (req, res) => {
      try {
        const result = await withTenantTx(req.tenantId, async (db) => {
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

  // Additional routes...
};

// Role templates (suggestions only)
export const roleTemplates = [
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
];
```

## Development Workflow: Two-Track System

### Track A: Development (Monorepo Experience)

#### Local Development Commands

```bash
# Initial setup
pnpm install

# Plugin development (watch mode)
pnpm -F @nimbus-plugin/inventory dev      # Plugin builds in watch mode
pnpm -F @nimbus/host-api dev              # Host API with hot reload
pnpm -F @nimbus/host-web dev              # Host web with plugin UI

# Testing
pnpm -F @nimbus-plugin/inventory test    # Unit tests for plugin
pnpm -F @nimbus/host-api test             # Integration tests

# Build affected packages only
pnpm -r build --filter ...affected       # Turborepo/Nx affected graph
```

#### Development Benefits
- **Hot Module Replacement**: Edit plugin → only plugin rebuilds → host reloads
- **Unified Tooling**: Single TypeScript config, shared linting, unified testing
- **Cross-Plugin Refactoring**: Easy to update shared types or foundation APIs
- **Fast Feedback**: Instant rebuilds with workspace symlinks

### Track B: Production (Independent Artifacts)

#### Release Process with Changesets

```bash
# 1. Make changes to inventory plugin
# 2. Add changeset
pnpm changeset
# Pick: @nimbus-plugin/inventory, choose: minor
# Write: "feat(inventory): add cycle count functionality"

# 3. Commit and push
git commit -m "feat(inventory): add cycle count page"
git push origin feature/inventory-cycle-count

# 4. CI automatically:
# - Builds only affected packages
# - Runs tests for changed plugins
# - Versions and publishes to private registry
```

#### CI/CD Pipeline

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      
      # Only build/test affected packages
      - run: pnpm -r build --filter ...affected
      - run: pnpm -r test --filter ...affected
      
      # Version and publish changed packages
      - run: pnpm changeset version
      - run: pnpm -r publish --access restricted
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Plugin Deployment & Tenant Upgrades

```bash
# Option A: Host locks plugin versions (safer for production)
# 1. Update host dependency
# apps/host-api/package.json: "@nimbus-plugin/inventory": "^1.6.0"

# 2. Deploy host application
npm run deploy:production

# 3. Runtime loader detects version change and:
# - Runs public migrations
# - Runs tenant migrations in batches (idempotent, checksummed)
# - Updates sys_plugins.version_installed
# - Host serves /api/plugins/inventory/* at new version

# Option B: Admin-controlled upgrades (more flexible)
hostctl plugins upgrade inventory --to 1.6.0 --batch 50 --dry-run
hostctl plugins upgrade inventory --to 1.6.0 --batch 50

# Rollback if needed
hostctl plugins rollback inventory --to 1.5.3 --tenant acme-corp
```

#### Runtime Plugin Loading

```typescript
// apps/host-api/src/plugin-loader.ts
import { readdir } from 'fs/promises';
import { resolve } from 'path';

export class RuntimePluginLoader {
  private validatePluginId(pluginId: string): void {
    if (!/^[a-z0-9_-]+$/.test(pluginId)) {
      throw new Error(`Invalid plugin ID: ${pluginId}`);
    }
  }

  async loadPlugins() {
    const enabledPlugins = await this.getEnabledPlugins();
    
    for (const plugin of enabledPlugins) {
      try {
        this.validatePluginId(plugin.id);
        
        // Dynamic ESM import from node_modules (with validation)
        const pluginModule = await import(`@nimbus-plugin/${plugin.id}`);
        
        // Enforce semver API compatibility (fail fast)
        if (!this.isApiCompatible(pluginModule.plugin.apiVersion)) {
          const error = `Plugin ${plugin.id}@${pluginModule.plugin.version} API version ${pluginModule.plugin.apiVersion} incompatible with host API range ${this.hostApiVersionRange}`;
          
          // Update global plugin status (process-wide loading)
          await this.updateGlobalPluginStatus(plugin.id, 'failed', error);
          
          // Surface error in admin status
          this.log.error('Plugin load failed', { 
            pluginId: plugin.id, 
            pluginVersion: pluginModule.plugin.version,
            pluginApiVersion: pluginModule.plugin.apiVersion,
            hostApiVersionRange: this.hostApiVersionRange,
            error 
          });
          
          continue; // Skip failed plugin, continue with others
        }
        
        // Create plugin context
        const context = this.createPluginContext(plugin.id);
        
        // Register plugin routes
        pluginModule.register(context);
        
        // Mount under namespaced route
        this.app.use(`/api/plugins/${plugin.id}`, 
          this.requirePluginEnabled(plugin.id),
          context.router
        );
        
        console.log(`Loaded plugin: ${plugin.id}@${plugin.version}`);
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.id}:`, error);
      }
    }
  }
  
  private async getEnabledPlugins() {
    // Query sys_plugins for globally enabled plugins only
    // Per-tenant enablement is handled by middleware at request time
    return await this.db.select()
      .from(sysPlugins)
      .where(eq(sysPlugins.enabledGlobal, true));
  }
  
  private isApiCompatible(pluginApiVersion: string): boolean {
    // Enforce semver: plugin API must satisfy host range (e.g., "^1.0.0")
    return semver.satisfies(pluginApiVersion, this.hostApiVersionRange);
  }
  
  private async updateGlobalPluginStatus(
    pluginId: string, 
    status: 'active' | 'failed' | 'disabled',
    error?: string
  ) {
    await this.db.update(sysPlugins)
      .set({ 
        status,
        lastError: error || null,
        updatedAt: new Date()
      })
      .where(eq(sysPlugins.pluginId, pluginId));
  }
  
  // Separate per-tenant status tracking (called from middleware)
  async updateTenantPluginStatus(
    pluginId: string, 
    tenantId: string, 
    status: 'ready' | 'installing' | 'failed' | 'disabled',
    error?: string
  ) {
    await this.db.update(sysTenantPlugins)
      .set({ 
        status,
        lastHealthAt: new Date(),
        notes: error || null
      })
      .where(
        and(
          eq(sysTenantPlugins.pluginId, pluginId),
          eq(sysTenantPlugins.tenantId, tenantId)
        )
      );
  }
}
```

### 4. Production Safety Features (Phase 1 Requirements)

Based on architect feedback, these safety features must be implemented before Phase 1:

#### API Compatibility Contract (Fail Fast)

```typescript
// Enhanced compatibility checking with semver enforcement
private isApiCompatible(pluginApiVersion: string): boolean {
  // Enforce semver: plugin API must satisfy host range (e.g., 1.x)
  return semver.satisfies(pluginApiVersion, this.hostApiVersionRange);
}

// Status tracking for admin visibility
private async updatePluginStatus(
  pluginId: string, 
  tenantId: string, 
  status: 'ready' | 'installing' | 'failed' | 'disabled',
  error?: string
) {
  await this.db.update(sysTenantPlugins)
    .set({ 
      status,
      lastHealthAt: new Date(),
      notes: error || null
    })
    .where(
      and(
        eq(sysTenantPlugins.pluginId, pluginId),
        eq(sysTenantPlugins.tenantId, tenantId)
      )
    );
}
```

#### Migration Safety with Advisory Locks

```typescript
// tools/migration-runner/safe-migration.ts
export class SafeMigrationRunner {
  private validatePluginId(pluginId: string): void {
    if (!/^[a-z0-9_-]+$/.test(pluginId)) {
      throw new Error(`Invalid plugin ID: ${pluginId}`);
    }
  }
  
  private validateTenantId(tenantId: string): void {
    // Standardized validation - only alphanumeric and underscores (no hyphens)
    if (!/^[a-z0-9_]+$/.test(tenantId)) {
      throw new Error(`Invalid tenant ID: ${tenantId}`);
    }
  }
  
  private getSchemaName(tenantId: string): string {
    this.validateTenantId(tenantId);
    return `tenant_${tenantId}`;
  }

  async runMigration(
    pluginId: string,
    tenantId: string,
    migration: Migration
  ): Promise<MigrationResult> {
    this.validatePluginId(pluginId);
    this.validateTenantId(tenantId);
    
    const schemaName = this.getSchemaName(tenantId);
    
    // Acquire single dedicated client for entire migration scope
    const client = await this.dbPool.connect();
    
    try {
      // Use two-key advisory lock to reduce collision risk
      const pluginHash = this.hashString(pluginId);
      const tenantHash = this.hashString(tenantId);
      
      const lockResult = await client.query(`
        SELECT pg_try_advisory_lock($1::int4, $2::int4) as acquired
      `, [pluginHash, tenantHash]);
      
      if (!lockResult.rows[0].acquired) {
        throw new Error(`Migration already running for ${pluginId}/${tenantId}`);
      }
      
      try {
        const startTime = Date.now();
        
        // Parse migration statements with metadata markers
        const { concurrentOps, transactionalOps } = this.parseMigrationStatements(migration.sql);
        
        // Execute CONCURRENTLY operations (autocommit mode)
        for (const op of concurrentOps) {
          await client.query('SET lock_timeout = $1', ['30s']);
          await client.query('SET statement_timeout = $1', ['10min']); // Longer for CONCURRENTLY  
          await client.query(`SET search_path = ${format('%I', schemaName)}, public`);
          await client.query(op);
          
          // Critical: Reset GUCs after each autocommit operation to prevent cross-tenant leakage
          await client.query('RESET search_path');
          await client.query('RESET lock_timeout'); 
          await client.query('RESET statement_timeout');
        }
        
        // Execute remaining operations in transaction
        if (transactionalOps.length > 0) {
          await client.query('BEGIN');
          
          try {
            await client.query('SET LOCAL lock_timeout = $1', ['30s']);
            await client.query('SET LOCAL statement_timeout = $1', ['5min']);
            await client.query(`SET LOCAL search_path = ${format('%I', schemaName)}, public`);
            
            for (const op of transactionalOps) {
              await client.query(op);
            }
            
            await client.query('COMMIT');
          } catch (txError) {
            await client.query('ROLLBACK');
            throw txError;
          }
        }
        
        const executionTime = Date.now() - startTime;
        
        // Record successful migration (using same client)
        await this.recordMigrationSuccess(client, pluginId, tenantId, migration, executionTime);
        
        return { success: true, executionTime };
        
      } catch (error) {
        // Track errors for admin visibility (using same client)
        await this.recordMigrationFailure(client, pluginId, tenantId, migration, error);
        throw error;
        
      } finally {
        // Always release advisory lock on same session
        await client.query('SELECT pg_advisory_unlock($1::int4, $2::int4)', [pluginHash, tenantHash]);
      }
      
    } finally {
      // Critical: Fully sanitize session before returning to pool
      try {
        await client.query('DISCARD ALL'); // Reset all session state
      } catch (discardError) {
        // Log but don't fail - fallback to manual reset
        console.warn('DISCARD ALL failed, using manual reset', discardError);
        await client.query('RESET ALL');
      }
      
      // Release client back to pool
      client.release();
    }
  }
  
  private hashString(input: string): number {
    // Simple hash function for advisory lock keys (signed int32)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash | 0; // Force to signed 32-bit integer
    }
    return hash;
  }
  
  private parseMigrationStatements(sql: string): { concurrentOps: string[], transactionalOps: string[] } {
    const concurrentOps: string[] = [];
    const transactionalOps: string[] = [];
    
    // Split statements more carefully, respecting SQL block comments and dollar-quoting
    const statements = this.splitSqlStatements(sql);
    
    for (const stmt of statements) {
      // Check for explicit metadata marker or CONCURRENTLY keyword
      if (stmt.includes('--@concurrent') || stmt.match(/CREATE\s+INDEX\s+CONCURRENTLY/i)) {
        // Remove metadata marker if present
        const cleanStmt = stmt.replace(/--@concurrent\s*/g, '').trim();
        concurrentOps.push(cleanStmt);
      } else {
        transactionalOps.push(stmt);
      }
    }
    
    return { concurrentOps, transactionalOps };
  }
  
  private splitSqlStatements(sql: string): string[] {
    // Constrained SQL statement splitter for Phase 1
    // Requires explicit --@concurrent markers for complex operations
    const statements: string[] = [];
    let current = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inDollarQuote = '';
    let inLineComment = false;
    let inBlockComment = false;
    
    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      const nextChar = sql[i + 1];
      
      // Handle line comments
      if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && !inBlockComment) {
        if (char === '-' && nextChar === '-') {
          inLineComment = true;
          current += char;
          continue;
        }
      }
      
      if (inLineComment) {
        current += char;
        if (char === '\n') {
          inLineComment = false;
        }
        continue;
      }
      
      // Handle block comments  
      if (!inSingleQuote && !inDoubleQuote && !inDollarQuote) {
        if (char === '/' && nextChar === '*') {
          inBlockComment = true;
          current += char;
          continue;
        }
      }
      
      if (inBlockComment) {
        current += char;
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          i++; // Skip next char
          current += '/';
        }
        continue;
      }
      
      // Rest of parsing (dollar quotes, regular quotes, semicolons)
      if (inDollarQuote) {
        current += char;
        if (char === '$' && sql.substring(i).startsWith(inDollarQuote)) {
          // Fix: Save tag length before clearing inDollarQuote
          const tagLength = inDollarQuote.length;
          inDollarQuote = '';
          i += tagLength - 1; // Skip rest of closing tag
        }
      } else if (char === '$' && nextChar) {
        const match = sql.substring(i).match(/^\$(\w*)\$/);
        if (match) {
          inDollarQuote = match[0];
          current += match[0];
          i += match[0].length - 1;
        } else {
          current += char;
        }
      } else if (inSingleQuote) {
        current += char;
        if (char === "'" && nextChar === "'") {
          // PostgreSQL doubled quote escaping
          current += nextChar;
          i++;
        } else if (char === "'") {
          inSingleQuote = false;
        }
      } else if (inDoubleQuote) {
        current += char;
        if (char === '"' && nextChar === '"') {
          // PostgreSQL doubled quote escaping
          current += nextChar;
          i++;
        } else if (char === '"') {
          inDoubleQuote = false;
        }
      } else if (char === "'") {
        inSingleQuote = true;
        current += char;
      } else if (char === '"') {
        inDoubleQuote = true;
        current += char;
      } else if (char === ';') {
        if (current.trim()) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      statements.push(current.trim());
    }
    
    return statements;
  }
}
```

#### Strict Permission Prefixing

```typescript
// tools/plugin-validator/permission-validator.ts
export function validatePluginPermissions(plugin: PluginDefinition): ValidationResult {
  const errors: string[] = [];
  
  for (const permission of plugin.permissions) {
    // Enforce ${pluginId}.* prefixing (architect requirement)
    if (!permission.startsWith(`${plugin.id}.`)) {
      errors.push(`Permission '${permission}' must start with '${plugin.id}.'`);
    }
    
    // Validate permission format
    if (!/^[a-z0-9_-]+\.[a-z0-9_.]+$/.test(permission)) {
      errors.push(`Permission '${permission}' contains invalid characters`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// CI linting - enforce in pipeline
export async function lintAllPluginPermissions() {
  const pluginDirs = await glob('packages/plugins/*/src/server/index.ts');
  let hasErrors = false;
  
  for (const pluginFile of pluginDirs) {
    const pluginModule = await import(pluginFile); // ESM import
    const result = validatePluginPermissions(pluginModule.plugin);
    
    if (!result.valid) {
      console.error(`❌ ${pluginFile}:`);
      result.errors.forEach(error => console.error(`   ${error}`));
      hasErrors = true;
    }
  }
  
  if (hasErrors) process.exit(1);
  console.log('✅ All plugin permissions follow naming conventions');
}
```

#### Tenant Scoping Guardrails

```typescript
// packages/foundation/sdk/src/plugin-context.ts
import { format } from 'pg-format';

export class PluginContext {
  private validateTenantId(tenantId: string): void {
    // Strict tenant ID validation - only alphanumeric and underscores
    if (!/^[a-z0-9_]+$/.test(tenantId)) {
      throw new Error(`Invalid tenant ID: ${tenantId}`);
    }
  }
  
  private getSchemaName(tenantId: string): string {
    this.validateTenantId(tenantId);
    return `tenant_${tenantId}`;
  }

  // Tenant-scoped database access with search_path enforcement
  async withTenantTx<T>(
    tenantId: string, 
    callback: (db: TenantDB) => Promise<T>
  ): Promise<T> {
    return await this.dbPool.transaction(async (tx) => {
      // Validate and get canonical schema name
      const schemaName = this.getSchemaName(tenantId);
      
      // Set search_path with proper identifier quoting (fix SQL injection risk)
      await tx.query(`SET LOCAL search_path = ${format('%I', schemaName)}, public`);
      
      // Verify search_path was set correctly
      const pathResult = await tx.query('SHOW search_path');
      const currentPath = pathResult.rows[0].search_path.trim();
      
      // Check for correct schema name (quoted or unquoted)
      const expectedPattern = new RegExp(`^"?${schemaName}"?\\s*,\\s*public`);
      if (!expectedPattern.test(currentPath)) {
        throw new Error(`Failed to set tenant search_path: expected ${schemaName}, got ${currentPath}`);
      }
      
      return await callback(tx);
    });
  }
  
  // RBAC with strict plugin permission namespacing
  get rbac() {
    return {
      require: (permission: string) => (req: Request, res: Response, next: NextFunction) => {
        // Enforce permission must be namespaced to this plugin
        if (!permission.startsWith(`${this.pluginId}.`)) {
          throw new Error(`Permission ${permission} must be prefixed with ${this.pluginId}.`);
        }
        
        return this.baseRbac.require(permission)(req, res, next);
      }
    };
  }
}
```

### 5. Plugin Registry System

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
  
  -- Enhanced status tracking for operations visibility
  desired_version    text NOT NULL,
  current_version    text,
  status             text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready','installing','failed','disabled')),
  last_health_at     timestamptz DEFAULT now(),
  
  config             jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes              text, -- Error messages, upgrade logs
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, plugin_id),
  INDEX idx_tenant_plugins_status (tenant_id, status)
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
  
  -- Enhanced error tracking and safety (architect feedback)
  execution_time_ms  integer,
  last_error         text,                           -- Track failures for admin visibility
  retry_count        integer DEFAULT 0,
  
  UNIQUE (plugin_id, scope, tenant_id, name),
  INDEX idx_plugin_migrations_errors (last_error) WHERE last_error IS NOT NULL
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

## Development Tools & Commands

### 1. Daily Development Workflow

```bash
# Initial setup
pnpm install

# Plugin development (only rebuilds affected packages)
pnpm -F @nimbus-plugin/inventory dev     # Plugin watch build
pnpm -F @nimbus/host-api dev             # Host API with plugin hot reload
pnpm -F @nimbus/host-web dev             # Host web frontend

# Testing (targeted to changed code)
pnpm -F @nimbus-plugin/inventory test    # Plugin unit tests
pnpm -F @nimbus/host-api test            # Integration tests
pnpm -r test --filter ...affected       # Test only affected packages

# Adding migrations
# Create: packages/plugins/inventory/migrations/tenant/20250918_001_add_column.sql
pnpm -F @nimbus-plugin/inventory test    # Verify migration syntax
```

### 2. Release Management

```bash
# Propose plugin release
pnpm changeset                           # Interactive - pick packages and bump type
# Example: Select @nimbus-plugin/inventory, choose "minor"

# Check what will be released
pnpm changeset status

# Manual version bump (if needed)
pnpm changeset version

# Publish (usually done by CI)
pnpm -r publish --access restricted
```

### 3. Plugin Operations CLI (hostctl)

```bash
# Plugin status management
hostctl plugins list                     # Show all plugins and versions
hostctl plugins status inventory         # Status across all tenants

# Plugin upgrades
hostctl plugins upgrade inventory --to 1.6.0 --dry-run
hostctl plugins upgrade inventory --to 1.6.0 --batch 50
hostctl plugins upgrade inventory --tenant acme-corp --to 1.6.0

# Plugin rollback
hostctl plugins rollback inventory --to 1.5.3 --tenant acme-corp
hostctl plugins rollback inventory --to 1.5.3 --all-tenants --batch 25

# Migration management
hostctl migrations run inventory --scope tenant --dry-run
hostctl migrations run inventory --tenant acme-corp --from 003_add_indexes --since 2025-01-01
hostctl migrations run inventory --tenant acme-corp --since 2025-09-15  # Run all since date
hostctl migrations status inventory     # Show migration progress

# Plugin data management
hostctl plugins export inventory --tenant acme-corp --output ./backup.json
hostctl plugins cleanup inventory --version 1.4.0  # Remove old versions
```

### 4. Workspace Management

```bash
# Create new plugin
pnpm create-plugin inventory-plus --template crud

# Validate plugin structure
pnpm validate-plugin packages/plugins/inventory-plus

# Check dependencies and conflicts
pnpm dep-check @nimbus-plugin/inventory  # Show all dependents
pnpm conflict-check                      # Check for route/permission conflicts

# Build affected packages only
pnpm -r build --filter ...affected      # Turborepo affected graph
```

### 5. Configuration Files

#### pnpm-workspace.yaml
```yaml
packages:
  - "packages/**"
  - "apps/**"
  - "tools/**"
```

#### .changeset/config.json
```json
{
  "changelog": "@changesets/changelog-github",
  "commit": false,
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@nimbus/docs", "@nimbus/tooling"]
}
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

## Benefits of This Hybrid Architecture

### For Business Analysts (Development Experience)
- **Monorepo Simplicity**: Single repo, unified tooling, familiar development patterns
- **Instant Feedback**: Hot module replacement - edit plugin → only plugin rebuilds → host reloads
- **AI-Assisted Development**: Workspace structure optimized for AI code generation
- **No Deployment Complexity**: Focus on business logic, not packaging or versioning
- **Easy Debugging**: Cross-plugin visibility during development

### For Operations Teams (Production Control)  
- **Independent Plugin Lifecycles**: Upgrade inventory 1.5.3 → 1.6.0 without touching other plugins
- **Safe Tenant Rollouts**: Batch upgrades across hundreds of tenants with rollback capability
- **Granular Control**: Enable/disable plugins per tenant without code deployment
- **Operational Safety**: Advisory-locked migrations, checksum validation, resumable upgrades
- **Observability**: Per-plugin metrics, structured logs, health endpoints per version

### For Platform Architecture (Best of Both Worlds)
- **Development Velocity**: Monorepo benefits - unified CI, easy refactoring, shared tooling
- **Production Flexibility**: Plugin benefits - independent deployment, isolated failures
- **Selective Builds**: Only affected packages rebuild (via Turborepo/Nx affected graph)
- **Version Management**: Changesets automatically version only changed plugins
- **API Boundaries**: Foundation SDK prevents plugin-host coupling while maintaining workspace benefits

### Key Advantages vs. Pure Approaches

**vs. Traditional Monorepo:**
- ✅ No full repo rebuilds on plugin changes
- ✅ Independent plugin release cycles
- ✅ Tenant-by-tenant plugin upgrades
- ✅ Plugin-specific rollback capability

**vs. Pure Plugin Architecture:**
- ✅ Simple development workflow for business analysts  
- ✅ Unified tooling and dependency management
- ✅ Easy cross-plugin refactoring when needed
- ✅ No complex packaging or distribution setup

**vs. Microservices:**
- ✅ Shared database transactions across plugins
- ✅ No network latency between plugins
- ✅ Simpler debugging and tracing
- ✅ Lower operational overhead

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