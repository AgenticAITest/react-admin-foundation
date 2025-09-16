import { ModuleRegistry, ModuleConfig } from './module-registry';
import { RouteRegistry } from './route-registry';
import { tenantDbManager } from '../db/tenant-db';
import fs from 'fs/promises';
import path from 'path';

export interface ModulePackage {
  id: string;
  config: ModuleConfig;
  files: Record<string, string>; // filepath -> content
  exportedAt: Date;
  version: string;
}

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
      const existingModule = this.moduleRegistry.getModule(moduleId);
      if (existingModule) {
        await this.moduleRegistry.unregisterModule(moduleId);
      }
      
      // 3. Clear require cache for module files
      this.clearModuleCache(moduleId);
      
      // 4. Re-discover and register the module
      await this.moduleRegistry.discoverModule(moduleId);
      
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

  /**
   * Get status of all modules
   */
  getModuleStatus(): Array<{
    id: string;
    name: string;
    version: string;
    mounted: boolean;
    routePrefix: string;
  }> {
    const allModules = this.moduleRegistry.getActiveModules();
    const routeStatus = this.moduleRegistry.getRouteMountingStatus();
    
    return allModules.map(module => {
      const status = routeStatus.find(s => s.moduleId === module.id);
      return {
        id: module.id,
        name: module.name,
        version: module.version,
        mounted: status?.mounted || false,
        routePrefix: module.apiRoutes.prefix
      };
    });
  }

  /**
   * Clear Node.js require cache for module files
   */
  private clearModuleCache(moduleId: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? 'dist/src/modules' : 'src/modules';
    const moduleBasePath = path.resolve(baseDir, moduleId);
    
    // Clear all cached files for this module
    Object.keys(require.cache).forEach(cacheKey => {
      if (cacheKey.startsWith(moduleBasePath)) {
        delete require.cache[cacheKey];
        console.log(`🗑️ Cleared cache for: ${cacheKey}`);
      }
    });
  }

  /**
   * Validate module package structure and configuration
   */
  private async validateModulePackage(modulePackage: ModulePackage): Promise<void> {
    // Validate package structure
    if (!modulePackage.id || !modulePackage.config || !modulePackage.files) {
      throw new Error('Invalid module package structure');
    }

    // Check for conflicts with existing modules (allow overwrite)
    const existingModule = this.moduleRegistry.getModule(modulePackage.id);
    if (existingModule) {
      console.log(`ℹ️ Module ${modulePackage.id} already exists, will be replaced`);
    }

    // Validate module configuration using existing validation
    // We need to temporarily skip the duplicate ID check for hotswap
    const originalConfig = modulePackage.config;
    await this.moduleRegistry.validateModule(originalConfig);
  }

  /**
   * Extract module files from package to filesystem
   */
  private async extractModuleFiles(modulePackage: ModulePackage): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? 'dist/src/modules' : 'src/modules';
    const moduleDir = path.join(baseDir, modulePackage.id);
    
    // Create module directory structure
    await fs.mkdir(moduleDir, { recursive: true });
    
    // Write all module files
    for (const [filePath, content] of Object.entries(modulePackage.files)) {
      const fullPath = path.join(moduleDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      console.log(`📝 Extracted: ${fullPath}`);
    }
  }

  /**
   * Collect all files from a module directory
   */
  private async collectModuleFiles(moduleId: string): Promise<Record<string, string>> {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? 'dist/src/modules' : 'src/modules';
    const moduleDir = path.join(baseDir, moduleId);
    const files: Record<string, string> = {};
    
    const collectFilesRecursively = async (dir: string, basePath: string = '') => {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const itemPath = path.join(dir, item.name);
          const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
          
          if (item.isDirectory()) {
            await collectFilesRecursively(itemPath, relativePath);
          } else {
            const content = await fs.readFile(itemPath, 'utf8');
            files[relativePath] = content;
            console.log(`📁 Collected: ${relativePath}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not read directory ${dir}:`, error);
      }
    };
    
    if (await fs.access(moduleDir).then(() => true).catch(() => false)) {
      await collectFilesRecursively(moduleDir);
    } else {
      throw new Error(`Module directory not found: ${moduleDir}`);
    }
    
    return files;
  }
}

export const moduleHotswapManager = ModuleHotswapManager.getInstance();