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

// Module permissions registry - automatically populated by module generator
export const MODULE_PERMISSIONS: Record<string, string[]> = {
  // Existing master data permissions for compatibility
  master: [
    'master.products.view',
    'master.products.manage',
    'master.inventory-types.view', 
    'master.inventory-types.manage',
    'master.package-types.view',
    'master.package-types.manage'
  ]
  // Generated module permissions will be added here automatically
,
  'testmodule2': [
    'testmodule2.testentity2.view',
    'testmodule2.testentity2.add',
    'testmodule2.testentity2.edit',
    'testmodule2.testentity2.delete'
  ]
,
  'testmodule3': [
    'testmodule3.testentity3.view',
    'testmodule3.testentity3.add',
    'testmodule3.testentity3.edit',
    'testmodule3.testentity3.delete'
  ]
,
  'inventory': [
    'inventory.product.view',
    'inventory.product.add',
    'inventory.product.edit',
    'inventory.product.delete'
  ]
,
  'tasks': [
    'tasks.task management.view',
    'tasks.task management.add',
    'tasks.task management.edit',
    'tasks.task management.delete'
  ]
};

// Get all module permissions as flat array
export const getAllModulePermissions = (): string[] => {
  return Object.values(MODULE_PERMISSIONS).flat();
};

// Register new module permissions (called by module generator)
export const registerModulePermissions = (moduleId: string, permissions: string[]): void => {
  MODULE_PERMISSIONS[moduleId] = permissions;
};