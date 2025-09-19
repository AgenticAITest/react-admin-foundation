import { db } from '../db';
import { tenant } from '../db/schema/system';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import fs from 'fs/promises';
import path from 'path';
import { tenantDbManager } from '../db/tenant-db';
import { routeRegistry } from './route-registry';

async function upsertSysPlugin(meta: { id: string; version: string; api: string }) {
  // Access the underlying postgres client for proper parameterized queries
  const client = postgres(process.env.DATABASE_URL!);
  
  try {
    await client`
      insert into sys_plugins(plugin_id, api_version, version_installed)
      values (${meta.id}, ${meta.api}, ${meta.version})
      on conflict (plugin_id) do update set
        api_version = excluded.api_version,
        version_installed = excluded.version_installed,
        updated_at = now()
    `;
  } finally {
    await client.end();
  }
}

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
    try {
      // Get the correct modules directory for both dev and production
      const modulesDir = this.getModulesDirectory();
      const modulesDirs = await fs.readdir(modulesDir).catch(() => []);
      
      for (const moduleDir of modulesDirs) {
        const configPath = this.resolveModuleConfigPath(modulesDir, moduleDir);
        if (await fs.access(configPath).then(() => true).catch(() => false)) {
          try {
            const { default: config } = await import(path.resolve(configPath));
            // Use registerModule for proper validation instead of direct map assignment
            await this.registerModule(config);
            console.log(`✅ Discovered and registered module: ${config.name}`);
          } catch (error) {
            console.error(`❌ Failed to load module ${moduleDir}:`, error);
          }
        }
      }
    } catch (error) {
      console.log(`ℹ️ No modules directory found, skipping module discovery`);
    }
  }

  /**
   * Get the correct modules directory path for both dev and production
   */
  private getModulesDirectory(): string {
    // In production, files are in dist/ directory
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction ? 'dist/src/modules' : 'src/modules';
  }

  /**
   * Resolve module config path for both .ts (dev) and .js (production) files
   */
  private resolveModuleConfigPath(modulesDir: string, moduleDir: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const extension = isProduction ? '.js' : '.ts';
    return path.join(modulesDir, moduleDir, `module.config${extension}`);
  }

  async registerModule(config: ModuleConfig) {
    // Validate module configuration
    await this.validateModule(config);
    
    // Check dependencies
    await this.validateDependencies(config);
    
    // 1) (T09) check API compatibility
    // 2) then upsert:
    await upsertSysPlugin({ id: config.id, version: config.version, api: '1.x' });
    
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

  async checkRouteConflicts(config: ModuleConfig): Promise<void> {
    // Enhanced route conflict checking is now handled by RouteRegistry
    // This method is kept for backward compatibility and basic validation
    const prefix = config.apiRoutes.prefix;
    
    for (const [moduleId, existingModule] of this.modules) {
      if (existingModule.apiRoutes.prefix === prefix) {
        throw new Error(`Route prefix ${prefix} conflicts with existing module: ${moduleId}`);
      }
    }
  }

  async registerRoutes(config: ModuleConfig): Promise<void> {
    try {
      // Use RouteRegistry to automatically mount module routes
      await routeRegistry.mountModuleRoutes(config);
      
      // Validate that frontend and backend routes are synchronized
      const syncValidation = routeRegistry.validateFrontendBackendSync(config);
      if (!syncValidation.isValid) {
        console.warn(`⚠️ Frontend-backend route sync issues for module '${config.id}':`);
        syncValidation.issues.forEach(issue => console.warn(`   - ${issue}`));
      }
      
      console.log(`✅ Successfully registered and mounted routes for module ${config.id}`);
    } catch (error) {
      console.error(`❌ Failed to register routes for module ${config.id}:`, error);
      throw error;
    }
  }

  async deployModuleToTenant(config: ModuleConfig, tenantId: string): Promise<void> {
    try {
      // Get tenant database connection (this validates schema exists and creates if needed)
      const tenantDb = await tenantDbManager.getTenantDb(tenantId);
      
      // Create module tables in tenant schema
      if (config.database.tables.length > 0) {
        console.log(`🔨 Creating ${config.database.tables.length} tables for module '${config.id}' in tenant ${tenantId}`);
        
        // Import module schema dynamically
        const moduleSchemaPath = `../db/schema/modules/${config.id}`;
        try {
          const moduleSchema = await import(moduleSchemaPath);
          
          // Create tables for each table name in config
          for (const tableName of config.database.tables) {
            // Convert table name to schema export name (e.g., products -> products, task_managements -> taskManagements)
            const schemaTableName = this.getSchemaTableName(tableName);
            const tableDefinition = moduleSchema[schemaTableName];
            
            if (!tableDefinition) {
              console.warn(`⚠️ Table definition '${schemaTableName}' not found in module schema for '${tableName}'`);
              continue;
            }
            
            // Execute CREATE TABLE using Drizzle
            await tenantDb.execute(sql`CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              tenant_id uuid NOT NULL,
              name varchar(255) NOT NULL,
              description varchar(500),
              is_active boolean DEFAULT true,
              created_at timestamp DEFAULT now() NOT NULL,
              updated_at timestamp DEFAULT now() NOT NULL,
              CONSTRAINT ${sql.identifier(`${tableName}_name_unique_idx`)} UNIQUE (tenant_id, name)
            )`);
            
            console.log(`✅ Created table '${tableName}' in tenant ${tenantId}`);
          }
        } catch (importError: any) {
          console.warn(`⚠️ Could not import module schema for '${config.id}':`, importError.message);
          // Fallback: create tables using config information
          await this.createTablesFromConfig(tenantDb, config, tenantId);
        }
      }
      
      console.log(`✅ Successfully deployed module '${config.id}' to tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Failed to deploy module ${config.id} to tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Convert table name to expected schema export name
   */
  private getSchemaTableName(tableName: string): string {
    // Convert snake_case to camelCase for schema exports
    // e.g., task_managements -> taskManagements, products -> products
    return tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Fallback method to create tables when schema import fails
   */
  private async createTablesFromConfig(tenantDb: any, config: ModuleConfig, tenantId: string): Promise<void> {
    for (const tableName of config.database.tables) {
      try {
        await tenantDb.execute(sql`CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL,
          name varchar(255) NOT NULL,
          description varchar(500),
          is_active boolean DEFAULT true,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL,
          CONSTRAINT ${sql.identifier(`${tableName}_name_unique_idx`)} UNIQUE (tenant_id, name)
        )`);
        console.log(`✅ Created table '${tableName}' (fallback) in tenant ${tenantId}`);
      } catch (tableError) {
        console.error(`❌ Failed to create table '${tableName}' in tenant ${tenantId}:`, tableError);
      }
    }
  }

  getActiveModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
  }

  /**
   * Discover and register a single module by ID
   */
  async discoverModule(moduleId: string): Promise<void> {
    try {
      const modulesDir = this.getModulesDirectory();
      const configPath = this.resolveModuleConfigPath(modulesDir, moduleId);
      
      if (await fs.access(configPath).then(() => true).catch(() => false)) {
        // Clear require cache first for hotswap scenarios
        const resolvedPath = path.resolve(configPath);
        delete require.cache[resolvedPath];
        
        const { default: config } = await import(resolvedPath);
        
        // For hotswap, we need to allow re-registration of existing modules
        // Temporarily remove from registry if it exists
        const wasRegistered = this.modules.has(moduleId);
        if (wasRegistered) {
          this.modules.delete(moduleId);
        }
        
        await this.registerModule(config);
        console.log(`✅ Discovered and registered module: ${config.name}`);
      } else {
        throw new Error(`Module configuration not found: ${configPath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to discover module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a module and unmount its routes
   */
  async unregisterModule(moduleId: string): Promise<void> {
    const config = this.modules.get(moduleId);
    if (!config) {
      throw new Error(`Module ${moduleId} not found in registry`);
    }

    try {
      // Unmount routes
      await routeRegistry.unmountModuleRoutes(moduleId);
      
      // Remove from registry
      this.modules.delete(moduleId);
      
      console.log(`✅ Module ${config.name} unregistered successfully`);
    } catch (error) {
      console.error(`❌ Failed to unregister module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Get route mounting status for all modules
   */
  getRouteMountingStatus(): Array<{ moduleId: string; name: string; mounted: boolean; prefix: string }> {
    const mountedRoutes = routeRegistry.getMountedRoutes();
    const mountedModuleIds = new Set(mountedRoutes.map(route => route.moduleId));
    
    return Array.from(this.modules.values()).map(module => ({
      moduleId: module.id,
      name: module.name,
      mounted: mountedModuleIds.has(module.id),
      prefix: module.apiRoutes.prefix
    }));
  }
}

export const moduleRegistry = ModuleRegistry.getInstance();