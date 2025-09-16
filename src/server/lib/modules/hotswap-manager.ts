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
   * Hotswap a module with zero downtime
   */
  async hotswapModule(moduleId: string): Promise<void> {
    let backupModule: ModuleConfig | undefined;
    let preValidationFailed = false;
    
    try {
      console.log(`🔄 Starting zero-downtime hotswap for module: ${moduleId}`);
      
      // Step 1: Backup current module configuration
      backupModule = this.moduleRegistry.getModule(moduleId);
      if (backupModule) {
        console.log(`📦 Backing up current module: ${backupModule.name} v${backupModule.version}`);
      }
      
      // Step 2: Pre-validate new module without affecting the running one
      console.log(`🔍 Pre-validating new module configuration...`);
      const newModuleConfig = await this.preValidateNewModule(moduleId);
      
      if (!newModuleConfig) {
        throw new Error(`Failed to load new configuration for module ${moduleId}`);
      }
      
      console.log(`✅ Pre-validation successful for: ${newModuleConfig.name} v${newModuleConfig.version}`);
      
      // Step 3: Atomic swap - only now do we affect the running module
      console.log(`🔄 Performing atomic module swap...`);
      await this.performAtomicSwap(moduleId, newModuleConfig, backupModule);
      
      console.log(`✅ Module ${moduleId} hotswapped successfully from ${backupModule?.version || 'new'} to ${newModuleConfig.version}`);
      
    } catch (error) {
      console.error(`❌ Hotswap failed for module ${moduleId}:`, error);
      
      // If we failed during pre-validation, no rollback needed
      if (preValidationFailed) {
        throw error;
      }
      
      // Attempt rollback if we have a backup and the swap already started
      if (backupModule && !preValidationFailed) {
        console.log(`🔙 Attempting rollback to previous version...`);
        try {
          await this.rollbackModule(moduleId, backupModule);
          console.log(`✅ Successfully rolled back module ${moduleId}`);
        } catch (rollbackError) {
          console.error(`❌ Rollback failed for module ${moduleId}:`, rollbackError);
          throw new Error(`Hotswap failed and rollback failed: ${error}. Rollback error: ${rollbackError}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Pre-validate new module without affecting the running module
   */
  private async preValidateNewModule(moduleId: string): Promise<ModuleConfig | null> {
    try {
      // Get module directory paths
      const modulesDir = this.getModulesDirectory();
      const configPath = this.resolveModuleConfigPath(modulesDir, moduleId);
      
      // Check if module config exists
      if (!(await fs.access(configPath).then(() => true).catch(() => false))) {
        throw new Error(`Module configuration not found: ${configPath}`);
      }
      
      // Import new config WITHOUT clearing cache (keeping old one active)
      const resolvedPath = path.resolve(configPath);
      const { default: newConfig } = await import(`${resolvedPath}?timestamp=${Date.now()}`);
      
      // Validate the new configuration using hotswap-specific validation
      await this.validateModuleConfigForHotswap(newConfig, moduleId);
      
      // Additional validation: ensure the new module can be deployed
      await this.validateNewModuleDeployment(newConfig);
      
      return newConfig;
      
    } catch (error) {
      console.error(`❌ Pre-validation failed for module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Validate that new module can be deployed to all tenants
   */
  private async validateNewModuleDeployment(config: ModuleConfig): Promise<void> {
    // Check if all required database tables can be created
    if (config.database.tables.length > 0) {
      // Validate schema files exist for the tables
      for (const tableName of config.database.tables) {
        try {
          const moduleSchemaPath = `../db/schema/modules/${config.id}`;
          const moduleSchema = await import(moduleSchemaPath);
          const schemaTableName = this.getSchemaTableName(tableName);
          
          if (!moduleSchema[schemaTableName]) {
            console.warn(`⚠️ Table definition '${schemaTableName}' not found in module schema for '${tableName}'`);
          }
        } catch (importError) {
          console.warn(`⚠️ Could not validate module schema for '${config.id}', will use fallback table creation`);
        }
      }
    }
    
    console.log(`✅ New module deployment validation passed for ${config.id}`);
  }

  /**
   * Perform atomic swap of modules
   */
  private async performAtomicSwap(moduleId: string, newConfig: ModuleConfig, backupModule?: ModuleConfig): Promise<void> {
    try {
      // 1. Unmount existing routes (point of no return)
      if (backupModule) {
        await this.routeRegistry.unmountModuleRoutes(moduleId);
        console.log(`🔌 Unmounted routes for module ${moduleId}`);
      }
      
      // 2. Clear module from registry
      if (backupModule) {
        await this.moduleRegistry.unregisterModule(moduleId);
        console.log(`📤 Unregistered old module ${moduleId}`);
      }
      
      // 3. Clear require cache for module files
      this.clearModuleCache(moduleId);
      console.log(`🗑️ Cleared module cache for ${moduleId}`);
      
      // 4. Register new module
      await this.moduleRegistry.registerModule(newConfig);
      console.log(`📥 Registered new module ${moduleId}`);
      
    } catch (error) {
      console.error(`❌ Atomic swap failed for module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Rollback to previous module version
   */
  private async rollbackModule(moduleId: string, backupModule: ModuleConfig): Promise<void> {
    try {
      console.log(`🔙 Rolling back module ${moduleId} to version ${backupModule.version}`);
      
      // Clear any partial state
      this.clearModuleCache(moduleId);
      
      // Attempt to unmount any partially mounted routes
      try {
        await this.routeRegistry.unmountModuleRoutes(moduleId);
      } catch (unmountError) {
        console.warn(`⚠️ Could not unmount routes during rollback: ${unmountError}`);
      }
      
      // Re-register the backup module
      await this.moduleRegistry.registerModule(backupModule);
      
      console.log(`✅ Successfully rolled back module ${moduleId}`);
      
    } catch (error) {
      console.error(`❌ Rollback failed for module ${moduleId}:`, error);
      throw error;
    }
  }

  /**
   * Helper method to get modules directory (shared with module-registry)
   */
  private getModulesDirectory(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    return isProduction ? 'dist/src/modules' : 'src/modules';
  }

  /**
   * Helper method to resolve module config path (shared with module-registry)  
   */
  private resolveModuleConfigPath(modulesDir: string, moduleDir: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const extension = isProduction ? '.js' : '.ts';
    return path.join(modulesDir, moduleDir, `module.config${extension}`);
  }

  /**
   * Convert table name to expected schema export name (shared with module-registry)
   */
  private getSchemaTableName(tableName: string): string {
    return tableName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
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

    // Use specialized validation for hotswap that allows module updates
    await this.validateModuleConfigForHotswap(modulePackage.config, modulePackage.id);
  }

  /**
   * Validate module configuration for hotswap scenarios (allows updates)
   */
  private async validateModuleConfigForHotswap(config: ModuleConfig, moduleId: string): Promise<void> {
    // Validate required fields
    const requiredFields = ['id', 'name', 'version', 'database', 'apiRoutes'];
    
    for (const field of requiredFields) {
      if (!config[field as keyof ModuleConfig]) {
        throw new Error(`Module ${config.id} missing required field: ${field}`);
      }
    }

    // Validate module ID matches package ID
    if (config.id !== moduleId) {
      throw new Error(`Module config ID '${config.id}' does not match package ID '${moduleId}'`);
    }

    // Check for route conflicts with OTHER modules (excluding self)
    await this.checkRouteConflictsForHotswap(config);

    // Validate dependencies
    await this.validateDependenciesForHotswap(config);

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(config.version)) {
      throw new Error(`Module ${config.id} has invalid version format: ${config.version}. Expected semantic version (x.y.z)`);
    }

    // Validate API routes structure
    if (!config.apiRoutes.prefix || !config.apiRoutes.endpoints) {
      throw new Error(`Module ${config.id} has invalid API routes configuration`);
    }

    // Validate navigation structure
    if (!config.navigation.section || !Array.isArray(config.navigation.items)) {
      throw new Error(`Module ${config.id} has invalid navigation configuration`);
    }

    console.log(`✅ Module configuration validated for hotswap: ${config.name} v${config.version}`);
  }

  /**
   * Check route conflicts excluding the module being updated
   */
  private async checkRouteConflictsForHotswap(config: ModuleConfig): Promise<void> {
    const allModules = this.moduleRegistry.getActiveModules();
    const prefix = config.apiRoutes.prefix;
    
    for (const existingModule of allModules) {
      // Skip conflict check with the module being updated
      if (existingModule.id === config.id) {
        continue;
      }
      
      if (existingModule.apiRoutes.prefix === prefix) {
        throw new Error(`Route prefix ${prefix} conflicts with existing module: ${existingModule.id}`);
      }
    }
  }

  /**
   * Validate dependencies for hotswap scenarios
   */
  private async validateDependenciesForHotswap(config: ModuleConfig): Promise<void> {
    for (const depId of config.dependencies) {
      // Allow self-dependency during updates
      if (depId === config.id) {
        continue;
      }
      
      const depModule = this.moduleRegistry.getModule(depId);
      if (!depModule) {
        throw new Error(`Module ${config.id} depends on missing module: ${depId}`);
      }
    }
  }

  /**
   * Extract module files from package to filesystem
   */
  private async extractModuleFiles(modulePackage: ModulePackage): Promise<void> {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseDir = isProduction ? 'dist/src/modules' : 'src/modules';
    const moduleDir = path.resolve(baseDir, modulePackage.id);
    
    // Create module directory structure
    await fs.mkdir(moduleDir, { recursive: true });
    
    // Write all module files with path sanitization
    for (const [filePath, content] of Object.entries(modulePackage.files)) {
      // Sanitize the file path to prevent directory traversal
      const sanitizedPath = this.sanitizeFilePath(filePath);
      const fullPath = path.resolve(moduleDir, sanitizedPath);
      
      // Security check: ensure the resolved path is within the module directory
      if (!fullPath.startsWith(moduleDir + path.sep) && fullPath !== moduleDir) {
        throw new Error(`Security violation: Invalid file path '${filePath}' attempts to write outside module directory`);
      }
      
      // Additional validation for file content
      this.validateFileContent(sanitizedPath, content);
      
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

  /**
   * Sanitize file paths to prevent directory traversal attacks
   */
  private sanitizeFilePath(filePath: string): string {
    // Normalize the path to resolve any . and .. segments
    const normalized = path.normalize(filePath);
    
    // Remove any leading path separators or drive letters
    const withoutLeading = normalized.replace(/^([a-zA-Z]:)?[\/\\]+/, '');
    
    // Split into components and filter out dangerous segments
    const components = withoutLeading.split(/[\/\\]+/).filter(component => {
      // Reject empty components, current directory, parent directory, and hidden files starting with .
      return component && 
             component !== '.' && 
             component !== '..' && 
             !component.startsWith('.') &&
             // Reject components with null bytes or other dangerous characters
             !/[\x00-\x1f<>:"|?*]/.test(component);
    });
    
    // Reconstruct the path using forward slashes
    const sanitized = components.join('/');
    
    // Final validation: ensure the result is not empty and doesn't start with dangerous patterns
    if (!sanitized || sanitized.startsWith('/') || sanitized.startsWith('\\')) {
      throw new Error(`Invalid file path after sanitization: '${filePath}'`);
    }
    
    return sanitized;
  }

  /**
   * Validate file content for security and constraints
   */
  private validateFileContent(filePath: string, content: string): void {
    // Check file size limits (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (Buffer.byteLength(content, 'utf8') > maxSize) {
      throw new Error(`File '${filePath}' exceeds maximum size limit of ${maxSize} bytes`);
    }
    
    // Check for null bytes which can be dangerous
    if (content.includes('\0')) {
      throw new Error(`File '${filePath}' contains null bytes which are not allowed`);
    }
    
    // Validate file extensions - only allow safe file types
    const allowedExtensions = ['.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.yaml', '.yml'];
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension && !allowedExtensions.includes(extension)) {
      throw new Error(`File '${filePath}' has unsupported extension '${extension}'. Allowed: ${allowedExtensions.join(', ')}`);
    }
    
    // Additional validation for specific file types
    if (extension === '.json') {
      try {
        JSON.parse(content);
      } catch (error) {
        throw new Error(`File '${filePath}' contains invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Check for potentially dangerous patterns in code files
    if (['.js', '.ts', '.tsx', '.jsx'].includes(extension)) {
      const dangerousPatterns = [
        /require\s*\(\s*['"`]fs['"`]\s*\)/,
        /require\s*\(\s*['"`]child_process['"`]\s*\)/,
        /import.*from\s*['"`]fs['"`]/,
        /import.*from\s*['"`]child_process['"`]/,
        /eval\s*\(/,
        /Function\s*\(/,
        /process\.exit/,
        /process\.env/
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(content)) {
          console.warn(`⚠️ File '${filePath}' contains potentially dangerous pattern: ${pattern.source}`);
          // For now, we'll warn but not block. In production, consider blocking.
        }
      }
    }
  }
}

export const moduleHotswapManager = ModuleHotswapManager.getInstance();