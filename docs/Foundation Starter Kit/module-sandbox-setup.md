# Module Sandbox Setup Guide

## Overview

The Module Sandbox provides a complete isolated development environment for creating and testing business modules using a clean plugin architecture. This system enables business analysts to develop functional modules with AI assistance while maintaining proper separation of concerns and production-ready patterns.

## 🎯 Why Use a Separate Repository?

**Benefits:**
- ✅ **Independent Development** - Work on modules without affecting the foundation
- ✅ **Clean Separation** - Sandbox stays isolated for experimentation  
- ✅ **Version Control** - Each module can have its own development history
- ✅ **Team Collaboration** - Multiple developers can work on different modules
- ✅ **Easy Integration** - Copy proven modules back to foundation
- ✅ **Turnkey Experience** - Download → extract → `npm run dev`

## 🚀 Quick Start (Recommended)

### Step 1: Download Template

1. **Download the latest template:**
   - Use `docs/module-sandbox-template-v2.zip` (33.4KB)
   - Contains all fixes and improvements from the 3-phase consistency update

2. **Extract and Setup:**
   ```bash
   # Extract template
   unzip module-sandbox-template-v2.zip
   cd module-sandbox-template
   
   # Install dependencies
   npm install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   
   # Start development (bootstrap handles database setup automatically)
   npm run dev
   ```

3. **Verify Setup:**
   - Frontend: http://localhost:5173
   - API Health: http://localhost:8787/api/plugins/sample/health → `200 { "ok": true }`
   - Sample data should load automatically

### Step 2: Customize Your Module

**Template Structure (Ready to Use):**
```
📁 Turnkey Template:
├── server/index.ts         # 🎯 YOUR MAIN FOCUS - Plugin business logic
├── sandbox/               # ✅ Infrastructure (self-sufficient)
│   ├── bootstrap.ts       # Auto-creates sys_tenant, tenant schema, tables
│   ├── rbac.ts           # Permission system with RBAC seeding
│   ├── server.ts         # CORS-enabled API server with error handling
│   └── withTenantTx.ts   # Database tenant isolation helpers
├── client/src/            # ✅ React frontend components
│   ├── components/        # Reusable UI components  
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and helpers
│   ├── provider/         # Context providers
│   ├── main.tsx          # React app entry
│   └── styles.css        # Styling
├── shared/schema.ts       # ✅ Database schema (no tenantId needed)
├── foundation-adapter/    # ✅ Integration examples for foundation
├── vite.config.ts        # ✅ CORS proxy configuration
├── tsconfig.json         # ✅ Fixed path aliases
├── .env.example          # Environment template
├── package.json          # ✅ All dependencies included
└── README.md             # Complete setup guide
```

## 🔄 Alternative Setup Options

### Option 1: Create New Replit Project

This approach creates a completely separate development environment.

1. **In Replit Dashboard:**
   - Click "Create" → "New Repl" 
   - Choose "Node.js" template
   - Name it: `my-module-sandbox`

2. **Upload Template:**
   - Download and extract `module-sandbox-template-v2.zip`
   - Upload all files to your new Replit project
   - Run `npm install` and `npm run dev`

3. **Connect to GitHub (Optional):**
   - In Replit project, open Version Control panel
   - Click "Create new repository" or connect to existing

### Option 2: Local Development

If you prefer to work locally first:

1. **Download and Extract:**
   ```bash
   # Download module-sandbox-template-v2.zip
   unzip module-sandbox-template-v2.zip
   cd module-sandbox-template
   ```

2. **Setup Environment:**
   ```bash
   npm install
   cp .env.example .env
   # Configure your DATABASE_URL
   ```

3. **Connect to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial sandbox setup"
   git remote add origin https://github.com/your-username/my-module-sandbox
   git push -u origin main
   ```

## 🛠️ Development Workflow

### Phase 1: Module Setup

1. **Customize Module ID:**
   ```typescript
   // In server/index.ts - change the module identifier
   const MODULE_ID = 'inventory'; // Change from 'sample'
   
   const plugin = {
     meta: { id: 'inventory', version: '0.1.0', api: '1.x' },
     // ... rest of plugin
   };
   ```

2. **Define Database Schema:**
   ```typescript
   // In shared/schema.ts - add your module tables
   // ✅ NO tenantId column needed - isolation via schema-per-tenant
   export const products = pgTable('products', {
     id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
     name: varchar('name', { length: 255 }).notNull(),
     description: text('description'),
     price: decimal('price', { precision: 10, scale: 2 }),
     isActive: boolean('is_active').default(true),
     createdAt: timestamp('created_at').defaultNow().notNull(),
     updatedAt: timestamp('updated_at').defaultNow().notNull(),
   });
   ```

3. **Implement Business Logic:**
   ```typescript
   // In server/index.ts - your clean plugin implementation
   const plugin = {
     meta: { id: 'inventory', version: '0.1.0', api: '1.x' },
     
     async register(ctx: PluginContext) {
       // ✅ CRUD endpoints with proper RBAC and tenant isolation
       ctx.router.get('/products', ctx.rbac.require('inventory.products.read'), async (req: any, res) => {
         const products = await ctx.withTenantTx(req.auth?.tenant_id, async (db) => {
           const result = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
           return (result as any).rows ?? result;
         });
         res.json(products);
       });
       
       ctx.router.post('/products', ctx.rbac.require('inventory.products.create'), async (req: any, res) => {
         const { name, price } = req.body ?? {};
         if (!name?.trim()) return res.status(400).json({ error: 'NAME_REQUIRED' });
         
         const product = await ctx.withTenantTx(req.auth?.tenant_id, async (db) => {
           const result = await db.execute(
             'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
             [name, price || 0]
           );
           return ((result as any).rows ?? result)[0];
         });
         res.status(201).json(product);
       });
       
       ctx.log('Inventory plugin registered successfully');
     },
   };
   
   export const permissions = [
     'inventory.products.read',
     'inventory.products.create',
     'inventory.products.update',
     'inventory.products.delete',
   ];
   export default plugin;
   ```

### Phase 2: Development & Testing

1. **Start Development Servers:**
   ```bash
   # ✅ Both servers with CORS and hot reload
   npm run dev
   
   # Access points:
   # - Frontend: http://localhost:5173 (Vite dev server)
   # - API: http://localhost:8787/api/plugins/inventory/*
   # - Health: http://localhost:8787/api/plugins/inventory/health
   ```

2. **Validate Setup:**
   - ✅ **Bootstrap Success:** Database creates `public.sys_tenant` and `tenant_dev` schema automatically
   - ✅ **Plugin Registration:** Console shows successful plugin registration
   - ✅ **RBAC Seeding:** Permissions seeded for development user
   - ✅ **API Health:** Health endpoint returns `200 { "ok": true }`
   - ✅ **Frontend Integration:** React app loads and can interact with API

3. **Develop Features:**
   - **Plugin Logic:** Focus on `server/index.ts` - your pure business logic
   - **Database:** Modify `shared/schema.ts` (changes applied on next restart)
   - **Frontend:** Customize UI in `client/src/main.tsx`
   - **Testing:** Use dashboard interface to test CRUD operations

### Phase 3: Foundation Integration

When your module is ready for production integration:

1. **Download Integration Package:**
   - Use `docs/foundation-integration-package.zip`
   - Contains adapter examples and integration documentation

2. **Copy Module Files:**
   ```bash
   # Copy your plugin to foundation
   cp server/index.ts ../foundation/src/modules/inventory/server/plugin.ts
   cp shared/schema.ts ../foundation/src/modules/inventory/schema.ts
   cp -r client/src/ ../foundation/src/client/modules/inventory/
   ```

3. **Create Foundation Adapter:**
   ```typescript
   // foundation: src/modules/inventory/server/routes/index.ts
   import { Router } from 'express';
   import plugin, { permissions as pluginPermissions } from '../../../server/plugin';
   import { withTenantTx } from '../../../../lib/db/tenant-db';
   import { requirePermission } from '../../../../lib/security/rbac';
   
   const router = Router();
   const ctx = {
     router,
     rbac: { require: (perm: string) => requirePermission(perm) },
     withTenantTx,
     log: (msg: string, meta?: object) => console.log(JSON.stringify({...}))
   };
   
   await plugin.register(ctx);
   export const permissions = pluginPermissions;
   export default router; // ← Foundation expects this export
   ```

4. **Add Module Configuration:**
   ```typescript
   // foundation: src/modules/inventory/module.config.ts
   export default {
     id: 'inventory',
     name: 'Inventory Management',
     version: '1.0.0',
     api: '1.x',
     permissions: [
       'inventory.products.read',
       'inventory.products.create',
       'inventory.products.update', 
       'inventory.products.delete',
     ],
     nav: {
       basePath: '/app/inventory',
       items: [
         { path: '/app/inventory/products', label: 'Products', permissions: ['inventory.products.read'] }
       ]
     }
   };
   ```

The foundation automatically discovers and mounts your module at `/api/plugins/inventory/*`!

## 🔧 Configuration Details

### Environment Variables

**Required Variables:**
```bash
# Database (automatically configured in Replit)
DATABASE_URL=postgresql://username:password@host:port/database

# Sandbox Settings
DEV_TENANT_CODE=dev              # Default tenant for development
DEV_TENANT_SCHEMA=tenant_dev     # Tenant schema name
PORT=8787                        # API server port (5173 for Vite)
NODE_ENV=development             # Development mode
```

### Key Architecture Improvements (v2 Template)

**✅ Phase 1 Fixes - Bootstrap Self-Sufficiency:**
- Creates `public.sys_tenant` table automatically before upserts
- CORS middleware enables smooth Vite proxy integration 
- Fixed tsconfig path aliases `@client/*` → `./client/src/*`

**✅ Phase 2 Fixes - Plugin Contract Adapter:**
- Clean `register(ctx)` authoring API preserved for business analysts
- Adapter pattern bridges plugin code to foundation Router exports
- Complete integration examples in `foundation-adapter/` directory

**✅ Phase 3 Fixes - Schema Consistency:**
- Removed `tenantId` columns from module schemas (schema-per-tenant only)
- Fixed Drizzle ORM query builder type issues
- Aligned isolation patterns between sandbox and foundation

## 🚨 Common Issues and Solutions

### Template Version

**Problem:** Using old template with bootstrap or type issues
**Solution:** Always use `docs/module-sandbox-template-v2.zip` - contains all fixes

### Database Bootstrap Errors

**Problem:** "sys_tenant table does not exist" or bootstrap failures
**Solution:** ✅ Fixed in v2 - bootstrap creates all required tables automatically

### CORS Proxy Errors

**Problem:** Frontend can't reach API, preflight request failures
**Solution:** ✅ Fixed in v2 - CORS middleware enabled in sandbox server

### Drizzle Type Errors

**Problem:** Query builder type mismatches, dynamic column selection errors
**Solution:** ✅ Fixed in v2 - proper typed query patterns implemented

### Schema-per-Tenant Issues

**Problem:** "tenantId column not found" in tenant schema tables
**Solution:** ✅ Fixed in v2 - no tenantId columns in module schemas, isolation via `search_path`

### Plugin Contract Issues

**Problem:** Plugin not registering, import/export mismatches
**Solution:** ✅ Documented in v2 - use `export default plugin` + `export const permissions`

## 📋 Verification Checklist

Before using your module in production:

1. **✅ Template Version:** Using `module-sandbox-template-v2.zip`
2. **✅ Bootstrap Success:** First run creates all database structures automatically
3. **✅ Health Endpoint:** `GET /api/plugins/[module]/health` → `200 { "ok": true }`
4. **✅ API Operations:** CRUD endpoints work with proper RBAC enforcement
5. **✅ Frontend Integration:** React app loads and communicates with API via proxy
6. **✅ Schema Compliance:** No `tenantId` columns in tenant schema tables
7. **✅ Plugin Contract:** Default export with `meta`, `register()`, `permissions` export
8. **✅ CORS Working:** No preflight errors, smooth proxy operation
9. **✅ Development Flow:** Both servers start cleanly with `npm run dev`
10. **✅ Foundation Ready:** Integration adapter examples understood and ready

## 💡 Best Practices

### Plugin Development Patterns

1. **Clean Architecture:**
   ```typescript
   // Focus on business logic in register() function
   const plugin = {
     meta: { id: 'your-module', version: '0.1.0', api: '1.x' },
     async register(ctx: PluginContext) {
       // Use dependency injection: ctx.router, ctx.rbac, ctx.withTenantTx
     },
   };
   ```

2. **Schema-per-Tenant:**
   ```typescript
   // NO tenantId columns - isolation via search_path
   export const items = pgTable('items', {
     id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
     name: varchar('name', { length: 255 }).notNull(),
     // ❌ tenantId: varchar('tenant_id') -- NOT NEEDED
   });
   ```

3. **RBAC Integration:**
   ```typescript
   // Granular permission naming
   export const permissions = [
     'module.resource.read',    // List/view operations
     'module.resource.create',  // Create operations
     'module.resource.update',  // Edit operations
     'module.resource.delete',  // Delete operations
     'module.admin',           // Administrative functions
   ];
   ```

4. **Error Handling:**
   ```typescript
   // Structured error responses
   if (!name?.trim()) {
     return res.status(400).json({ error: 'NAME_REQUIRED' });
   }
   ```

### Development Workflow

1. **Start Simple:** Use template sample module as reference
2. **Iterate Fast:** `npm run dev` provides hot reload for both API and UI
3. **Test Thoroughly:** Use dashboard interface to validate CRUD and RBAC
4. **Document Changes:** Update module README with your customizations
5. **Foundation Ready:** Use integration package when ready for production

## 🔗 Related Resources

- **Template**: `docs/module-sandbox-template-v2.zip` (turnkey development environment)
- **Integration**: `docs/foundation-integration-package.zip` (production integration examples)
- **Architecture**: Foundation schema-per-tenant design patterns
- **RBAC**: Permission-based access control implementation guide

---

**Ready to build your first module?** Download `module-sandbox-template-v2.zip`, extract, and run `npm run dev` to start developing professional business modules with confidence!