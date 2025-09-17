
import { Router } from 'express';
import { asc, count, desc, eq, ilike } from 'drizzle-orm';
import { authenticated, authorized } from '../../../../server/middleware/authMiddleware';
import { validateData } from '../../../../server/middleware/validationMiddleware';
import { productSchema, productEditSchema } from '../schemas/productSchema';
import { products } from '../../../../server/lib/db/schema/modules/inventory';

const router = Router();

// All routes require authentication
router.use(authenticated());

// GET /products - List all products
router.get("/products", 
  authorized(['SYSADMIN', 'USER'], 'inventory.product.view'), 
  async (req, res) => {
    const pageParam = req.query.page as string | undefined;
    const perPageParam = req.query.perPage as string | undefined;
    const sortParam = (req.query.sort as string) || 'name';
    const orderParam = (req.query.order as 'asc' | 'desc') || 'asc';
    const filterParam = (req.query.filter as string) || '';

    const page = pageParam ? parseInt(pageParam) : 1;
    const perPage = perPageParam ? parseInt(perPageParam) : 10;
    const offset = (page - 1) * perPage;

    const filterCondition = filterParam
      ? ilike(products.name, `%${filterParam}%`)
      : undefined;

    let countQuery = req.db!
      .select({ value: count() })
      .from(products);
    if (filterCondition) {
      countQuery = countQuery.where(filterCondition);
    }
    const [{ value: total }] = await countQuery;

    const validSortColumns = ['name', 'createdAt', 'updatedAt', 'id'] as const;
    const sortKey = validSortColumns.includes(sortParam as any) ? sortParam : 'name';
    const sortColumn = products[sortKey as keyof typeof products];
    let itemsQuery = req.db!
      .select()
      .from(products);
    if (filterCondition) {
      itemsQuery = itemsQuery.where(filterCondition);
    }
    const items = await itemsQuery
      .orderBy(orderParam === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(perPage)
      .offset(offset);

    res.json({
      items,
      count: total,
      page,
      perPage,
      sort: sortParam,
      order: orderParam,
      filter: filterParam
    });
  }
);

// POST /products - Create new product
router.post("/products",
  authorized(['SYSADMIN', 'USER'], 'inventory.product.add'),
  validateData(productSchema),
  async (req, res) => {
    try {
      const { name, description } = req.body;
      const tenantId = req.user?.activeTenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'No active tenant' });
      }

      const [newItem] = await req.db!
        .insert(products)
        .values({
          name,
          description,
          tenantId,
        })
        .returning();

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// GET /products/:id - Get product by ID
router.get("/products/:id",
  authorized(['SYSADMIN', 'USER'], 'inventory.product.view'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [item] = await req.db!
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      if (!item) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// PUT /products/:id - Update product
router.put("/products/:id",
  authorized(['SYSADMIN', 'USER'], 'inventory.product.edit'),
  validateData(productEditSchema),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [updatedItem] = await req.db!
        .update(products)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(products.id, id))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// DELETE /products/:id - Delete product
router.delete("/products/:id",
  authorized(['SYSADMIN', 'USER'], 'inventory.product.delete'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [deletedItem] = await req.db!
        .delete(products)
        .where(eq(products.id, id))
        .returning();

      if (!deletedItem) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

export default router;