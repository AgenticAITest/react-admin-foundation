// Super admin permissions for system-wide management
export const SUPER_ADMIN_PERMISSIONS = [
  // Tenant Management
  'system.tenant.create',
  'system.tenant.edit',
  'system.tenant.activate',
  'system.tenant.deactivate',
  'system.tenant.delete',
  'system.tenant.view.all',
  
  // Module Management
  'system.module.install',
  'system.module.activate',
  'system.module.deactivate',
  'system.module.configure',
  'system.module.remove',
  'system.module.view.all',
  
  // System Monitoring
  'system.monitoring.view',
  'system.logs.view',
  'system.performance.view',
  'system.health.view',
  'system.metrics.view',
  
  // Global Configuration
  'system.config.edit',
  'system.backup.manage',
  'system.security.manage',
  'system.settings.global',
  
  // User Management
  'system.user.impersonate',
  'system.user.global.view',
  'system.user.global.manage',
  
  // Database Management
  'system.database.view',
  'system.database.backup',
  'system.database.restore',
  'system.schema.manage',
] as const;

export type SuperAdminPermission = typeof SUPER_ADMIN_PERMISSIONS[number];

// Standard permissions that are manually defined (existing system permissions)
export const STANDARD_PERMISSIONS = [
  // System permissions for both tenants
  'system.tenant.view',
  'system.tenant.add',
  'system.tenant.edit', 
  'system.tenant.delete',
  'system.user.view',
  'system.user.add',
  'system.user.edit',
  'system.user.delete',
  'system.user.reset_password',
  'system.role.view',
  'system.role.add', 
  'system.role.edit',
  'system.role.delete',
  'system.permission.view',
  'system.permission.add',
  'system.permission.edit',
  'system.permission.delete',
  'system.option.view',
  'system.option.add',
  'system.option.edit',
  'system.option.delete',
] as const;

export type StandardPermission = typeof STANDARD_PERMISSIONS[number];

// Dynamic permission collector for module-generated permissions
export class PermissionCollector {
  private static modulePermissions: string[] = [];

  static addModulePermissions(permissions: string[]) {
    // Add only unique permissions
    for (const permission of permissions) {
      if (!this.modulePermissions.includes(permission)) {
        this.modulePermissions.push(permission);
      }
    }
  }

  static getAllModulePermissions(): string[] {
    return [...this.modulePermissions];
  }

  static getAllPermissions(): string[] {
    return [...STANDARD_PERMISSIONS, ...this.modulePermissions];
  }

  static clear() {
    this.modulePermissions = [];
  }
}