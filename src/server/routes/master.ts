import { Router } from 'express';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../lib/db';
import { products, productTypes, packageTypes } from '../lib/db/schema/master';
import { authenticated, authorized } from '../middleware/authMiddleware';
import { validateData } from '../middleware/validationMiddleware';
import { productSchema, productQuerySchema } from '../schemas/productSchema';

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
      const searchCondition = or(
        ilike(products.sku, `%${q}%`),
        ilike(products.name, `%${q}%`)
      );
      if (searchCondition) {
        filterCondition = and(filterCondition, searchCondition);
      }
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

export default masterRoutes;