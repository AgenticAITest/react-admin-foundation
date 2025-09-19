import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken'; // You'll need to install jsonwebtoken: npm install jsonwebtoken @types/jsonwebtoken
import { db } from '../lib/db';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { permission, role, rolePermission, user, userRole } from '../lib/db/schema/system';
import { tenantDbManager } from '../lib/db/tenant-db';
import { drizzle } from 'drizzle-orm/postgres-js';

// Extend existing Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        activeTenantId: string;
        userId: string;
        isSuperAdmin?: boolean;
      };
      db?: ReturnType<typeof drizzle>; // Tenant-scoped database connection
    }
  }
}

export interface DecodedToken {
  username: string;
  tenant_id?: string;
  tenant_code?: string;
  // Add other properties from your JWT payload
}

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET; // JWT secret is required for security
if (!ACCESS_TOKEN_SECRET) {
  throw new Error('ACCESS_TOKEN_SECRET environment variable is required for security');
}

export const authenticated = () => async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No Bearer token provided or invalid format.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as DecodedToken;
    if (!decoded.username) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    let currentUser: any = null;

    if (decoded.tenant_id && decoded.tenant_code) {
      // Tenant user - lookup in tenant schema using secure approach
      const { TenantDatabaseManager } = await import('src/server/lib/db/tenant-db');
      const manager = TenantDatabaseManager.getInstance();
      
      // Validate tenant_id and tenant_code match trusted registry
      const tenantInfo = await manager.getTenant(decoded.tenant_id);
      const expectedTenantCode = tenantInfo.code.toUpperCase();
      if (decoded.tenant_code.toUpperCase() !== expectedTenantCode) {
        console.error(`Security: Token tenant_code '${decoded.tenant_code}' does not match registry '${expectedTenantCode}' for tenant_id '${decoded.tenant_id}'`);
        return res.status(401).json({ message: 'Invalid token.' });
      }
      
      const client = await manager.getTenantClient(decoded.tenant_id);
      
      // Use tenant client with search_path - no dynamic schema interpolation
      const results = await client.unsafe(`
        SELECT id, username, fullname, email, status 
        FROM users 
        WHERE username = $1 AND status = 'active' 
        LIMIT 1
      `, [decoded.username]) as Array<{ id: string; username: string; fullname: string; email: string; status: 'active'|'inactive' }>;
      
      if (results.length > 0) {
        const row = results[0];
        currentUser = {
          ...row,
          activeTenantId: decoded.tenant_id,
          isSuperAdmin: false // Tenant users are not super admins
        };
      }
    } else {
      // System user (sysadmin) - lookup in system table
      currentUser = await db
        .select()
        .from(user)
        .where(and(
          eq(user.username, decoded.username),
          eq(user.status, "active"))
        )
        .limit(1)
        .then((rows) => rows[0]);
    }

    if (!currentUser) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    // Enhanced user context
    req.user = { 
      username: currentUser.username, 
      activeTenantId: currentUser.activeTenantId,
      userId: currentUser.id,
      isSuperAdmin: currentUser.isSuperAdmin || false
    };
    
    // Set tenant-scoped database connection
    if (!currentUser.isSuperAdmin) {
      req.db = await tenantDbManager.getTenantDb(currentUser.activeTenantId);
    } else {
      // Super admins need tenant-scoped access for module APIs
      // Use their active tenant, or fallback to System tenant for module access
      const tenantId = currentUser.activeTenantId || '829cba12-507f-4826-8d3e-3c4858f00b1a'; // System tenant
      req.db = await tenantDbManager.getTenantDb(tenantId);
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

export const authorized = (
  roles: string | string[],
  permissions: string | string[],
  operator: 'or' | 'and' = 'or') => async (req: Request, res: Response, next: NextFunction) => {

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    const username = req.user.username;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    try {
      const hasRole = await userHasRoles(username, requiredRoles, req.user?.isSuperAdmin, req.user?.activeTenantId);
      const hasPermission = await userHasPermissions(username, requiredPermissions, req.user?.isSuperAdmin, req.user?.activeTenantId);
      //console.log("hasRole : ", hasRole);
      //console.log("hasPermission : ", hasPermission);
      if (operator === 'or' && (hasRole || hasPermission)) {
        next();
      } else if (operator === 'and' && hasRole && hasPermission) {
        next();
      } else {
        return res.status(403).json({ message: 'Forbidden.' });
      }
    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  };

// New super admin middleware
export const superAdminOnly = () => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: 'Super admin access required.' });
  }
  next();
};

export const hasRoles = (roles: string | string[]) => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const username = req.user.username;
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  try {
    const hasRole = await userHasRoles(username, requiredRoles, req.user?.isSuperAdmin, req.user?.activeTenantId);
    //console.log("hasRole : ", hasRole);
    if (hasRole) {
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden.' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const hasPermissions = (permissions: string | string[]) => async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const username = req.user.username;
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  try {
    const hasPermission = await userHasPermissions(username, requiredPermissions, req.user?.isSuperAdmin, req.user?.activeTenantId);
    //console.log("hasPermission : ", hasPermission);
    if (hasPermission) {
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden.' });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

const userHasRoles = async (username: string, roleCodes: string[], isSuperAdmin?: boolean, activeTenantId?: string): Promise<boolean> => {
  if (roleCodes.length === 0) {
    return true;
  }
  if (isSuperAdmin) {
    // Super admin users - query system schema
    const subquery = db
      .select()
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .innerJoin(user, eq(userRole.userId, user.id))
      .where(
        and(
          eq(user.username, username),
          inArray(role.code, roleCodes),
          eq(userRole.tenantId, user.activeTenantId),
          eq(role.tenantId, user.activeTenantId)
        )
      );

    const result = await db
      .select({
        exists: sql<boolean>`exists(${subquery})`
      })
      .from(sql`(select 1) as dummy`)
      .limit(1);
      
    return result[0]?.exists || false;
  } else {
    // Tenant users - use raw postgres client (search_path already set)
    if (!activeTenantId) {
      return false;
    }
    
    const { TenantDatabaseManager } = await import('src/server/lib/db/tenant-db');
    const manager = TenantDatabaseManager.getInstance();
    const client = await manager.getTenantClient(activeTenantId);
    
    const result = await client.unsafe(`
      SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        INNER JOIN users u ON ur.user_id = u.id
        WHERE u.username = $1 AND r.code = ANY($2::text[])
      ) as exists
    `, [username, roleCodes]);
    
    return result[0]?.exists || false;
  }
}

const userHasPermissions = async (username: string, permissionCodes: string[], isSuperAdmin?: boolean, activeTenantId?: string): Promise<boolean> => {
  if (permissionCodes.length === 0) {
    return true;
  }
  if (isSuperAdmin) {
    // Super admin users - query system schema
    const subquery = db
      .select()
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .innerJoin(rolePermission, eq(role.id, rolePermission.roleId))
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .innerJoin(user, eq(userRole.userId, user.id))
      .where(
        and(
          eq(user.username, username),
          inArray(permission.code, permissionCodes),
          eq(userRole.tenantId, user.activeTenantId),
          eq(role.tenantId, user.activeTenantId),
          eq(rolePermission.tenantId, user.activeTenantId),
          eq(permission.tenantId, user.activeTenantId)
        )
      );

    const result = await db
      .select({
        exists: sql<boolean>`exists(${subquery})`
      })
      .from(sql`(select 1) as dummy`)
      .limit(1);
      
    return result[0]?.exists || false;
  } else {
    // Tenant users - use raw postgres client (search_path already set)
    if (!activeTenantId) {
      return false;
    }
    
    const { TenantDatabaseManager } = await import('src/server/lib/db/tenant-db');
    const manager = TenantDatabaseManager.getInstance();
    const client = await manager.getTenantClient(activeTenantId);
    
    const result = await client.unsafe(`
      SELECT EXISTS(
        SELECT 1 FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        INNER JOIN role_permissions rp ON r.id = rp.role_id
        INNER JOIN permissions p ON rp.permission_id = p.id
        INNER JOIN users u ON ur.user_id = u.id
        WHERE u.username = $1 AND p.code = ANY($2::text[])
      ) as exists
    `, [username, permissionCodes]);
    
    return result[0]?.exists || false;
  }
}