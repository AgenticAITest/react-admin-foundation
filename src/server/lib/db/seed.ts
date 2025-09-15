import bcrypt from "bcryptjs";
import { db } from ".";
import { permission, role, rolePermission, tenant, user, userRole, userTenant } from "./schema/system";
import { getAllModulePermissions } from "../constants/permissions";

async function seed() {

  console.log("Clearing table")
  await db.execute(`TRUNCATE TABLE "sys_user_tenant", "sys_user_role", "sys_role_permission", "sys_permission", "sys_role", "sys_user", "sys_option", "sys_tenant"  CASCADE`);

  console.log("Seeding tenant");
  const sysTenantId = crypto.randomUUID();
  const pubTenantId = crypto.randomUUID();
  await db.insert(tenant).values([
    { 
      id: sysTenantId, 
      code: "SYSTEM", 
      name: "System", 
      description: "System Tenant",
      schemaName: "system_tenant",
      status: "active"
    },
    { 
      id: pubTenantId, 
      code: "PUBLIC", 
      name: "Public", 
      description: "Public Tenant",
      schemaName: "public_tenant", 
      status: "active"
    }
  ]);

  console.log("Seeding user");
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash("S3cr3T", 10);
  await db.insert(user).values([
    { id: userId, username: "sysadmin", passwordHash: passwordHash, fullname: "System Admin", status: "active", activeTenantId:sysTenantId }
  ]);

  console.log("Seeding role");
  const sysRoleId = crypto.randomUUID();
  const pubRoleId = crypto.randomUUID();
  await db.insert(role).values([
    { id: sysRoleId, code: "SYSADMIN", name: "System Admin", description: "Role System Admin", isSystem: true, tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "USER", name: "Role User", description: "Regular user role", isSystem: false, tenantId: sysTenantId },
    { id: pubRoleId, code: "SYSADMIN", name: "System Admin", description: "Role System Admin", isSystem: true, tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "USER", name: "Role User", description: "Regular user role", isSystem: false, tenantId: pubTenantId }
  ]);

  console.log("seeding user tenant");
  await db.insert(userTenant).values([
    { userId: userId, tenantId: sysTenantId },
    { userId: userId, tenantId: pubTenantId }
  ]);

  console.log("Seeding user role");
  await db.insert(userRole).values([
    { userId: userId, roleId: sysRoleId, tenantId: sysTenantId },
    { userId: userId, roleId: pubRoleId, tenantId: pubTenantId }
  ]);

  console.log("Seeding permission");
  await db.insert(permission).values([

    // system tenant permission
    { id: crypto.randomUUID(), code: "system.tenant.view", name: "View Tenant", description: "Permission to view tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.add", name: "Create Tenant", description: "Permission to add tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.edit", name: "Edit Tenant", description: "Permission to edit tenant", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.delete", name: "Delete Tenant", description: "Permission to delete tenant", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.user.view", name: "View User", description: "Permission to view user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.add", name: "Create User", description: "Permission to add user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.edit", name: "Edit User", description: "Permission to edit user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.delete", name: "Delete User", description: "Permission to delete user", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.user.reset_password", name: "Reset Password", description: "Permission to reset password user", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.role.view", name: "View Role", description: "Permission to view role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.add", name: "Create Role", description: "Permission to add role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.edit", name: "Edit Role", description: "Permission to edit role", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.role.delete", name: "Delete Role", description: "Permission to delete role", tenantId: sysTenantId },

    { id: crypto.randomUUID(), code: "system.permission.view", name: "View Permission", description: "Permission to view permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.add", name: "Create Permission", description: "Permission to add permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.edit", name: "Edit Permission", description: "Permission to edit permission", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.permission.delete", name: "Delete Permission", description: "Permission to delete permission", tenantId: sysTenantId },  

    { id: crypto.randomUUID(), code: "system.option.view", name: "View Option", description: "Permission to view option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.add", name: "Create Option", description: "Permission to add option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.edit", name: "Edit Option", description: "Permission to edit option", tenantId: sysTenantId },
    { id: crypto.randomUUID(), code: "system.option.delete", name: "Delete Option", description: "Permission to delete option", tenantId: sysTenantId },

    

    // public tenant permissions
    { id: crypto.randomUUID(), code: "system.tenant.view", name: "View Tenant", description: "Permission to view tenant", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.tenant.edit", name: "Edit Tenant", description: "Permission to edit tenant", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.user.view", name: "View User", description: "Permission to view user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.add", name: "Create User", description: "Permission to add user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.edit", name: "Edit User", description: "Permission to edit user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.delete", name: "Delete User", description: "Permission to delete user", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.user.reset_password", name: "Reset Password", description: "Permission to reset password user", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.role.view", name: "View Role", description: "Permission to view role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.add", name: "Create Role", description: "Permission to add role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.edit", name: "Edit Role", description: "Permission to edit role", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.role.delete", name: "Delete Role", description: "Permission to delete role", tenantId: pubTenantId },

    { id: crypto.randomUUID(), code: "system.permission.view", name: "View Permission", description: "Permission to view permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.add", name: "Create Permission", description: "Permission to add permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.edit", name: "Edit Permission", description: "Permission to edit permission", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.permission.delete", name: "Delete Permission", description: "Permission to delete permission", tenantId: pubTenantId },  

    { id: crypto.randomUUID(), code: "system.option.view", name: "View Option", description: "Permission to view option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.add", name: "Create Option", description: "Permission to add option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.edit", name: "Edit Option", description: "Permission to edit option", tenantId: pubTenantId },
    { id: crypto.randomUUID(), code: "system.option.delete", name: "Delete Option", description: "Permission to delete option", tenantId: pubTenantId },

    // Module permissions - automatically added by generators
    ...generateModulePermissionSeeds(sysTenantId, pubTenantId)
  ]);

  // Seed role-permission mappings
  await seedRolePermissions(sysTenantId, pubTenantId);

  // console.log("Seeding role permission");
  // await db.insert(rolePermission).values([
  //   { roleId: sysRoleId, permissionId: sysPermissionId, tenantId: sysTenantId },
  //   { roleId: pubRoleId, permissionId: pubPermissionId, tenantId: pubTenantId }
  // ]);

}

async function main() {
  await seed();
  console.log("Seed completed");
  process.exit(0);
}

// Helper function to generate permission seeds for modules
function generateModulePermissionSeeds(sysTenantId: string, pubTenantId: string) {
  const modulePermissions = getAllModulePermissions();
  const seeds = [];
  
  for (const permissionCode of modulePermissions) {
    const [module, entity, action] = permissionCode.split('.');
    const name = `${action.charAt(0).toUpperCase() + action.slice(1)} ${entity.charAt(0).toUpperCase() + entity.slice(1)}`;
    const description = `Permission to ${action} ${entity} in ${module} module`;
    
    // Add for both system and public tenants
    seeds.push(
      { id: crypto.randomUUID(), code: permissionCode, name, description, tenantId: sysTenantId },
      { id: crypto.randomUUID(), code: permissionCode, name, description, tenantId: pubTenantId }
    );
  }
  
  return seeds;
}

// Helper function to seed role-permission mappings
async function seedRolePermissions(sysTenantId: string, pubTenantId: string) {
  console.log("Seeding role permissions");
  
  // Get all roles and permissions for mapping
  const roles = await db.select().from(role);
  const permissions = await db.select().from(permission);
  
  const sysAdminRoles = roles.filter(r => r.code === 'SYSADMIN');
  const userRoles = roles.filter(r => r.code === 'USER');
  
  const mappings = [];
  
  // Grant all permissions to SYSADMIN roles
  for (const adminRole of sysAdminRoles) {
    const tenantPermissions = permissions.filter(p => p.tenantId === adminRole.tenantId);
    for (const perm of tenantPermissions) {
      mappings.push({
        roleId: adminRole.id,
        permissionId: perm.id,
        tenantId: adminRole.tenantId
      });
    }
  }
  
  // Grant module permissions to USER roles (but not system admin permissions)
  for (const userRole of userRoles) {
    const modulePermissions = getAllModulePermissions();
    const tenantPermissions = permissions.filter(p => 
      p.tenantId === userRole.tenantId && 
      modulePermissions.includes(p.code)
    );
    
    for (const perm of tenantPermissions) {
      mappings.push({
        roleId: userRole.id,
        permissionId: perm.id,
        tenantId: userRole.tenantId
      });
    }
  }
  
  if (mappings.length > 0) {
    await db.insert(rolePermission).values(mappings);
  }
}

main();