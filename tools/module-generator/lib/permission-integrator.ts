import * as fs from 'fs';
import * as path from 'path';

interface ModulePermissions {
  moduleId: string;
  permissions: string[];
}

/**
 * Automatically integrates module permissions into the system
 */
export class PermissionIntegrator {
  private static readonly CONSTANTS_FILE = 'src/server/lib/constants/permissions.ts';
  
  /**
   * Add module permissions to the constants file
   */
  static async addModulePermissions(moduleId: string, permissions: string[]): Promise<void> {
    try {
      const constantsPath = path.resolve(this.CONSTANTS_FILE);
      let content = fs.readFileSync(constantsPath, 'utf-8');
      
      // Find the MODULE_PERMISSIONS object
      const modulePermissionsRegex = /(export const MODULE_PERMISSIONS: Record<string, string\[\]> = \{[^}]*)(}\s*;)/s;
      const match = content.match(modulePermissionsRegex);
      
      if (!match) {
        throw new Error('Could not find MODULE_PERMISSIONS object in constants file');
      }
      
      // Check if module already exists (check both quoted and unquoted keys)
      const moduleExistsRegex = new RegExp(`\\s+['"]?${moduleId}['"]?:\\s*\\[`);
      if (moduleExistsRegex.test(match[1])) {
        console.log(`Module ${moduleId} permissions already exist, skipping...`);
        return;
      }
      
      // Add the new module permissions (use quoted key for safety)
      const permissionsArray = permissions.map(p => `    '${p}'`).join(',\n');
      const newModuleEntry = `,\n  '${moduleId}': [\n${permissionsArray}\n  ]`;
      
      // Insert before the closing brace
      const newContent = content.replace(
        modulePermissionsRegex,
        `$1${newModuleEntry}\n$2`
      );
      
      fs.writeFileSync(constantsPath, newContent);
      console.log(`✅ Added ${permissions.length} permissions for module '${moduleId}' to constants`);
      
    } catch (error) {
      console.error('❌ Failed to add module permissions to constants:', error);
      throw error;
    }
  }
  
  /**
   * Safely sync permissions and role mappings without data loss
   */
  static async syncPermissions(moduleId: string, permissions: string[]): Promise<void> {
    try {
      console.log('🔄 Syncing module permissions...');
      
      // Import database utilities directly
      const { db } = await import('../../../src/server/lib/db');
      const { permission, role, rolePermission, tenant } = await import('../../../src/server/lib/db/schema/system');
      const { eq, and } = await import('drizzle-orm');
      
      // Get tenants
      const tenants = await db.select().from(tenant);
      const existingPermissions = await db.select().from(permission);
      const roles = await db.select().from(role);
      
      // Only add missing permissions (idempotent)
      const newPermissionEntries: Array<{
        id: string;
        code: string;
        name: string;
        description: string;
        tenantId: string;
      }> = [];
      for (const tenantRecord of tenants) {
        for (const permissionCode of permissions) {
          const exists = existingPermissions.some(p => 
            p.code === permissionCode && p.tenantId === tenantRecord.id
          );
          
          if (!exists) {
            const [module, entity, action] = permissionCode.split('.');
            const name = `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity.charAt(0).toUpperCase() + entity.slice(1)}`;
            const description = `Permission to ${action} ${entity} in ${module} module`;
            
            newPermissionEntries.push({
              id: crypto.randomUUID(),
              code: permissionCode,
              name,
              description,
              tenantId: tenantRecord.id
            });
          }
        }
      }
      
      // Insert only new permissions
      if (newPermissionEntries.length > 0) {
        await db.insert(permission).values(newPermissionEntries);
        console.log(`✅ Added ${newPermissionEntries.length} new permissions`);
      } else {
        console.log('✅ All permissions already exist');
      }
      
      // Sync role-permission mappings for ALL permissions (idempotent)
      const { inArray } = await import('drizzle-orm');
      const modulePermissions = await db.select().from(permission)
        .where(inArray(permission.code, permissions)); // Get all module permissions
      
      const roleMappings: Array<{
        roleId: string;
        permissionId: string;
        tenantId: string;
      }> = [];
      for (const permRecord of modulePermissions) {
        // Only grant to SYSADMIN and USER roles, not custom roles
        const tenantRoles = roles.filter(r => 
          r.tenantId === permRecord.tenantId && 
          (r.code === 'SYSADMIN' || r.code === 'USER')
        );
        
        for (const roleRecord of tenantRoles) {
          // Check if mapping already exists
          const existingMappings = await db.select().from(rolePermission)
            .where(and(
              eq(rolePermission.roleId, roleRecord.id),
              eq(rolePermission.permissionId, permRecord.id)
            ));
          
          if (existingMappings.length === 0) {
            roleMappings.push({
              roleId: roleRecord.id,
              permissionId: permRecord.id,
              tenantId: roleRecord.tenantId
            });
          }
        }
      }
      
      // Insert only new role-permission mappings
      if (roleMappings.length > 0) {
        await db.insert(rolePermission).values(roleMappings);
        console.log(`✅ Added ${roleMappings.length} new role-permission mappings`);
      } else {
        console.log('✅ All role mappings already exist');
      }
      
      console.log('✅ Permission sync completed safely');
      
    } catch (error) {
      console.error('❌ Failed to sync permissions:', error);
      throw error;
    }
  }
  
  /**
   * Complete integration workflow for a new module
   */
  static async integrateModule(moduleId: string, permissions: string[]): Promise<void> {
    console.log(`🔧 Integrating permissions for module '${moduleId}'...`);
    
    // Step 1: Add to constants file
    await this.addModulePermissions(moduleId, permissions);
    
    // Step 2: Safely sync permissions to database
    await this.syncPermissions(moduleId, permissions);
    
    console.log(`✅ Module '${moduleId}' permissions integrated successfully!`);
  }
}