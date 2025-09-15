import { db } from '../db';
import { tenant } from '../db/schema/system';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import { tenantDbManager } from '../db/tenant-db';
import { PermissionCollector } from '../constants/permissions';

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
      // Check if modules directory exists
      const modulesDirs = await fs.readdir('src/modules').catch(() => []);
      
      for (const moduleDir of modulesDirs) {
        const configPath = `src/modules/${moduleDir}/module.config.ts`;
        if (await fs.access(configPath).then(() => true).catch(() => false)) {
          try {
            const { default: config } = await import(configPath);
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

  async registerModule(config: ModuleConfig) {
    // Validate module configuration
    await this.validateModule(config);
    
    // Check dependencies
    await this.validateDependencies(config);
    
    // Register module permissions
    await this.registerPermissions(config);
    
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
    const prefix = config.apiRoutes.prefix;
    
    for (const [moduleId, existingModule] of this.modules) {
      if (existingModule.apiRoutes.prefix === prefix) {
        throw new Error(`Route prefix ${prefix} conflicts with existing module: ${moduleId}`);
      }
    }
  }

  async registerPermissions(config: ModuleConfig): Promise<void> {
    if (config.permissions && config.permissions.length > 0) {
      PermissionCollector.addModulePermissions(config.permissions);
      console.log(`✅ Registered ${config.permissions.length} permissions for module ${config.id}`);
    }
  }

  async registerRoutes(config: ModuleConfig): Promise<void> {
    // Route registration will be implemented when integrating with Express
    console.log(`Registering routes for module ${config.id} with prefix ${config.apiRoutes.prefix}`);
  }

  async deployModuleToTenant(config: ModuleConfig, tenantId: string): Promise<void> {
    try {
      // Get tenant database connection
      const tenantDb = await tenantDbManager.getTenantDb(tenantId);
      
      // Create module tables in tenant schema (stub implementation)
      for (const tableName of config.database.tables) {
        console.log(`Creating table ${tableName} for module ${config.id} in tenant ${tenantId}`);
        // Table creation logic will be implemented in later phases
      }
      
      console.log(`✅ Deployed module ${config.id} to tenant ${tenantId}`);
    } catch (error) {
      console.error(`❌ Failed to deploy module ${config.id} to tenant ${tenantId}:`, error);
      throw error;
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