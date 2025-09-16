import { Express, Router } from 'express';
import { ModuleConfig } from './module-registry';
import fs from 'fs/promises';
import path from 'path';

export interface RouteInfo {
  moduleId: string;
  prefix: string;
  fullPath: string;
  methods: string[];
  permissions?: string[];
}

export interface MountedRoute {
  moduleId: string;
  prefix: string;
  router: Router;
  endpoints: RouteInfo[];
}

export class RouteRegistry {
  private mountedRoutes = new Map<string, MountedRoute>();
  private routeConflicts = new Map<string, string[]>(); // path -> moduleIds
  private static instance: RouteRegistry;
  private app: Express | null = null;

  static getInstance(): RouteRegistry {
    if (!RouteRegistry.instance) {
      RouteRegistry.instance = new RouteRegistry();
    }
    return RouteRegistry.instance;
  }

  /**
   * Initialize the route registry with the Express app
   */
  setExpressApp(app: Express): void {
    this.app = app;
    console.log('✅ RouteRegistry initialized with Express app');
  }

  /**
   * Mount module routes automatically
   */
  async mountModuleRoutes(config: ModuleConfig): Promise<void> {
    if (!this.app) {
      throw new Error('Express app not initialized. Call setExpressApp() first.');
    }

    const moduleId = config.id;
    const prefix = config.apiRoutes.prefix;

    // Check for route conflicts
    await this.validateRouteConflicts(config);

    // Load and mount the module router
    const router = await this.loadModuleRouter(moduleId);
    
    // Register the routes with Express
    this.app.use(prefix, router);

    // Track mounted routes
    const endpoints = this.extractEndpoints(config);
    const mountedRoute: MountedRoute = {
      moduleId,
      prefix,
      router,
      endpoints
    };
    
    this.mountedRoutes.set(moduleId, mountedRoute);
    this.trackRouteUsage(endpoints);

    console.log(`✅ Mounted routes for module '${moduleId}' at prefix '${prefix}'`);
    console.log(`   Endpoints: ${endpoints.map(e => `${e.methods.join(',')} ${e.fullPath}`).join(', ')}`);
  }

  /**
   * Unmount module routes
   */
  async unmountModuleRoutes(moduleId: string): Promise<void> {
    const mountedRoute = this.mountedRoutes.get(moduleId);
    if (!mountedRoute) {
      console.log(`⚠️ No routes mounted for module '${moduleId}'`);
      return;
    }

    // Remove route tracking
    this.untrackRouteUsage(mountedRoute.endpoints);
    this.mountedRoutes.delete(moduleId);

    console.log(`✅ Unmounted routes for module '${moduleId}'`);
    
    // Note: Express doesn't provide a clean way to remove routes dynamically
    // In production, this would require restarting the server or using a more advanced router
    console.log(`ℹ️ Server restart required to fully remove routes for module '${moduleId}'`);
  }

  /**
   * Load the router file for a module
   */
  private async loadModuleRouter(moduleId: string): Promise<Router> {
    const routerPaths = this.getModuleRouterPaths(moduleId);

    for (const routerPath of routerPaths) {
      try {
        if (await fs.access(routerPath).then(() => true).catch(() => false)) {
          const { default: router } = await import(path.resolve(routerPath));
          if (!router) {
            throw new Error(`No default export found in ${routerPath}`);
          }
          console.log(`✅ Loaded router from: ${routerPath}`);
          return router;
        }
      } catch (error) {
        console.error(`❌ Failed to load router from ${routerPath}:`, error);
      }
    }

    throw new Error(`No valid router file found for module '${moduleId}'. Expected files: ${routerPaths.join(', ')}`);
  }

  /**
   * Get possible router file paths for both dev (.ts) and production (.js)
   */
  private getModuleRouterPaths(moduleId: string): string[] {
    const isProduction = process.env.NODE_ENV === 'production';
    const extension = isProduction ? '.js' : '.ts';
    const baseDir = isProduction ? 'dist/src/modules' : 'src/modules';

    return [
      `${baseDir}/${moduleId}/server/routes/index${extension}`,
      `${baseDir}/${moduleId}/server/routes/${moduleId}${extension}`,
      `${baseDir}/${moduleId}/routes${extension}`
    ];
  }

  /**
   * Validate route conflicts before mounting
   */
  private async validateRouteConflicts(config: ModuleConfig): Promise<void> {
    const prefix = config.apiRoutes.prefix;
    const endpoints = this.extractEndpoints(config);

    // Check prefix conflicts
    for (const [existingModuleId, existingRoute] of this.mountedRoutes) {
      if (existingRoute.prefix === prefix) {
        throw new Error(`Route prefix '${prefix}' conflicts with existing module: ${existingModuleId}`);
      }
    }

    // Check individual endpoint conflicts
    const conflicts: string[] = [];
    for (const endpoint of endpoints) {
      const conflictingModules = this.routeConflicts.get(endpoint.fullPath) || [];
      if (conflictingModules.length > 0) {
        conflicts.push(`${endpoint.fullPath} conflicts with modules: ${conflictingModules.join(', ')}`);
      }
    }

    if (conflicts.length > 0) {
      throw new Error(`Route conflicts detected:\n${conflicts.join('\n')}`);
    }
  }

  /**
   * Extract endpoint information from module config
   */
  private extractEndpoints(config: ModuleConfig): RouteInfo[] {
    const prefix = config.apiRoutes.prefix;
    
    return config.apiRoutes.endpoints.map(endpoint => ({
      moduleId: config.id,
      prefix,
      fullPath: `${prefix}${endpoint.path}`,
      methods: endpoint.methods,
      permissions: endpoint.permissions
    }));
  }

  /**
   * Track route usage for conflict detection
   */
  private trackRouteUsage(endpoints: RouteInfo[]): void {
    for (const endpoint of endpoints) {
      const existing = this.routeConflicts.get(endpoint.fullPath) || [];
      existing.push(endpoint.moduleId);
      this.routeConflicts.set(endpoint.fullPath, existing);
    }
  }

  /**
   * Remove route tracking
   */
  private untrackRouteUsage(endpoints: RouteInfo[]): void {
    for (const endpoint of endpoints) {
      const existing = this.routeConflicts.get(endpoint.fullPath) || [];
      const updated = existing.filter(id => id !== endpoint.moduleId);
      
      if (updated.length === 0) {
        this.routeConflicts.delete(endpoint.fullPath);
      } else {
        this.routeConflicts.set(endpoint.fullPath, updated);
      }
    }
  }

  /**
   * Get all mounted routes for inspection
   */
  getMountedRoutes(): MountedRoute[] {
    return Array.from(this.mountedRoutes.values());
  }

  /**
   * Get route conflicts
   */
  getRouteConflicts(): Map<string, string[]> {
    return new Map(this.routeConflicts);
  }

  /**
   * Check if a specific route path is available
   */
  isRouteAvailable(path: string): boolean {
    return !this.routeConflicts.has(path);
  }

  /**
   * Get route information for a specific module
   */
  getModuleRoutes(moduleId: string): MountedRoute | undefined {
    return this.mountedRoutes.get(moduleId);
  }

  /**
   * Validate that frontend expectations match backend routes
   */
  validateFrontendBackendSync(config: ModuleConfig): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const mountedRoute = this.mountedRoutes.get(config.id);
    
    if (!mountedRoute) {
      issues.push(`Module '${config.id}' routes not mounted`);
      return { isValid: false, issues };
    }

    // Check that all navigation paths have corresponding API endpoints
    for (const navItem of config.navigation.items) {
      const expectedApiPath = navItem.path.replace('/console/', '/api/');
      const hasMatchingEndpoint = mountedRoute.endpoints.some(endpoint => 
        expectedApiPath.startsWith(endpoint.fullPath)
      );
      
      if (!hasMatchingEndpoint) {
        issues.push(`Navigation path '${navItem.path}' has no matching API endpoint`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

export const routeRegistry = RouteRegistry.getInstance();