import { Router } from 'express';
import { authenticated, superAdminOnly } from '../../middleware/authMiddleware';
import { moduleHotswapManager } from '../../lib/modules/hotswap-manager';

const modulesRouter = Router();

// All routes require super admin access
modulesRouter.use(authenticated(), superAdminOnly());

/**
 * @swagger
 * /api/system/modules/status:
 *   get:
 *     tags:
 *       - System Management
 *     summary: Get status of all modules
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Module status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       version:
 *                         type: string
 *                       mounted:
 *                         type: boolean
 *                       routePrefix:
 *                         type: string
 */
modulesRouter.get('/status', async (req, res) => {
  try {
    const modules = moduleHotswapManager.getModuleStatus();
    res.json({ modules });
  } catch (error: any) {
    console.error('Error getting module status:', error);
    res.status(500).json({ error: `Failed to get module status: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/system/modules/hotswap/{moduleId}:
 *   post:
 *     tags:
 *       - System Management
 *     summary: Hotswap a module without server restart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module hotswapped successfully
 *       500:
 *         description: Error hotswapping module
 */
modulesRouter.post('/hotswap/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    await moduleHotswapManager.hotswapModule(moduleId);
    res.json({ 
      success: true, 
      message: `Module ${moduleId} hotswapped successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`Error hotswapping module ${req.params.moduleId}:`, error);
    res.status(500).json({ error: `Failed to hotswap module: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/system/modules/import:
 *   post:
 *     tags:
 *       - System Management
 *     summary: Import a module package
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - config
 *               - files
 *               - version
 *             properties:
 *               id:
 *                 type: string
 *               config:
 *                 type: object
 *               files:
 *                 type: object
 *               version:
 *                 type: string
 *               exportedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Module imported successfully
 *       400:
 *         description: Invalid module package
 *       500:
 *         description: Error importing module
 */
modulesRouter.post('/import', async (req, res) => {
  try {
    const modulePackage = req.body;
    
    // Basic validation
    if (!modulePackage.id || !modulePackage.config || !modulePackage.files) {
      return res.status(400).json({ 
        error: 'Invalid module package. Required fields: id, config, files' 
      });
    }
    
    await moduleHotswapManager.importModule(modulePackage);
    res.json({ 
      success: true, 
      message: `Module ${modulePackage.id} imported successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error importing module:', error);
    res.status(500).json({ error: `Failed to import module: ${error.message}` });
  }
});

/**
 * @swagger
 * /api/system/modules/export/{moduleId}:
 *   get:
 *     tags:
 *       - System Management
 *     summary: Export a module as package
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Module package data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 config:
 *                   type: object
 *                 files:
 *                   type: object
 *                 version:
 *                   type: string
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Module not found
 *       500:
 *         description: Error exporting module
 */
modulesRouter.get('/export/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const modulePackage = await moduleHotswapManager.exportModule(moduleId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${moduleId}-module-package.json"`);
    
    res.json(modulePackage);
  } catch (error: any) {
    console.error(`Error exporting module ${req.params.moduleId}:`, error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({ error: `Module ${req.params.moduleId} not found` });
    } else {
      res.status(500).json({ error: `Failed to export module: ${error.message}` });
    }
  }
});

/**
 * @swagger
 * /api/system/modules/rediscover:
 *   post:
 *     tags:
 *       - System Management
 *     summary: Re-discover all modules in the modules directory
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Modules rediscovered successfully
 *       500:
 *         description: Error rediscovering modules
 */
modulesRouter.post('/rediscover', async (req, res) => {
  try {
    // Import moduleRegistry to rediscover all modules
    const { moduleRegistry } = await import('../../lib/modules/module-registry');
    await moduleRegistry.discoverModules();
    
    const modules = moduleHotswapManager.getModuleStatus();
    res.json({ 
      success: true, 
      message: 'All modules rediscovered successfully',
      modules,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error rediscovering modules:', error);
    res.status(500).json({ error: `Failed to rediscover modules: ${error.message}` });
  }
});

export default modulesRouter;