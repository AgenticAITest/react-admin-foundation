import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
import postgres from 'postgres';
import { tenant } from './schema/system';
import { db } from './index';

// Module schemas will be imported here as modules are registered
const allModuleSchemas = {
  // Foundation schemas are included by default
  // Module schemas will be dynamically added here
};

interface TenantConnection {
  db: ReturnType<typeof drizzle>;
  client: postgres.Sql;
}

export class TenantDatabaseManager {
  private connections = new Map<string, TenantConnection>();
  private static instance: TenantDatabaseManager;

  static getInstance(): TenantDatabaseManager {
    if (!TenantDatabaseManager.instance) {
      TenantDatabaseManager.instance = new TenantDatabaseManager();
    }
    return TenantDatabaseManager.instance;
  }

  /**
   * Get tenant-scoped database connection
   * Automatically routes queries to the correct tenant schema
   */
  async getTenantDb(tenantId: string) {
    if (!this.connections.has(tenantId)) {
      const tenantInfo = await this.getTenant(tenantId);
      const schemaName = tenantInfo.schemaName;
      
      // Validate schema name to prevent injection
      if (!this.isValidSchemaName(schemaName)) {
        throw new Error(`Invalid schema name: ${schemaName}`);
      }
      
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      
      // Create PostgreSQL client with pool size 1 to ensure search_path reliability
      const client = postgres(connectionString, {
        max: 1, // Single connection to ensure search_path is always set correctly
        transform: {
          undefined: null,
        },
        onnotice: () => {}, // Suppress notices
      });
      
      // Set search path using safe configuration
      await client`SELECT set_config('search_path', ${schemaName + ',public'}, false)`;
      
      // Create Drizzle connection
      const db = drizzle(client, {
        schema: allModuleSchemas,
      });
      
      const connection: TenantConnection = { db, client };
      this.connections.set(tenantId, connection);
      console.log(`✅ Created database connection for tenant: ${tenantInfo.name} (schema: ${schemaName})`);
    }
    
    return this.connections.get(tenantId)!.db;
  }

  /**
   * Get tenant information by ID
   */
  async getTenant(tenantId: string) {
    const [tenantRecord] = await db
      .select()
      .from(tenant)
      .where(and(
        eq(tenant.id, tenantId),
        eq(tenant.status, 'active')
      ))
      .limit(1);

    if (!tenantRecord) {
      throw new Error(`Active tenant not found: ${tenantId}`);
    }

    return tenantRecord;
  }

  /**
   * Get tenant by schema name
   */
  async getTenantBySchema(schemaName: string) {
    const [tenantRecord] = await db
      .select()
      .from(tenant)
      .where(and(
        eq(tenant.schemaName, schemaName),
        eq(tenant.status, 'active')
      ))
      .limit(1);

    if (!tenantRecord) {
      throw new Error(`Active tenant not found for schema: ${schemaName}`);
    }

    return tenantRecord;
  }

  /**
   * Create new tenant schema and apply foundation tables atomically
   */
  async createTenantSchema(tenantId: string, schemaName: string) {
    // Validate schema name to prevent injection
    if (!this.isValidSchemaName(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = postgres(connectionString);
    
    try {
      console.log(`🚀 Creating tenant schema: ${schemaName}`);
      
      // Execute everything in a single transaction for atomicity
      await client.begin(async sql => {
        // Ensure pgcrypto extension is available for gen_random_uuid()
        await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
        
        // Create the tenant schema
        await sql`CREATE SCHEMA IF NOT EXISTS ${sql(schemaName)}`;
        
        // Set search path for this transaction
        await sql`SELECT set_config('search_path', ${schemaName + ',public'}, true)`;
        
        // Create all foundation tables within the transaction
        await this.createTenantUsersTable(sql, schemaName);
        await this.createTenantRolesTable(sql, schemaName);
        await this.createTenantPermissionsTable(sql, schemaName);
        await this.createTenantUserRolesTable(sql, schemaName);
        await this.createTenantRolePermissionsTable(sql, schemaName);
        await this.createTenantOptionsTable(sql, schemaName);
      });
      
      // Deploy modules after schema is successfully created
      await this.deployAllModulesToTenant(tenantId);
      
      console.log(`✅ Successfully created tenant schema: ${schemaName}`);
      return schemaName;
      
    } catch (error) {
      console.error(`❌ Failed to create tenant schema ${schemaName}:`, error);
      // Transaction will automatically rollback on error
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Apply foundation table schemas to tenant schema (DEPRECATED - integrated into createTenantSchema)
   */
  async applyFoundationSchemas(schemaName: string) {
    throw new Error('applyFoundationSchemas is deprecated - use createTenantSchema which handles everything atomically');
  }

  /**
   * Validate schema name to prevent SQL injection
   */
  private isValidSchemaName(schemaName: string): boolean {
    // Schema names must be alphanumeric with underscores only
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(schemaName) && schemaName.length <= 63;
  }

  /**
   * Create tenant users table with proper isolation
   */
  private async createTenantUsersTable(sql: postgres.Sql, schemaName: string) {
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(schemaName)}.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        fullname VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL CHECK (status IN ('active', 'inactive')),
        email VARCHAR(255),
        avatar VARCHAR(255),
        is_super_admin BOOLEAN DEFAULT false,
        global_permissions VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(username)
      )
    `;
  }

  /**
   * Create tenant roles table with proper isolation
   */
  private async createTenantRolesTable(sql: postgres.Sql, schemaName: string) {
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(schemaName)}.roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        is_system BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS ${sql(`${schemaName}_roles_code_idx`)} 
      ON ${sql(schemaName)}.roles (code)
    `;
  }

  /**
   * Create tenant permissions table with proper isolation
   */
  private async createTenantPermissionsTable(sql: postgres.Sql, schemaName: string) {
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(schemaName)}.permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS ${sql(`${schemaName}_permissions_code_idx`)} 
      ON ${sql(schemaName)}.permissions (code)
    `;
  }

  /**
   * Create tenant user_roles table with proper isolation
   */
  private async createTenantUserRolesTable(sql: postgres.Sql, schemaName: string) {
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(schemaName)}.user_roles (
        user_id UUID NOT NULL REFERENCES ${sql(schemaName)}.users(id),
        role_id UUID NOT NULL REFERENCES ${sql(schemaName)}.roles(id),
        PRIMARY KEY (user_id, role_id)
      )
    `;
  }

  /**
   * Create tenant role_permissions table with proper isolation
   */
  private async createTenantRolePermissionsTable(sql: postgres.Sql, schemaName: string) {
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(schemaName)}.role_permissions (
        role_id UUID NOT NULL REFERENCES ${sql(schemaName)}.roles(id),
        permission_id UUID NOT NULL REFERENCES ${sql(schemaName)}.permissions(id),
        PRIMARY KEY (role_id, permission_id)
      )
    `;
  }

  /**
   * Create tenant options table with proper isolation
   */
  private async createTenantOptionsTable(sql: postgres.Sql, schemaName: string) {
    await sql`
      CREATE TABLE IF NOT EXISTS ${sql(schemaName)}.options (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        value VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS ${sql(`${schemaName}_options_code_idx`)} 
      ON ${sql(schemaName)}.options (code)
    `;
  }

  /**
   * Create necessary indexes for tenant tables (REMOVED - replaced by safe individual table methods)
   */
  async createTenantTableIndexes(schemaName: string, tableName: string) {
    throw new Error('createTenantTableIndexes is deprecated - indexes are now created within individual table creation methods');
  }

  /**
   * Deploy all registered modules to a tenant
   */
  async deployAllModulesToTenant(tenantId: string) {
    // This will be enhanced when module registry is implemented
    // For now, this is a placeholder that logs the action
    console.log(`📦 Deploying modules to tenant: ${tenantId} (placeholder - will be implemented with module registry)`);
  }

  /**
   * Validate tenant schema exists and is accessible (using safe SQL)
   */
  async validateTenantSchema(schemaName: string): Promise<boolean> {
    if (!this.isValidSchemaName(schemaName)) {
      return false;
    }
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = postgres(connectionString);
    
    try {
      const result = await client`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = ${schemaName}
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error(`❌ Failed to validate schema ${schemaName}:`, error);
      return false;
    } finally {
      await client.end();
    }
  }

  /**
   * Get all active tenants
   */
  async getActiveTenants() {
    return await db
      .select()
      .from(tenant)
      .where(eq(tenant.status, 'active'));
  }

  /**
   * Execute raw SQL safely (DEPRECATED - replaced by individual safe methods)
   */
  private async executeSQL(sql: string): Promise<any[]> {
    throw new Error('executeSQL is deprecated - use safe parameterized queries instead');
  }

  /**
   * Close all tenant connections (for cleanup)
   */
  async closeAllConnections() {
    for (const [tenantId, connection] of this.connections) {
      try {
        // Close the underlying postgres client
        await connection.client.end();
        console.log(`✅ Closed connection for tenant: ${tenantId}`);
      } catch (error) {
        console.error(`❌ Failed to close connection for tenant ${tenantId}:`, error);
      }
    }
    this.connections.clear();
  }

  /**
   * Get schema health status (using safe SQL)
   */
  async getSchemaHealth(schemaName: string) {
    if (!this.isValidSchemaName(schemaName)) {
      return {
        schemaName,
        tableCount: 0,
        hasFoundationTables: false,
        tables: [],
        healthy: false,
        error: 'Invalid schema name'
      };
    }
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    const client = postgres(connectionString);
    
    try {
      const tables = await client`
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = ${schemaName}
      `;
      
      const tableCount = tables.length;
      const expectedFoundationTables = 6; // users, roles, permissions, user_roles, role_permissions, options
      
      return {
        schemaName,
        tableCount,
        hasFoundationTables: tableCount >= expectedFoundationTables,
        tables: tables.map((t: any) => t.table_name),
        healthy: tableCount >= expectedFoundationTables
      };
    } catch (error) {
      return {
        schemaName,
        tableCount: 0,
        hasFoundationTables: false,
        tables: [],
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      await client.end();
    }
  }
}

// Singleton instance
export const tenantDbManager = TenantDatabaseManager.getInstance();

// Utility function to generate schema name from tenant code
export const generateSchemaName = (tenantCode: string): string => {
  // Convert tenant code to valid PostgreSQL schema name
  return `tenant_${tenantCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
};

// Type definitions (remove duplicate)

export interface TenantInfo {
  id: string;
  code: string;
  name: string;
  schemaName: string;
  status: string;
}

export interface SchemaHealth {
  schemaName: string;
  tableCount: number;
  hasFoundationTables: boolean;
  tables: string[];
  healthy: boolean;
  error?: string;
}