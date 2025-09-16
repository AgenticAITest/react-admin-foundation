/**
 * Super Admin Permission Constants
 * 
 * These permissions are granted exclusively to super administrators
 * for managing the entire multi-tenant system and its modules.
 */

export const SUPER_ADMIN_PERMISSIONS = [
  // Tenant Management
  'system.tenant.create',
  'system.tenant.edit',
  'system.tenant.activate',
  'system.tenant.deactivate',
  'system.tenant.delete',
  'system.tenant.view_all',
  'system.tenant.manage_schemas',
  
  // Module Management
  'system.module.install',
  'system.module.activate',
  'system.module.deactivate',
  'system.module.configure',
  'system.module.remove',
  'system.module.view_all',
  'system.module.deploy',
  
  // System Monitoring
  'system.monitoring.view',
  'system.logs.view',
  'system.performance.view',
  'system.health.view',
  'system.metrics.view',
  'system.audit.view',
  
  // Global Configuration
  'system.config.edit',
  'system.backup.manage',
  'system.maintenance.manage',
  'system.security.manage',
  
  // User Management (Global)
  'system.user.create_super_admin',
  'system.user.manage_global',
  'system.user.impersonate',
  
  // Database Management
  'system.database.manage_schemas',
  'system.database.view_all_tenants',
  'system.database.maintenance',
] as const;

/**
 * Permission categories for easier management and UI display
 */
export const SUPER_ADMIN_PERMISSION_CATEGORIES = {
  TENANT_MANAGEMENT: {
    name: 'Tenant Management',
    description: 'Create, modify, and manage tenant organizations',
    permissions: [
      'system.tenant.create',
      'system.tenant.edit',
      'system.tenant.activate',
      'system.tenant.deactivate',
      'system.tenant.delete',
      'system.tenant.view_all',
      'system.tenant.manage_schemas',
    ]
  },
  
  MODULE_MANAGEMENT: {
    name: 'Module Management',
    description: 'Install, configure, and deploy business modules',
    permissions: [
      'system.module.install',
      'system.module.activate',
      'system.module.deactivate',
      'system.module.configure',
      'system.module.remove',
      'system.module.view_all',
      'system.module.deploy',
    ]
  },
  
  SYSTEM_MONITORING: {
    name: 'System Monitoring',
    description: 'Monitor system health, performance, and audit logs',
    permissions: [
      'system.monitoring.view',
      'system.logs.view',
      'system.performance.view',
      'system.health.view',
      'system.metrics.view',
      'system.audit.view',
    ]
  },
  
  GLOBAL_CONFIGURATION: {
    name: 'Global Configuration',
    description: 'Configure system-wide settings and security',
    permissions: [
      'system.config.edit',
      'system.backup.manage',
      'system.maintenance.manage',
      'system.security.manage',
    ]
  },
  
  USER_MANAGEMENT: {
    name: 'User Management',
    description: 'Manage global users and super administrator accounts',
    permissions: [
      'system.user.create_super_admin',
      'system.user.manage_global',
      'system.user.impersonate',
    ]
  },
  
  DATABASE_MANAGEMENT: {
    name: 'Database Management',
    description: 'Manage database schemas and cross-tenant operations',
    permissions: [
      'system.database.manage_schemas',
      'system.database.view_all_tenants',
      'system.database.maintenance',
    ]
  }
} as const;

/**
 * Helper functions for super admin permission management
 */
export class SuperAdminPermissionHelper {
  /**
   * Check if a permission is a super admin permission
   */
  static isSuperAdminPermission(permission: string): boolean {
    return SUPER_ADMIN_PERMISSIONS.includes(permission as any);
  }
  
  /**
   * Get all permissions for a specific category
   */
  static getPermissionsByCategory(category: keyof typeof SUPER_ADMIN_PERMISSION_CATEGORIES): readonly string[] {
    return SUPER_ADMIN_PERMISSION_CATEGORIES[category].permissions;
  }
  
  /**
   * Get the category for a specific permission
   */
  static getCategoryForPermission(permission: string): string | null {
    for (const [categoryKey, categoryData] of Object.entries(SUPER_ADMIN_PERMISSION_CATEGORIES)) {
      if ((categoryData.permissions as readonly string[]).includes(permission)) {
        return categoryKey;
      }
    }
    return null;
  }
  
  /**
   * Validate that a user has the required super admin permissions
   */
  static validatePermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => userPermissions.includes(permission));
  }
  
  /**
   * Parse global permissions from JSON string stored in database
   */
  static parseGlobalPermissions(globalPermissionsJson: string | null): string[] {
    if (!globalPermissionsJson) return [];
    
    try {
      const parsed = JSON.parse(globalPermissionsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  /**
   * Serialize permissions to JSON string for database storage
   */
  static serializeGlobalPermissions(permissions: string[]): string {
    return JSON.stringify(permissions);
  }
}

export type SuperAdminPermission = typeof SUPER_ADMIN_PERMISSIONS[number];
export type SuperAdminPermissionCategory = keyof typeof SUPER_ADMIN_PERMISSION_CATEGORIES;