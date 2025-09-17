import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { db } from '../lib/db';
import { tenant } from '../lib/db/schema/system';
import { generateSchemaName, validateDomain } from '../lib/utils/schema-generator';

/**
 * Request interface for creating a new tenant
 */
export interface CreateTenantRequest {
  // Mandatory fields
  tenantName: string;
  domain: string;
  
  // Tenant admin user (mandatory)
  adminUsername: string;
  adminEmail: string;
  adminFullName: string;
  adminPassword: string;
  
  // Optional company details
  logoUrl?: string;
  address?: string;
  phoneNumber?: string;
  timezone?: string;
  currency?: string;
  language?: string;
}

/**
 * Response interface for tenant creation
 */
export interface CreateTenantResponse {
  tenant: {
    id: string;
    name: string;
    domain: string;
    schemaName: string;
    status: string;
  };
  tenantAdmin: {
    id: string;
    username: string;
    email: string;
    fullname: string;
  };
}

/**
 * Interface for listing tenants
 */
export interface ListTenantsRequest {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListTenantsResponse {
  tenants: Array<{
    id: string;
    name: string;
    domain: string;
    schemaName: string;
    status: string;
    moduleCount: number;
    createdAt: Date;
    logoUrl?: string;
    phoneNumber?: string;
    address?: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

/**
 * Service class for tenant provisioning and management
 */
export class TenantProvisioningService {
  
  /**
   * Create a new tenant with complete provisioning
   */
  async createTenant(data: CreateTenantRequest): Promise<CreateTenantResponse> {
    // Validate domain format and restrictions
    const domainValidation = validateDomain(data.domain);
    if (!domainValidation.isValid) {
      throw new Error(domainValidation.error);
    }

    return await db.transaction(async (tx) => {
      // 1. Validate domain uniqueness
      await this.validateDomainUniqueness(tx, data.domain);
      
      // 2. Generate schema name
      const schemaName = generateSchemaName(data.domain);
      
      // 3. Create tenant record in PUBLIC sys_tenant
      const tenantRecord = await this.createTenantRecord(tx, data, schemaName);
      
      // 4. Create tenant schema
      await this.createTenantSchema(tx, schemaName);
      
      // 5. Create tenant_info table in tenant schema
      await this.createTenantInfoTable(tx, schemaName, data);
      
      // 6. Create RBAC tables in tenant schema
      await this.createRBACTables(tx, schemaName);
      
      // 7. Insert default roles and permissions
      await this.insertDefaultRBACData(tx, schemaName);
      
      // 8. Create tenant admin user
      const adminUser = await this.createTenantAdminUser(tx, schemaName, data);
      
      // 9. Update tenant status to 'active' after successful provisioning
      await tx.update(tenant)
        .set({ status: 'active' as const, updatedAt: new Date() })
        .where(eq(tenant.id, tenantRecord.id));
      
      return {
        tenant: {
          id: tenantRecord.id,
          name: tenantRecord.name,
          domain: tenantRecord.domain,
          schemaName: tenantRecord.schemaName,
          status: 'active' // Updated after successful provisioning
        },
        tenantAdmin: adminUser
      };
    });
  }

  /**
   * List tenants with search and pagination
   */
  async listTenants(params: ListTenantsRequest): Promise<ListTenantsResponse> {
    const { search = '', page = 1, limit = 10 } = params;
    const offset = (page - 1) * limit;

    // Build query conditions
    const searchCondition = search 
      ? sql`(${tenant.name} ILIKE ${`%${search}%`} OR ${tenant.domain} ILIKE ${`%${search}%`})`
      : sql`1=1`;

    // Get tenants with count
    const [tenants, totalCount] = await Promise.all([
      db.select({
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        schemaName: tenant.schemaName,
        status: tenant.status,
        createdAt: tenant.createdAt,
        // Note: logoUrl, phoneNumber, address would need to be queried from tenant_info tables
        // For now, we'll return null/undefined for these fields
      })
      .from(tenant)
      .where(searchCondition)
      .orderBy(tenant.createdAt)
      .limit(limit)
      .offset(offset),
      
      db.select({ count: sql<number>`count(*)` })
        .from(tenant)
        .where(searchCondition)
    ]);

    return {
      tenants: tenants.map(t => ({
        ...t,
        moduleCount: 0, // TODO: Count from enabled_modules field or module assignments
        logoUrl: undefined,
        phoneNumber: undefined,
        address: undefined
      })),
      total: Number(totalCount[0]?.count || 0),
      page,
      limit
    };
  }

  /**
   * Validate that domain doesn't already exist
   */
  private async validateDomainUniqueness(tx: any, domain: string) {
    const existing = await tx.select()
      .from(tenant)
      .where(eq(tenant.domain, domain))
      .limit(1);
      
    if (existing.length > 0) {
      throw new Error(`Domain '${domain}' already exists`);
    }
  }

  /**
   * Create tenant record in sys_tenant table
   */
  private async createTenantRecord(tx: any, data: CreateTenantRequest, schemaName: string) {
    const [tenantRecord] = await tx.insert(tenant).values({
      code: data.domain.toUpperCase(), // Use domain as code for now
      name: data.tenantName,
      domain: data.domain,
      schemaName: schemaName,
      status: 'provisioning' as const
    }).returning();

    return tenantRecord;
  }

  /**
   * Create tenant schema in database
   */
  private async createTenantSchema(tx: any, schemaName: string) {
    await tx.execute(sql`CREATE SCHEMA ${sql.identifier(schemaName)}`);
  }

  /**
   * Create tenant_info table in tenant schema
   */
  private async createTenantInfoTable(tx: any, schemaName: string, data: CreateTenantRequest) {
    // Create tenant_info table structure
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.tenant_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,           -- READ-ONLY for tenant admin (contract-based)
        logo_url VARCHAR(500),                -- Tenant admin can modify
        address TEXT,                         -- Tenant admin can modify
        phone_number VARCHAR(50),             -- Tenant admin can modify
        timezone VARCHAR(100) DEFAULT 'UTC',  -- Tenant admin can modify
        currency VARCHAR(10) DEFAULT 'USD',   -- Tenant admin can modify
        language VARCHAR(10) DEFAULT 'en',    -- Tenant admin can modify
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert initial tenant info (including optional fields if provided by super admin)
    await tx.execute(sql`
      INSERT INTO ${sql.identifier(schemaName)}.tenant_info 
      (name, logo_url, address, phone_number, timezone, currency, language)
      VALUES (
        ${data.tenantName}, 
        ${data.logoUrl || null}, 
        ${data.address || null}, 
        ${data.phoneNumber || null}, 
        ${data.timezone || 'UTC'}, 
        ${data.currency || 'USD'}, 
        ${data.language || 'en'}
      )
    `);
  }

  /**
   * Create RBAC tables in tenant schema
   */
  private async createRBACTables(tx: any, schemaName: string) {
    // Users table (tenant-specific)
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        fullname VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Roles table (tenant-specific)
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(code)
      )
    `);

    // Permissions table (tenant-specific)
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User-Role relationship (tenant-specific)
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.user_roles (
        user_id UUID NOT NULL REFERENCES ${sql.identifier(schemaName)}.users(id),
        role_id UUID NOT NULL REFERENCES ${sql.identifier(schemaName)}.roles(id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (user_id, role_id)
      )
    `);

    // Role-Permission relationship (tenant-specific)
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.role_permissions (
        role_id UUID NOT NULL REFERENCES ${sql.identifier(schemaName)}.roles(id),
        permission_id UUID NOT NULL REFERENCES ${sql.identifier(schemaName)}.permissions(id),
        assigned_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (role_id, permission_id)
      )
    `);
  }

  /**
   * Insert default roles and permissions in tenant schema
   */
  private async insertDefaultRBACData(tx: any, schemaName: string) {
    // Insert default roles
    const roleInserts = [
      { code: 'ADMIN', name: 'Administrator', description: 'Full tenant administration access', is_system: true },
      { code: 'USER', name: 'User', description: 'Regular user access', is_system: true },
      { code: 'VIEWER', name: 'Viewer', description: 'Read-only access', is_system: true }
    ];

    for (const role of roleInserts) {
      await tx.execute(sql`
        INSERT INTO ${sql.identifier(schemaName)}.roles (id, code, name, description, is_system)
        VALUES (gen_random_uuid(), ${role.code}, ${role.name}, ${role.description}, ${role.is_system})
      `);
    }

    // Insert default permissions
    const permissionInserts = [
      { code: 'users.view', name: 'View Users', description: 'Can view user lists' },
      { code: 'users.create', name: 'Create Users', description: 'Can create new users' },
      { code: 'users.edit', name: 'Edit Users', description: 'Can modify user details' },
      { code: 'users.delete', name: 'Delete Users', description: 'Can remove users' },
      { code: 'roles.view', name: 'View Roles', description: 'Can view role lists' },
      { code: 'roles.create', name: 'Create Roles', description: 'Can create new roles' },
      { code: 'roles.edit', name: 'Edit Roles', description: 'Can modify roles' },
      { code: 'roles.delete', name: 'Delete Roles', description: 'Can remove roles' },
      { code: 'permissions.view', name: 'View Permissions', description: 'Can view permissions' },
      { code: 'modules.view', name: 'View Modules', description: 'Can view available modules' },
      { code: 'modules.manage', name: 'Manage Modules', description: 'Can subscribe/unsubscribe modules' },
      { code: 'integrations.view', name: 'View Integrations', description: 'Can view integrations' },
      { code: 'integrations.manage', name: 'Manage Integrations', description: 'Can create/modify integrations' }
    ];

    for (const permission of permissionInserts) {
      await tx.execute(sql`
        INSERT INTO ${sql.identifier(schemaName)}.permissions (id, code, name, description)
        VALUES (gen_random_uuid(), ${permission.code}, ${permission.name}, ${permission.description})
      `);
    }

    // Assign all permissions to ADMIN role
    await tx.execute(sql`
      INSERT INTO ${sql.identifier(schemaName)}.role_permissions (role_id, permission_id)
      SELECT r.id, p.id 
      FROM ${sql.identifier(schemaName)}.roles r, ${sql.identifier(schemaName)}.permissions p 
      WHERE r.code = 'ADMIN'
    `);
  }

  /**
   * Create tenant admin user and assign ADMIN role
   */
  private async createTenantAdminUser(tx: any, schemaName: string, data: CreateTenantRequest) {
    // Hash password using existing pattern (same as auth.ts)
    const passwordHash = await bcrypt.hash(data.adminPassword, 10);
    
    // Insert tenant admin user
    const [userResult] = await tx.execute(sql`
      INSERT INTO ${sql.identifier(schemaName)}.users 
      (id, username, password_hash, email, fullname, status)
      VALUES (
        gen_random_uuid(),
        ${data.adminUsername},
        ${passwordHash},
        ${data.adminEmail},
        ${data.adminFullName},
        'active'
      )
      RETURNING id, username, email, fullname
    `);
    
    // Assign ADMIN role to tenant admin user
    await tx.execute(sql`
      INSERT INTO ${sql.identifier(schemaName)}.user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM ${sql.identifier(schemaName)}.users u, ${sql.identifier(schemaName)}.roles r
      WHERE u.username = ${data.adminUsername} AND r.code = 'ADMIN'
    `);

    return {
      id: userResult.id,
      username: data.adminUsername,
      email: data.adminEmail,
      fullname: data.adminFullName
    };
  }

  /**
   * Update tenant status (e.g., from 'provisioning' to 'active')
   */
  async updateTenantStatus(tenantId: string, status: 'active' | 'inactive' | 'suspended' | 'provisioning') {
    await db.update(tenant)
      .set({ status, updatedAt: new Date() })
      .where(eq(tenant.id, tenantId));
  }
}