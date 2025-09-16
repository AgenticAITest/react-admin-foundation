import { db } from '../db';
import { tenant } from '../db/schema/system';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { tenantDbManager } from '../db/tenant-db';
import { routeRegistry } from './route-registry';

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
      
      // HONEST PLACEHOLDER: Module table creation not yet implemented
      // The previous logs were misleading - no tables are actually created yet
      if (config.database.tables.length > 0) {
        console.log(`📋 Module '${config.id}' requires ${config.database.tables.length} tables: ${config.database.tables.join(', ')}`);
        console.log(`⚠️ Note: Module table creation not yet implemented - tables will be available when schema management is complete`);
      }
      
      // Only log success for what we actually accomplished (schema validation/creation)
      console.log(`📦 Module '${config.id}' prepared for tenant ${tenantId} (schema validated)`);
    } catch (error) {
      console.error(`❌ Failed to prepare module ${config.id} for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  getActiveModules(): ModuleConfig[] {
    return Array.from(this.modules.values());
  }

  getModule(id: string): ModuleConfig | undefined {
    return this.modules.get(id);
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