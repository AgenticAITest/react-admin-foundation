import { Express, Router } from 'express';
import { ModuleConfig } from './module-registry';
import fs from 'fs/promises';
import path from 'path';
import postgres from 'postgres';

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
    // Compute the namespaced prefix for this plugin
    const prefix = `/api/plugins/${config.id}`;

    // Check for route conflicts (using new prefix)
    const configWithNewPrefix = { ...config, apiRoutes: { ...config.apiRoutes, prefix } };
    await this.validateRouteConflicts(configWithNewPrefix);

    // Load and mount the module router
    const router = await this.loadModuleRouter(moduleId);
    
    // Small pre-router that is always present (no auth needed)
    const pre = Router();
    pre.get('/health', (_req, res) => res.json({ ok: true, plugin: config.id }));

    // Gate middleware - per-tenant access control
    const gate = async (req: any, res: any, next: any) => {
      try {
        const tenantId = req.user?.activeTenantId || req.auth?.tenant_id;
        if (!tenantId) return res.status(401).json({ error: 'NO_TENANT' });

        // Create postgres client for raw query
        const sql = postgres(process.env.DATABASE_URL!);
        
        try {
          // Single query optimization: check both global and tenant toggles
          const result = await sql`
            select p.enabled_global,
                   coalesce(tp.enabled, false) as enabled_tenant
            from sys_plugins p
            left join sys_tenant_plugins tp
              on tp.plugin_id = p.plugin_id and tp.tenant_id = ${tenantId}
            where p.plugin_id = ${config.id}
          `;
          const row = result[0];
          
          if (!row?.enabled_global) {
            res.setHeader('X-Plugin-Denied', 'global-off');
            return res.status(403).json({ error: 'PLUGIN_GLOBALLY_DISABLED', pluginId: config.id, tenantId });
          }
          if (!row.enabled_tenant) {
            res.setHeader('X-Plugin-Denied', 'tenant-off');
            return res.status(403).json({ error: 'PLUGIN_DISABLED', pluginId: config.id, tenantId });
          }

          (req as any).pluginId = config.id;
          (req as any).tenantId = tenantId;
          next();
        } finally {
          await sql.end();
        }
      } catch (e) {
        next(e);
      }
    };

    // Mount in correct order: health pre-router → gate → plugin router
    this.app.use(prefix, pre);       // health stays open
    this.app.use(prefix, gate);      // gate guards everything else
    this.app.use(prefix, router);    // actual routes

    // OPTIONAL (temporary): keep legacy mount for transition, then remove later
    const legacy = config.apiRoutes.prefix;
    if (legacy && legacy !== prefix) {
      this.app.use(legacy, gate);    // gate the legacy routes too
      this.app.use(legacy, router);
    }

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