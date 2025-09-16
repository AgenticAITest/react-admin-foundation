export interface TemplateOptions {
  moduleName: string;
  entityName: string;
  fields?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    required?: boolean;
    unique?: boolean;
  }>;
}

export const generateCrudModule = (options: TemplateOptions) => {
  const { moduleName, entityName, fields = [] } = options;
  const entityNameLower = entityName.toLowerCase();
  const entityNameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const entityNamePlural = `${entityNameLower}s`;

  const modulePermissions = [
    `${moduleName}.${entityNamePlural}.view`,
    `${moduleName}.${entityNamePlural}.add`, 
    `${moduleName}.${entityNamePlural}.edit`,
    `${moduleName}.${entityNamePlural}.delete`
  ];

  return {
    // Module configuration
    config: `
export const ${entityNameCamel}Module = {
  id: "${moduleName}",
  name: "${entityName} Management",
  version: "1.0.0",
  description: "Complete ${entityName.toLowerCase()} management system",
  author: "Module Generator",
  
  dependencies: [],
  compatibleVersions: ["1.0.0"],
  permissions: [
    "${moduleName}.${entityNamePlural}.view",
    "${moduleName}.${entityNamePlural}.add", 
    "${moduleName}.${entityNamePlural}.edit",
    "${moduleName}.${entityNamePlural}.delete"
  ],
  roles: ["SYSADMIN", "USER"],
  
  database: {
    tables: ["${entityNamePlural}"],
    requiresSeeding: true
  },
  
  apiRoutes: {
    prefix: "/api/${moduleName}",
    endpoints: [
      { path: "/${entityNamePlural}", methods: ["GET", "POST"] },
      { path: "/${entityNamePlural}/:id", methods: ["GET", "PUT", "DELETE"] }
    ]
  },
  
  navigation: {
    section: "Business",
    items: [
      { 
        path: "/console/${moduleName}/${entityNamePlural}", 
        label: "${entityName}s", 
        icon: "Package",
        permissions: ["${moduleName}.${entityNamePlural}.view"]
      }
    ]
  },
  
  features: {
    export: true,
    import: true,
    advancedFiltering: true
  },
  settings: {}
};

export default ${entityNameCamel}Module;`,

    // Database schema using existing patterns
    schema: `
import { pgTable, uuid, varchar, timestamp, boolean, uniqueIndex, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

// Clean table definition - foundation handles tenant isolation
export const ${entityNamePlural} = pgTable('${entityNamePlural}', {
  id: uuid('id').primaryKey().default(sql\`gen_random_uuid()\`),
  
  // Core business fields
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  
  ${fields.map(field => {
    switch (field.type) {
      case 'string':
        return `${field.name}: varchar('${field.name}', { length: 255 })${field.required ? '.notNull()' : ''},`;
      case 'number':
        return `${field.name}: integer('${field.name}')${field.required ? '.notNull()' : ''},`;
      case 'boolean':
        return `${field.name}: boolean('${field.name}').default(false),`;
      case 'date':
        return `${field.name}: timestamp('${field.name}')${field.required ? '.notNull()' : ''},`;
      default:
        return `${field.name}: varchar('${field.name}', { length: 255 }),`;
    }
  }).join('\n  ')}
  
  // Standard audit fields
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  uniqueIndex("${entityNamePlural}_name_idx").on(t.name),
]);

// Relations (add as needed)
export const ${entityNamePlural}Relations = relations(${entityNamePlural}, ({ one, many }) => ({
  // Add relations to other entities here
}));`,

    // API routes leveraging existing middleware and patterns
    routes: `
import { Router } from 'express';
import { asc, count, desc, eq, ilike } from 'drizzle-orm';
import { authenticated, authorized } from '../../../server/middleware/authMiddleware';
import { validateData } from '../../../server/middleware/validationMiddleware';
import { ${entityNameCamel}Schema, ${entityNameCamel}EditSchema } from '../schemas/${entityNameCamel}Schema';
import { ${entityNamePlural} } from '../database/schema';

const ${entityNameCamel}Router = Router();

// All routes require authentication (using existing middleware)
${entityNameCamel}Router.use(authenticated());

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}:
 *   get:
 *     tags:
 *       - ${entityName} Management
 *     summary: Get ${entityName.toLowerCase()}s
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.get("/", 
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.view'), 
  async (req, res) => {
    // Use existing pagination pattern
    const pageParam = req.query.page as string | undefined;
    const perPageParam = req.query.perPage as string | undefined;
    const sortParam = (req.query.sort as string) || 'name';
    const orderParam = (req.query.order as 'asc' | 'desc') || 'asc';
    const filterParam = (req.query.filter as string) || '';

    const page = pageParam ? parseInt(pageParam) : 1;
    const perPage = perPageParam ? parseInt(perPageParam) : 10;
    const offset = (page - 1) * perPage;

    // Build filter condition (leverage existing patterns)
    const filterCondition = filterParam
      ? ilike(${entityNamePlural}.name, \`%\${filterParam}%\`)
      : undefined;

    // Get total count
    let countQuery = req.db!
      .select({ value: count() })
      .from(${entityNamePlural});
    if (filterCondition) {
      countQuery = countQuery.where(filterCondition);
    }
    const [{ value: total }] = await countQuery;

    // Get items with sorting
    const validSortColumns = ['name', 'createdAt', 'updatedAt', 'id'] as const;
    const sortKey = validSortColumns.includes(sortParam as any) ? sortParam : 'name';
    const sortColumn = ${entityNamePlural}[sortKey as keyof typeof ${entityNamePlural}];
    let itemsQuery = req.db!
      .select()
      .from(${entityNamePlural});
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

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}:
 *   post:
 *     tags:
 *       - ${entityName} Management
 *     summary: Create ${entityName.toLowerCase()}
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.post("/",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.add'),
  validateData(${entityNameCamel}Schema),
  async (req, res) => {
    try {
      const [newItem] = await req.db!
        .insert(${entityNamePlural})
        .values(req.body)
        .returning();

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}/{id}:
 *   get:
 *     tags:
 *       - ${entityName} Management
 *     summary: Get ${entityName.toLowerCase()} by ID
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.get("/:id",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.view'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [item] = await req.db!
        .select()
        .from(${entityNamePlural})
        .where(eq(${entityNamePlural}.id, id))
        .limit(1);

      if (!item) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}/{id}:
 *   put:
 *     tags:
 *       - ${entityName} Management
 *     summary: Update ${entityName.toLowerCase()}
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.put("/:id",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.edit'),
  validateData(${entityNameCamel}EditSchema),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [updatedItem] = await req.db!
        .update(${entityNamePlural})
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(${entityNamePlural}.id, id))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

/**
 * @swagger
 * /api/${moduleName}/${entityNamePlural}/{id}:
 *   delete:
 *     tags:
 *       - ${entityName} Management
 *     summary: Delete ${entityName.toLowerCase()}
 *     security:
 *       - bearerAuth: []
 */
${entityNameCamel}Router.delete("/:id",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.delete'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [deletedItem] = await req.db!
        .delete(${entityNamePlural})
        .where(eq(${entityNamePlural}.id, id))
        .returning();

      if (!deletedItem) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json({ message: "${entityName} deleted successfully" });
    } catch (error) {
      console.error("Error deleting ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

export default ${entityNameCamel}Router;`,

    // Router file for automatic loading by RouteRegistry
    routerIndex: `
// Router entry point for module '${moduleName}'
// This file is automatically loaded by the RouteRegistry
export { default } from './${entityNameCamel}Router';`,

    // Router file (alternative location)
    routerFile: `
import { Router } from 'express';
import { asc, count, desc, eq, ilike } from 'drizzle-orm';
import { authenticated, authorized } from '../../../server/middleware/authMiddleware';
import { validateData } from '../../../server/middleware/validationMiddleware';
import { ${entityNameCamel}Schema, ${entityNameCamel}EditSchema } from '../schemas/${entityNameCamel}Schema';
import { ${entityNamePlural} } from '../database/schema';

const router = Router();

// All routes require authentication
router.use(authenticated());

// GET /${entityNamePlural} - List all ${entityNamePlural}
router.get("/", 
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.view'), 
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
      ? ilike(${entityNamePlural}.name, \`%\${filterParam}%\`)
      : undefined;

    let countQuery = req.db!
      .select({ value: count() })
      .from(${entityNamePlural});
    if (filterCondition) {
      countQuery = countQuery.where(filterCondition);
    }
    const [{ value: total }] = await countQuery;

    const validSortColumns = ['name', 'createdAt', 'updatedAt', 'id'] as const;
    const sortKey = validSortColumns.includes(sortParam as any) ? sortParam : 'name';
    const sortColumn = ${entityNamePlural}[sortKey as keyof typeof ${entityNamePlural}];
    let itemsQuery = req.db!
      .select()
      .from(${entityNamePlural});
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

// POST /${entityNamePlural} - Create new ${entityName.toLowerCase()}
router.post("/",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.add'),
  validateData(${entityNameCamel}Schema),
  async (req, res) => {
    try {
      const [newItem] = await req.db!
        .insert(${entityNamePlural})
        .values(req.body)
        .returning();

      res.status(201).json(newItem);
    } catch (error) {
      console.error("Error creating ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// GET /${entityNamePlural}/:id - Get ${entityName.toLowerCase()} by ID
router.get("/:id",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.view'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [item] = await req.db!
        .select()
        .from(${entityNamePlural})
        .where(eq(${entityNamePlural}.id, id))
        .limit(1);

      if (!item) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// PUT /${entityNamePlural}/:id - Update ${entityName.toLowerCase()}
router.put("/:id",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.edit'),
  validateData(${entityNameCamel}EditSchema),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [updatedItem] = await req.db!
        .update(${entityNamePlural})
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(eq(${entityNamePlural}.id, id))
        .returning();

      if (!updatedItem) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// DELETE /${entityNamePlural}/:id - Delete ${entityName.toLowerCase()}
router.delete("/:id",
  authorized(['SYSADMIN', 'USER'], '${moduleName}.${entityNamePlural}.delete'),
  async (req, res) => {
    const { id } = req.params;

    try {
      const [deletedItem] = await req.db!
        .delete(${entityNamePlural})
        .where(eq(${entityNamePlural}.id, id))
        .returning();

      if (!deletedItem) {
        return res.status(404).json({ error: "${entityName} not found" });
      }

      res.json({ message: "${entityName} deleted successfully" });
    } catch (error) {
      console.error("Error deleting ${entityName.toLowerCase()}:", error);
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

export default router;`,

    // Frontend component using existing UI patterns
    component: `
import React from 'react';
import { DataPagination } from '../../../../components/console/DataPagination';
import Authorized from '../../../../components/auth/Authorized';
import { Button } from '../../../../components/ui/button';
import { Plus } from 'lucide-react';

const ${entityName}sPage = () => {
  const columns = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "description", 
      header: "Description",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }: any) => (
        <span className={\`px-2 py-1 rounded-full text-xs \${
          row.getValue("isActive") 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800"
        }\`}>
          {row.getValue("isActive") ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }: any) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString();
      },
    },
  ];

  return (
    <Authorized permissions={["${moduleName}.${entityNamePlural}.view"]}>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">${entityName}s</h1>
          <Authorized permissions={["${moduleName}.${entityNamePlural}.add"]}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add ${entityName}
            </Button>
          </Authorized>
        </div>
        
        <DataPagination
          endpoint="/api/${moduleName}/${entityNamePlural}"
          columns={columns}
          searchable={true}
          filterable={true}
        />
      </div>
    </Authorized>
  );
};

export default ${entityName}sPage;`,

    // Validation schemas
    schemas: `
import { z } from 'zod';

export const ${entityNameCamel}Schema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(500).optional(),
  ${fields.map(field => {
    switch (field.type) {
      case 'string':
        return `${field.name}: z.string()${field.required ? '' : '.optional()'}${field.name === 'email' ? '.email()' : ''},`;
      case 'number':
        return `${field.name}: z.number()${field.required ? '' : '.optional()'},`;
      case 'boolean':
        return `${field.name}: z.boolean().default(false),`;
      case 'date':
        return `${field.name}: z.string().datetime()${field.required ? '' : '.optional()'},`;
      default:
        return `${field.name}: z.string()${field.required ? '' : '.optional()'},`;
    }
  }).join('\n  ')}
});

export const ${entityNameCamel}EditSchema = ${entityNameCamel}Schema.extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export type ${entityName} = z.infer<typeof ${entityNameCamel}Schema>;
export type ${entityName}Edit = z.infer<typeof ${entityNameCamel}EditSchema>;`,

    // Automatic permission integration metadata
    metadata: {
      moduleId: moduleName,
      permissions: modulePermissions,
      requiresPermissionIntegration: true
    }
  };
};

/**
 * Generate a CRUD module with automatic permission integration
 */
export const generateCrudModuleWithIntegration = async (options: TemplateOptions) => {
  // Import permission integrator
  const { PermissionIntegrator } = await import('../lib/permission-integrator');
  
  const moduleConfig = generateCrudModule(options);
  
  // Automatically integrate permissions into the system
  if (moduleConfig.metadata.requiresPermissionIntegration) {
    try {
      await PermissionIntegrator.integrateModule(
        moduleConfig.metadata.moduleId,
        moduleConfig.metadata.permissions
      );
      
      console.log(`✅ Module '${moduleConfig.metadata.moduleId}' generated with integrated permissions`);
    } catch (error) {
      console.error(`❌ Failed to integrate permissions for module '${moduleConfig.metadata.moduleId}':`, error);
      console.log('ℹ️  You may need to manually run permission integration later');
    }
  }
  
  return moduleConfig;
};