import { Router } from 'express';
import { authenticated, superAdminOnly } from '../middleware/authMiddleware';
import { SUPER_ADMIN_PERMISSIONS, SuperAdminPermissionHelper } from '../lib/auth/super-admin-permissions';

const testSuperAdminRouter = Router();

// Test endpoint for super admin functionality
testSuperAdminRouter.get('/super-admin-test', 
  authenticated(),
  superAdminOnly(),
  async (req, res) => {
    try {
      const user = req.user!;
      
      // Test super admin context
      const testResult = {
        message: 'Super admin access granted',
        user: {
          username: user.username,
          userId: user.userId,
          isSuperAdmin: user.isSuperAdmin,
          activeTenantId: user.activeTenantId
        },
        permissions: {
          total: SUPER_ADMIN_PERMISSIONS.length,
          sample: SUPER_ADMIN_PERMISSIONS.slice(0, 5)
        },
        databaseAccess: req.db ? 'Global database access' : 'No database connection',
        timestamp: new Date().toISOString()
      };
      
      res.json(testResult);
    } catch (error) {
      console.error('Super admin test error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Test endpoint for checking specific super admin permissions
testSuperAdminRouter.get('/check-permissions',
  authenticated(),
  superAdminOnly(),
  async (req, res) => {
    try {
      const user = req.user!;
      
      // Parse user's global permissions (if any stored in database)
      const userPermissions = SuperAdminPermissionHelper.parseGlobalPermissions(
        req.query.permissions as string || '[]'
      );
      
      const permissionCheck = {
        user: user.username,
        isSuperAdmin: user.isSuperAdmin,
        permissionCategories: Object.keys(SUPER_ADMIN_PERMISSIONS),
        hasAllPermissions: SuperAdminPermissionHelper.validatePermissions(
          userPermissions, 
          SUPER_ADMIN_PERMISSIONS as any
        ),
        testPermissions: {
          canCreateTenant: SuperAdminPermissionHelper.validatePermissions(
            userPermissions, 
            ['system.tenant.create']
          ),
          canManageModules: SuperAdminPermissionHelper.validatePermissions(
            userPermissions,
            ['system.module.install', 'system.module.configure']
          )
        }
      };
      
      res.json(permissionCheck);
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default testSuperAdminRouter;