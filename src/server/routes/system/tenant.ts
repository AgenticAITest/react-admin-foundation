import bcrypt from 'bcryptjs';
import { and, asc, count, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from 'src/server/lib/db';
import { role, tenant, user, userRole, userTenant } from "src/server/lib/db/schema/system";
import { authenticated, authorized, hasRoles } from 'src/server/middleware/authMiddleware';
import { validateData } from 'src/server/middleware/validationMiddleware';
import { tenantCodeValidationSchema, tenantSchema } from 'src/server/schemas/tenantSchema';
import { TenantProvisioningService } from '../../services/TenantProvisioningService';

const tenantRoutes = Router();
tenantRoutes.use(authenticated());

// Initialize provisioning service
const provisioningService = new TenantProvisioningService();

/**
 * @swagger
 * /api/system/tenant:
 *   get:
 *     tags:
 *       - System - Tenant
 *     summary: Get all tenants (Super Admin)
 *     description: Retrieve a list of all tenants for super admin
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (alternative to perPage)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: ''
 *         description: Search by tenant name or domain
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           default: ''
 *         description: Filter by name (alternative to search)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of tenants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenants:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       domain:
 *                         type: string
 *                       schemaName:
 *                         type: string
 *                       status:
 *                         type: string
 *                       moduleCount:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   description: Total number of tenants
 *                 total:
 *                   type: integer
 *                   description: Total number of tenants (alias)
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 perPage:
 *                   type: integer
 *                   description: Items per page
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     Tenant:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The tenant ID
 *         code:
 *           type: string
 *           description: The code of the tenant
 *         name:
 *           type: string
 *           description: The name of the tenant
 *         description:
 *           type: string
 *           description: A description of the tenant
 */
tenantRoutes.get('/', hasRoles('SYSADMIN'), async (req, res) => {
  try {
    // Support both old and new parameter names for backward compatibility
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt((req.query.limit || req.query.perPage) as string) || 10;
    const search = (req.query.search || req.query.filter) as string || '';

    // Use provisioning service to list ALL tenants (for super admin)
    const result = await provisioningService.listTenants({
      search,
      page,
      limit
    });

    // Return response in expected format for backward compatibility
    res.json({
      tenants: result.tenants,
      count: result.total,
      page: result.page,
      perPage: result.limit, // Map limit back to perPage for compatibility
      total: result.total
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/system/tenant/{id}:
 *   get:
 *     tags:
 *       - System - Tenant
 *     summary: Get a tenant by ID
 *     description: Retrieve a specific tenant by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tenant to retrieve
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The tenant details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 */
tenantRoutes.get('/:id', authorized('SYSADMIN', 'system.tenant.view'), async (req, res) => {
  const idParam = req.params.id;

  try {
    const data = await db
      .select()
      .from(tenant)
      .where(eq(tenant.id, idParam))
      .limit(1)
      .then((rows) => rows[0]);

    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }

    return res.json(data);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @swagger
 * /api/system/tenant/add:
 *   post:
 *     tags:
 *       - System - Tenant
 *     summary: Add a new  tenant
 *     description: Create a new tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TenantForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tenant created successfully
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     TenantForm:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The tenant ID
 *         code:
 *           type: string
 *           description: The code of the tenant
 *         name:
 *           type: string
 *           description: The name of the tenant
 *         description:
 *           type: string
 *           description: A description of the tenant
 */
/**
 * @swagger
 * /api/system/tenant:
 *   post:
 *     tags:
 *       - System - Tenant
 *     summary: Create new tenant with full provisioning
 *     description: Create a new tenant with complete schema provisioning, RBAC setup, and tenant admin user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantName
 *               - domain
 *               - adminUsername
 *               - adminEmail
 *               - adminFullName
 *               - adminPassword
 *               - confirmPassword
 *             properties:
 *               tenantName:
 *                 type: string
 *                 description: The name of the tenant company
 *               domain:
 *                 type: string
 *                 pattern: "^[a-z0-9-]+$"
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Domain for login routing (lowercase, numbers, hyphens only)
 *               adminUsername:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Username for tenant administrator
 *               adminEmail:
 *                 type: string
 *                 format: email
 *                 description: Email for tenant administrator
 *               adminFullName:
 *                 type: string
 *                 description: Full name of tenant administrator
 *               adminPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Password for tenant administrator
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation
 *               logoUrl:
 *                 type: string
 *                 format: uri
 *                 description: Optional company logo URL
 *               address:
 *                 type: string
 *                 description: Optional company address
 *               phoneNumber:
 *                 type: string
 *                 description: Optional company phone number
 *               timezone:
 *                 type: string
 *                 default: "UTC"
 *                 description: Company timezone
 *               currency:
 *                 type: string
 *                 default: "USD"
 *                 description: Company currency
 *               language:
 *                 type: string
 *                 default: "en"
 *                 description: Company language
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenant:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     domain:
 *                       type: string
 *                     schemaName:
 *                       type: string
 *                     status:
 *                       type: string
 *                 tenantAdmin:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullname:
 *                       type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Domain already exists
 *       500:
 *         description: Internal server error
 */
tenantRoutes.post('/', hasRoles('SYSADMIN'), async (req, res) => {
  try {
    // Validate required fields with frontend payload compatibility
    const {
      // Support both 'name' (frontend) and 'tenantName' (backward compatibility)
      name,
      tenantName,
      domain,
      adminUsername,
      adminEmail,
      adminFullName,
      adminPassword,
      confirmPassword,
      // Support both frontend naming and backend naming
      logoUrl,
      address,
      phoneNumber,
      companyAddress,
      companyPhone,
      companyEmail,
      timezone = 'UTC',
      currency = 'USD',
      language = 'en'
    } = req.body;

    // Map frontend payload to backend format
    const finalTenantName = name || tenantName; // Priority to 'name' (frontend), fallback to 'tenantName'
    const finalAddress = companyAddress || address;
    const finalPhoneNumber = companyPhone || phoneNumber;
    const finalLogoUrl = logoUrl; // Frontend doesn't send this yet

    // Basic validation
    if (!finalTenantName || !domain || !adminUsername || !adminEmail || !adminFullName || !adminPassword) {
      return res.status(400).json({
        error: 'Missing required fields: name (or tenantName), domain, adminUsername, adminEmail, adminFullName, adminPassword'
      });
    }

    // Only validate password confirmation if it's provided (frontend compatibility)
    if (confirmPassword && adminPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Password confirmation does not match'
      });
    }

    // Use provisioning service to create tenant
    const result = await provisioningService.createTenant({
      tenantName: finalTenantName,
      domain,
      adminUsername,
      adminEmail,
      adminFullName,
      adminPassword,
      logoUrl: finalLogoUrl,
      address: finalAddress,
      phoneNumber: finalPhoneNumber,
      timezone,
      currency,
      language
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    
    // Handle domain uniqueness error
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    // Handle validation errors
    if (error.message.includes('Domain must be') || error.message.includes('reserved')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/system/tenant/{id}/edit:
 *   put:
 *     tags:
 *       - System - Tenant
 *     summary: Edit system tenant
 *     description: Edit system tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TenantForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *       404:
 *         description: Tenant not found
 *       500:
 *         description: Internal server error
 */
tenantRoutes.put('/:id/edit', authorized('SYSADMIN', 'system.tenant.edit'), validateData(tenantSchema), async (req, res) => {
  const idParam = req.params.id;
  const { id, code, name, description } = req.body;

  if (idParam !== id) {
    return res.status(400).json({ message: 'Invalid tenant ID' });
  }

  try {
    const updatedTenant = await db.update(tenant).set({
      code,
      name,
      description
    }).where(and(
      eq(tenant.id, id),
    )
    )
      .returning()
      .then((rows) => rows[0]);

    res.status(200).json(updatedTenant);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});


/**
 * @swagger
 * /api/system/tenant/{id}/delete:
 *   delete:
 *     tags:
 *       - System - Tenant
 *     summary: Delete system tenant
 *     description: Delete an existing tenant by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tenant to delete
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant deleted successfully
 *       404:
 *         description: Tenant not found
 */
tenantRoutes.delete('/:id/delete', hasRoles('SYSADMIN'), async (req, res) => {

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idParam = req.params.id;

  try {
    const deletedTenant = await db.delete(tenant).where(and(
      eq(tenant.id, idParam),
    )).returning()
      .then((rows) => rows[0]);

    if (!deletedTenant) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.status(200).json({ message: "Tenant deleted successfully" });
  } catch (error) {
    console.error("Error deleting tenant:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});


/**
 * @swagger
 * /api/system/tenant/validate-code:
 *   post:
 *     tags:
 *       - System - Tenant
 *     summary: Validate tenant code
 *     description: Check if the tenant code is unique 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TenantCodeValidation'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tenant code is valid
 *       400:
 *         description: Tenant code must be unique within the tenant
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     TenantCodeValidation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The tenant ID
 *         code:
 *           type: string
 *           description: The code of the tenant
 *         tenantId:
 *           type: string
 *           description: The tenant ID associated with the tenant
 */
tenantRoutes.post("/validate-code", authorized('SYSADMIN', 'system.tenant.edit'), validateData(tenantCodeValidationSchema), async (req, res) => {
  res.status(200).json({ message: "Tenant code is valid." });
});

export default tenantRoutes;