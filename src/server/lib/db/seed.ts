import bcrypt from "bcryptjs";
import { db } from ".";
import { permission, role, rolePermission, tenant, user, userRole, userTenant } from "./schema/system";
import { PermissionCollector, STANDARD_PERMISSIONS } from "../constants/permissions";
import { ModuleRegistry } from "../modules/module-registry";

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
      schemaName: "system_tenant"
    },
    { 
      id: pubTenantId, 
      code: "PUBLIC", 
      name: "Public", 
      description: "Public Tenant",
      schemaName: "public_tenant"
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

  // Discovery modules and collect their permissions
  console.log("Discovering modules and collecting permissions");
  const moduleRegistry = ModuleRegistry.getInstance();
  await moduleRegistry.discoverModules();
  
  console.log("Seeding permissions");
  await seedAllPermissions(sysTenantId, pubTenantId);

  // Assign permissions to roles
  console.log("Assigning permissions to roles");
  await assignPermissionsToRoles(sysTenantId, pubTenantId);
}

// Helper function to seed all permissions (standard + module permissions)
async function seedAllPermissions(sysTenantId: string, pubTenantId: string) {
  const allPermissions = PermissionCollector.getAllPermissions();
  const permissionsToInsert = [];

  // Create permissions for both tenants
  for (const permissionCode of allPermissions) {
    // Generate a friendly name and description from the permission code
    const name = permissionCode
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    
    const description = `Permission to ${permissionCode}`;

    // Add for system tenant
    permissionsToInsert.push({
      id: crypto.randomUUID(),
      code: permissionCode,
      name: name,
      description: description,
      tenantId: sysTenantId
    });

    // Add for public tenant (exclude system-only permissions)
    if (!permissionCode.startsWith('system.tenant.add') && !permissionCode.startsWith('system.tenant.delete')) {
      permissionsToInsert.push({
        id: crypto.randomUUID(),
        code: permissionCode,
        name: name,
        description: description,
        tenantId: pubTenantId
      });
    }
  }

  if (permissionsToInsert.length > 0) {
    await db.insert(permission).values(permissionsToInsert);
    console.log(`✅ Seeded ${permissionsToInsert.length} permissions (${allPermissions.length} unique permissions for 2 tenants)`);
  }
}

// Helper function to assign permissions to roles
async function assignPermissionsToRoles(sysTenantId: string, pubTenantId: string) {
  try {
    // Get all roles for both tenants
    const roles = await db.select().from(role);
    const permissions = await db.select().from(permission);

    const rolePermissionsToInsert = [];

    for (const roleRecord of roles) {
      // SYSADMIN gets all permissions in their tenant
      if (roleRecord.code === 'SYSADMIN') {
        const tenantPermissions = permissions.filter(p => p.tenantId === roleRecord.tenantId);
        for (const perm of tenantPermissions) {
          rolePermissionsToInsert.push({
            roleId: roleRecord.id,
            permissionId: perm.id,
            tenantId: roleRecord.tenantId
          });
        }
      }
      
      // USER gets module permissions (non-system permissions) in their tenant
      if (roleRecord.code === 'USER') {
        const modulePermissions = permissions.filter(p => 
          p.tenantId === roleRecord.tenantId && 
          !p.code.startsWith('system.') // Exclude system permissions for regular users
        );
        for (const perm of modulePermissions) {
          rolePermissionsToInsert.push({
            roleId: roleRecord.id,
            permissionId: perm.id,
            tenantId: roleRecord.tenantId
          });
        }
      }
    }

    if (rolePermissionsToInsert.length > 0) {
      await db.insert(rolePermission).values(rolePermissionsToInsert);
      console.log(`✅ Assigned ${rolePermissionsToInsert.length} role-permission relationships`);
    }
  } catch (error) {
    console.error('❌ Failed to assign permissions to roles:', error);
    throw error;
  }
}

async function main() {
  await seed();
  console.log("Seed completed");
  process.exit(0);
}

main();