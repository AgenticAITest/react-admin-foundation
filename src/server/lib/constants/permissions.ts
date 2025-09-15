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