import { Router } from 'express';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../lib/db';
import { products, productTypes, packageTypes } from '../lib/db/schema/master';
import { authenticated, authorized } from '../middleware/authMiddleware';
import { validateData } from '../middleware/validationMiddleware';
import { productSchema, productQuerySchema } from '../schemas/productSchema';
import { productTypeSchema, productTypeQuerySchema } from '../schemas/productTypeSchema';
import { packageTypeSchema, packageTypeQuerySchema } from '../schemas/packageTypeSchema';

const masterRoutes = Router();
masterRoutes.use(authenticated());

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The product ID
 *         sku:
 *           type: string
 *           description: Product SKU
 *         name:
 *           type: string  
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         inventory_type_id:
 *           type: integer
 *           description: Reference to inventory type
 *         package_type_id:
 *           type: integer
 *           description: Reference to package type
 *         size_m3:
 *           type: number
 *           description: Product volume in cubic meters
 *         weight_kg:
 *           type: number
 *           description: Product weight in kilograms
 *         min_stock:
 *           type: integer
 *           description: Minimum stock level
 *         has_expiry:
 *           type: boolean
 *           description: Whether product has expiry date
 *         active:
 *           type: boolean
 *           description: Whether product is active
 *     ProductForm:
 *       type: object
 *       required:
 *         - sku
 *         - name
 *         - inventory_type_id
 *         - package_type_id
 *       properties:
 *         sku:
 *           type: string
 *           description: Product SKU
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         inventory_type_id:
 *           type: integer
 *           description: Reference to inventory type
 *         package_type_id:
 *           type: integer
 *           description: Reference to package type
 *         minimum_stock_level:
 *           type: integer
 *           description: Minimum stock level
 *         reorder_point:
 *           type: integer
 *           description: Reorder point
 *         weight:
 *           type: number
 *           description: Product weight
 *         dimensions:
 *           type: string
 *           description: Product dimensions
 *         active:
 *           type: boolean
 *           description: Whether product is active
 *         has_expiry_date:
 *           type: boolean
 *           description: Whether product has expiry date
 */

/**
 * @swagger
 * /api/master/products:
 *   get:
 *     tags:
 *       - Master Data - Products
 *     summary: Get all products with pagination and search
 *     description: Retrieve a list of products for the current tenant
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for SKU or name
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of products with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
masterRoutes.get('/products', authorized(['SYSADMIN', 'USER'], 'master.products.view'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Validate query parameters
    const queryValidation = productQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const { page, limit, sort, order, q } = queryValidation.data;
    const offset = (page - 1) * limit;
    const tenantId = req.user.activeTenantId;

    // Build sort column mapping
    const sortColumns = {
      id: products.id,
      sku: products.sku,
      name: products.name,
      active: products.active,
    };

    const sortColumn = sort in sortColumns 
      ? sortColumns[sort as keyof typeof sortColumns] 
      : products.name;

    // Build filter condition
    let filterCondition = eq(products.tenantId, tenantId);
    
    if (q) {
      filterCondition = and(
        filterCondition,
        or(
          ilike(products.sku, `%${q}%`),
          ilike(products.name, `%${q}%`)
        )
      );
    }

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(products)
      .where(filterCondition);

    // Get paginated products with relations
    const productsList = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        inventoryTypeId: products.inventoryTypeId,
        packageTypeId: products.packageTypeId,
        minimumStockLevel: products.minimumStockLevel,
        weight: products.weight,
        active: products.active,
        hasExpiryDate: products.hasExpiryDate,
        inventoryTypeName: productTypes.name,
        packageTypeName: packageTypes.name,
      })
      .from(products)
      .leftJoin(productTypes, eq(products.inventoryTypeId, productTypes.id))
      .leftJoin(packageTypes, eq(products.packageTypeId, packageTypes.id))
      .where(filterCondition)
      .orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      data: productsList,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/products:
 *   post:
 *     tags:
 *       - Master Data - Products
 *     summary: Create a new product
 *     description: Create a new product for the current tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 sku:
 *                   type: string
 *                 name:
 *                   type: string
 *                 active:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       409:
 *         description: SKU already exists
 */
masterRoutes.post('/products', authorized(['SYSADMIN', 'USER'], 'master.products.manage'), validateData(productSchema), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const tenantId = req.user.activeTenantId;
    const productData = req.body;

    // Check if SKU already exists for this tenant
    const existingProduct = await db
      .select({ id: products.id })
      .from(products)
      .where(and(
        eq(products.tenantId, tenantId),
        eq(products.sku, productData.sku)
      ))
      .limit(1);

    if (existingProduct.length > 0) {
      return res.status(409).json({ error: "SKU already exists for this tenant" });
    }

    // Create new product
    const [newProduct] = await db
      .insert(products)
      .values({
        tenantId,
        ...productData
      })
      .returning({
        id: products.id,
        sku: products.sku,
        name: products.name,
        active: products.active
      });

    return res.status(201).json(newProduct);

  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/products/{id}:
 *   get:
 *     tags:
 *       - Master Data - Products
 *     summary: Get a product by ID
 *     description: Retrieve a specific product by ID for the current tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The product ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
masterRoutes.get('/products/:id', authorized(['SYSADMIN', 'USER'], 'master.products.view'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const productId = parseInt(req.params.id);
    const tenantId = req.user.activeTenantId;

    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const product = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows) => rows[0]);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json(product);

  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/products/{id}:
 *   patch:
 *     tags:
 *       - Master Data - Products
 *     summary: Update a product
 *     description: Update an existing product for the current tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 sku:
 *                   type: string
 *                 name:
 *                   type: string
 *                 active:
 *                   type: boolean
 *       404:
 *         description: Product not found
 *       409:
 *         description: SKU already exists
 */
masterRoutes.patch('/products/:id', authorized(['SYSADMIN', 'USER'], 'master.products.manage'), validateData(productSchema), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const productId = parseInt(req.params.id);
    const tenantId = req.user.activeTenantId;
    const updateData = req.body;

    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Check if product exists for this tenant
    const existingProduct = await db
      .select({ id: products.id, sku: products.sku })
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // If SKU is being changed, check for conflicts
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const duplicateProduct = await db
        .select({ id: products.id })
        .from(products)
        .where(and(
          eq(products.tenantId, tenantId),
          eq(products.sku, updateData.sku)
        ))
        .limit(1);

      if (duplicateProduct.length > 0) {
        return res.status(409).json({ error: "SKU already exists for this tenant" });
      }
    }

    // Update product
    const [updatedProduct] = await db
      .update(products)
      .set(updateData)
      .where(and(
        eq(products.id, productId),
        eq(products.tenantId, tenantId)
      ))
      .returning({
        id: products.id,
        sku: products.sku,
        name: products.name,
        active: products.active
      });

    return res.json(updatedProduct);

  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The inventory type ID
 *         name:
 *           type: string
 *           description: Inventory type name
 *         description:
 *           type: string
 *           description: Inventory type description
 *         category:
 *           type: string
 *           description: Inventory type category
 *         is_active:
 *           type: boolean
 *           description: Whether inventory type is active
 *     InventoryTypeForm:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Inventory type name
 *         description:
 *           type: string
 *           description: Inventory type description
 *         category:
 *           type: string
 *           description: Inventory type category
 *         isActive:
 *           type: boolean
 *           description: Whether inventory type is active
 *     PackageType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The package type ID
 *         name:
 *           type: string
 *           description: Package type name
 *         description:
 *           type: string
 *           description: Package type description
 *         units_per_package:
 *           type: integer
 *           description: Units per package
 *         barcode:
 *           type: string
 *           description: Package barcode
 *         dimensions:
 *           type: string
 *           description: Package dimensions
 *         weight:
 *           type: number
 *           description: Package weight
 *         is_active:
 *           type: boolean
 *           description: Whether package type is active
 *     PackageTypeForm:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Package type name
 *         description:
 *           type: string
 *           description: Package type description
 *         unitsPerPackage:
 *           type: integer
 *           description: Units per package
 *         barcode:
 *           type: string
 *           description: Package barcode
 *         dimensions:
 *           type: string
 *           description: Package dimensions
 *         weight:
 *           type: number
 *           description: Package weight
 *         isActive:
 *           type: boolean
 *           description: Whether package type is active
 */

// ========== INVENTORY TYPES (Product Types) ENDPOINTS ==========

/**
 * @swagger
 * /api/master/inventory-types:
 *   get:
 *     tags:
 *       - Master Data - Inventory Types
 *     summary: Get all inventory types with pagination and search
 *     description: Retrieve a list of inventory types for the current tenant
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for name
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of inventory types with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryType'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
masterRoutes.get('/inventory-types', authorized(['SYSADMIN', 'USER'], 'master.inventory-types.view'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const queryValidation = productTypeQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const { page, limit, sort, order, q } = queryValidation.data;
    const offset = (page - 1) * limit;
    const tenantId = req.user.activeTenantId;

    const sortColumns = {
      id: productTypes.id,
      name: productTypes.name,
      category: productTypes.category,
      isActive: productTypes.isActive,
    };

    const sortColumn = sort in sortColumns 
      ? sortColumns[sort as keyof typeof sortColumns] 
      : productTypes.name;

    let filterCondition = eq(productTypes.tenantId, tenantId);
    
    if (q) {
      filterCondition = and(
        filterCondition,
        ilike(productTypes.name, `%${q}%`)
      );
    }

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(productTypes)
      .where(filterCondition);

    const inventoryTypesList = await db
      .select()
      .from(productTypes)
      .where(filterCondition)
      .orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      data: inventoryTypesList,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error("Error fetching inventory types:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/inventory-types:
 *   post:
 *     tags:
 *       - Master Data - Inventory Types
 *     summary: Create a new inventory type
 *     description: Create a new inventory type for the current tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryTypeForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Inventory type created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Name already exists
 */
masterRoutes.post('/inventory-types', authorized(['SYSADMIN', 'USER'], 'master.inventory-types.manage'), validateData(productTypeSchema), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const tenantId = req.user.activeTenantId;
    const inventoryTypeData = req.body;

    const existingType = await db
      .select({ id: productTypes.id })
      .from(productTypes)
      .where(and(
        eq(productTypes.tenantId, tenantId),
        eq(productTypes.name, inventoryTypeData.name)
      ))
      .limit(1);

    if (existingType.length > 0) {
      return res.status(409).json({ error: "Name already exists for this tenant" });
    }

    const [newInventoryType] = await db
      .insert(productTypes)
      .values({
        tenantId,
        ...inventoryTypeData
      })
      .returning({
        id: productTypes.id,
        name: productTypes.name,
        description: productTypes.description,
        isActive: productTypes.isActive
      });

    return res.status(201).json(newInventoryType);

  } catch (error) {
    console.error("Error creating inventory type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/inventory-types/{id}:
 *   get:
 *     tags:
 *       - Master Data - Inventory Types
 *     summary: Get an inventory type by ID
 *     description: Retrieve a specific inventory type by ID for the current tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The inventory type ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory type details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryType'
 *       404:
 *         description: Inventory type not found
 */
masterRoutes.get('/inventory-types/:id', authorized(['SYSADMIN', 'USER'], 'master.inventory-types.view'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const inventoryTypeId = parseInt(req.params.id);
    const tenantId = req.user.activeTenantId;

    if (isNaN(inventoryTypeId)) {
      return res.status(400).json({ error: "Invalid inventory type ID" });
    }

    const inventoryType = await db
      .select()
      .from(productTypes)
      .where(and(
        eq(productTypes.id, inventoryTypeId),
        eq(productTypes.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows) => rows[0]);

    if (!inventoryType) {
      return res.status(404).json({ error: "Inventory type not found" });
    }

    return res.json(inventoryType);

  } catch (error) {
    console.error("Error fetching inventory type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/inventory-types/{id}:
 *   patch:
 *     tags:
 *       - Master Data - Inventory Types
 *     summary: Update an inventory type
 *     description: Update an existing inventory type for the current tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The inventory type ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryTypeForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventory type updated successfully
 *       404:
 *         description: Inventory type not found
 *       409:
 *         description: Name already exists
 */
masterRoutes.patch('/inventory-types/:id', authorized(['SYSADMIN', 'USER'], 'master.inventory-types.manage'), validateData(productTypeSchema), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const inventoryTypeId = parseInt(req.params.id);
    const tenantId = req.user.activeTenantId;
    const updateData = req.body;

    if (isNaN(inventoryTypeId)) {
      return res.status(400).json({ error: "Invalid inventory type ID" });
    }

    const existingInventoryType = await db
      .select({ id: productTypes.id, name: productTypes.name })
      .from(productTypes)
      .where(and(
        eq(productTypes.id, inventoryTypeId),
        eq(productTypes.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingInventoryType) {
      return res.status(404).json({ error: "Inventory type not found" });
    }

    if (updateData.name && updateData.name !== existingInventoryType.name) {
      const duplicateType = await db
        .select({ id: productTypes.id })
        .from(productTypes)
        .where(and(
          eq(productTypes.tenantId, tenantId),
          eq(productTypes.name, updateData.name)
        ))
        .limit(1);

      if (duplicateType.length > 0) {
        return res.status(409).json({ error: "Name already exists for this tenant" });
      }
    }

    const [updatedInventoryType] = await db
      .update(productTypes)
      .set(updateData)
      .where(and(
        eq(productTypes.id, inventoryTypeId),
        eq(productTypes.tenantId, tenantId)
      ))
      .returning({
        id: productTypes.id,
        name: productTypes.name,
        description: productTypes.description,
        isActive: productTypes.isActive
      });

    return res.json(updatedInventoryType);

  } catch (error) {
    console.error("Error updating inventory type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ========== PACKAGE TYPES ENDPOINTS ==========

/**
 * @swagger
 * /api/master/package-types:
 *   get:
 *     tags:
 *       - Master Data - Package Types
 *     summary: Get all package types with pagination and search
 *     description: Retrieve a list of package types for the current tenant
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: name
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for name
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of package types with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PackageType'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
masterRoutes.get('/package-types', authorized(['SYSADMIN', 'USER'], 'master.package-types.view'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const queryValidation = packageTypeQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const { page, limit, sort, order, q } = queryValidation.data;
    const offset = (page - 1) * limit;
    const tenantId = req.user.activeTenantId;

    const sortColumns = {
      id: packageTypes.id,
      name: packageTypes.name,
      unitsPerPackage: packageTypes.unitsPerPackage,
      isActive: packageTypes.isActive,
    };

    const sortColumn = sort in sortColumns 
      ? sortColumns[sort as keyof typeof sortColumns] 
      : packageTypes.name;

    let filterCondition = eq(packageTypes.tenantId, tenantId);
    
    if (q) {
      filterCondition = and(
        filterCondition,
        ilike(packageTypes.name, `%${q}%`)
      );
    }

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(packageTypes)
      .where(filterCondition);

    const packageTypesList = await db
      .select()
      .from(packageTypes)
      .where(filterCondition)
      .orderBy(order === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      data: packageTypesList,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages
      }
    });

  } catch (error) {
    console.error("Error fetching package types:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/package-types:
 *   post:
 *     tags:
 *       - Master Data - Package Types
 *     summary: Create a new package type
 *     description: Create a new package type for the current tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackageTypeForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Package type created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Name already exists
 */
masterRoutes.post('/package-types', authorized(['SYSADMIN', 'USER'], 'master.package-types.manage'), validateData(packageTypeSchema), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const tenantId = req.user.activeTenantId;
    const packageTypeData = req.body;

    const existingType = await db
      .select({ id: packageTypes.id })
      .from(packageTypes)
      .where(and(
        eq(packageTypes.tenantId, tenantId),
        eq(packageTypes.name, packageTypeData.name)
      ))
      .limit(1);

    if (existingType.length > 0) {
      return res.status(409).json({ error: "Name already exists for this tenant" });
    }

    const [newPackageType] = await db
      .insert(packageTypes)
      .values({
        tenantId,
        ...packageTypeData
      })
      .returning({
        id: packageTypes.id,
        name: packageTypes.name,
        description: packageTypes.description,
        isActive: packageTypes.isActive
      });

    return res.status(201).json(newPackageType);

  } catch (error) {
    console.error("Error creating package type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/package-types/{id}:
 *   get:
 *     tags:
 *       - Master Data - Package Types
 *     summary: Get a package type by ID
 *     description: Retrieve a specific package type by ID for the current tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The package type ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Package type details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PackageType'
 *       404:
 *         description: Package type not found
 */
masterRoutes.get('/package-types/:id', authorized(['SYSADMIN', 'USER'], 'master.package-types.view'), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const packageTypeId = parseInt(req.params.id);
    const tenantId = req.user.activeTenantId;

    if (isNaN(packageTypeId)) {
      return res.status(400).json({ error: "Invalid package type ID" });
    }

    const packageType = await db
      .select()
      .from(packageTypes)
      .where(and(
        eq(packageTypes.id, packageTypeId),
        eq(packageTypes.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows) => rows[0]);

    if (!packageType) {
      return res.status(404).json({ error: "Package type not found" });
    }

    return res.json(packageType);

  } catch (error) {
    console.error("Error fetching package type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/master/package-types/{id}:
 *   patch:
 *     tags:
 *       - Master Data - Package Types
 *     summary: Update a package type
 *     description: Update an existing package type for the current tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The package type ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PackageTypeForm'
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Package type updated successfully
 *       404:
 *         description: Package type not found
 *       409:
 *         description: Name already exists
 */
masterRoutes.patch('/package-types/:id', authorized(['SYSADMIN', 'USER'], 'master.package-types.manage'), validateData(packageTypeSchema), async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const packageTypeId = parseInt(req.params.id);
    const tenantId = req.user.activeTenantId;
    const updateData = req.body;

    if (isNaN(packageTypeId)) {
      return res.status(400).json({ error: "Invalid package type ID" });
    }

    const existingPackageType = await db
      .select({ id: packageTypes.id, name: packageTypes.name })
      .from(packageTypes)
      .where(and(
        eq(packageTypes.id, packageTypeId),
        eq(packageTypes.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingPackageType) {
      return res.status(404).json({ error: "Package type not found" });
    }

    if (updateData.name && updateData.name !== existingPackageType.name) {
      const duplicateType = await db
        .select({ id: packageTypes.id })
        .from(packageTypes)
        .where(and(
          eq(packageTypes.tenantId, tenantId),
          eq(packageTypes.name, updateData.name)
        ))
        .limit(1);

      if (duplicateType.length > 0) {
        return res.status(409).json({ error: "Name already exists for this tenant" });
      }
    }

    const [updatedPackageType] = await db
      .update(packageTypes)
      .set(updateData)
      .where(and(
        eq(packageTypes.id, packageTypeId),
        eq(packageTypes.tenantId, tenantId)
      ))
      .returning({
        id: packageTypes.id,
        name: packageTypes.name,
        description: packageTypes.description,
        isActive: packageTypes.isActive
      });

    return res.json(updatedPackageType);

  } catch (error) {
    console.error("Error updating package type:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default masterRoutes;