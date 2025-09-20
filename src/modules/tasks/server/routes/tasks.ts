import { Router } from 'express';
import { asc, count, desc, eq, ilike } from 'drizzle-orm';
import { authenticated, authorized } from '../../../../server/middleware/authMiddleware';
import { validateData } from '../../../../server/middleware/validationMiddleware';
import { taskManagementSchema, taskManagementEditSchema } from '../schemas/taskManagementSchema';
import { taskManagements } from '../../../../server/lib/db/schema/modules/tasks';

const router = Router();

// All routes require authentication
router.use(authenticated());

// GET /task-managements - List all task managements
router.get("/task-managements", 
  authorized(['SYSADMIN', 'USER'], 'tasks.task_management.view'), 
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
      ? ilike(taskManagements.name, `%${filterParam}%`)
      : undefined;

    let countQuery = req.db!
      .select({ value: count() })
      .from(taskManagements);
    if (filterCondition) {
      countQuery = countQuery.where(filterCondition);
    }
    const [{ value: total }] = await countQuery;

    const validSortColumns = ['name', 'createdAt', 'updatedAt', 'id'] as const;
    const sortKey = validSortColumns.includes(sortParam as any) ? sortParam : 'name';
    
    let itemsQuery = req.db!
      .select()
      .from(taskManagements);
    if (filterCondition) {
      itemsQuery = itemsQuery.where(filterCondition);
    }
    
    let sortColumn;
    switch (sortKey) {
      case 'name':
        sortColumn = taskManagements.name;
        break;
      case 'createdAt':
        sortColumn = taskManagements.createdAt;
        break;
      case 'updatedAt':
        sortColumn = taskManagements.updatedAt;
        break;
      default:
        sortColumn = taskManagements.id;
        break;
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

// POST /task-managements - Create new task management
router.post("/task-managements",
  authorized(['SYSADMIN', 'USER'], 'tasks.task_management.add'),
  validateData(taskManagementSchema),
  async (req, res) => {
    try {
      const { name, description } = req.body;

      const newItem = await req.db!
        .insert(taskManagements)
        .values({
          name,
          description,
        })
        .returning();

      res.status(201).json(newItem[0]);
    } catch (error) {
      console.error('Error creating task management:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /task-managements/:id - Get specific task management
router.get("/task-managements/:id",
  authorized(['SYSADMIN', 'USER'], 'tasks.task_management.view'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const item = await req.db!
        .select()
        .from(taskManagements)
        .where(eq(taskManagements.id, id))
        .limit(1);

      if (item.length === 0) {
        return res.status(404).json({ error: 'Task management not found' });
      }

      res.json(item[0]);
    } catch (error) {
      console.error('Error fetching task management:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /task-managements/:id - Update task management
router.put("/task-managements/:id",
  authorized(['SYSADMIN', 'USER'], 'tasks.task_management.edit'),
  validateData(taskManagementEditSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const updatedItem = await req.db!
        .update(taskManagements)
        .set({
          name,
          description,
          updatedAt: new Date(),
        })
        .where(eq(taskManagements.id, id))
        .returning();

      if (updatedItem.length === 0) {
        return res.status(404).json({ error: 'Task management not found' });
      }

      res.json(updatedItem[0]);
    } catch (error) {
      console.error('Error updating task management:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /task-managements/:id - Delete task management
router.delete("/task-managements/:id",
  authorized(['SYSADMIN', 'USER'], 'tasks.task_management.delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const deletedItem = await req.db!
        .delete(taskManagements)
        .where(eq(taskManagements.id, id))
        .returning();

      if (deletedItem.length === 0) {
        return res.status(404).json({ error: 'Task management not found' });
      }

      res.json({ message: 'Task management deleted successfully' });
    } catch (error) {
      console.error('Error deleting task management:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;