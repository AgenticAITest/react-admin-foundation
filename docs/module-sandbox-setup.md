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

## 🔄 Setup Options

### Option 1: Create New Replit Project (Recommended)

This approach creates a completely separate development environment.

#### Step 1: Create New Sandbox Project

1. **In Replit Dashboard:**
   - Click "Create" → "New Repl"
   - Choose "Node.js" template
   - Name it: `module-sandbox-template`

2. **Connect to New GitHub Repository:**
   - In Replit project, open Version Control panel
   - Click "Create new repository"
   - Repository name: `module-sandbox-template`
   - Set as public/private as needed

#### Step 2: Copy Sandbox Structure

Copy these components from your foundation repository to the new sandbox project:

```
📁 Clean Plugin Architecture:
├── server/
│   └── index.ts            # Pure plugin with business logic (MAIN FOCUS)
├── sandbox/
│   ├── bootstrap.ts        # Database initialization
│   ├── rbac.ts            # Permission system
│   ├── server.ts          # Infrastructure server
│   └── withTenantTx.ts    # Database helpers
├── client/
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks
│   │   ├── lib/           # Utilities
│   │   ├── provider/      # Context providers
│   │   ├── main.tsx       # React app entry
│   │   └── styles.css     # Styling
│   └── index.html         # HTML template
├── shared/
│   └── schema.ts          # Database schema
├── vite.config.ts         # Vite proxy configuration
├── .env.example          # Environment variables template
├── package.json          # Dependencies
└── README.md             # Setup instructions
```

#### Step 3: Install Dependencies

Create `package.json` with sandbox-specific dependencies:

```json
{
  "name": "module-sandbox-template",
  "version": "1.0.0",
  "description": "Module development sandbox for React Admin Foundation",
  "scripts": {
    "dev:api": "tsx sandbox/server.ts",
    "dev:web": "vite --port 5173",
    "dev": "concurrently -k -n api,web -c blue,green \"npm:dev:api\" \"npm:dev:web\"",
    "build": "vite build",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@types/express": "^5.0.1",
    "@types/node": "^22.15.2",
    "drizzle-orm": "^0.44.4",
    "express": "^5.1.0",
    "pg": "^8.16.3",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "tsx": "^4.20.3",
    "typescript": "^5.8.3",
    "vite": "^6.3.3",
    "concurrently": "^9.1.0"
  },
  "devDependencies": {
    "@types/pg": "^8.15.5",
    "@vitejs/plugin-react": "^4.4.1",
    "drizzle-kit": "^0.31.4"
  }
}
```

### Option 2: Download and Manual Setup

If you prefer to work outside Replit initially:

#### Step 1: Download Components

From your current foundation project:
1. Download the `sandbox/` folder
2. Download the `client/` folder  
3. Download the `shared/` folder (schema.ts)
4. Download configuration files (vite.config.ts, tsconfig.json, .env.example)

#### Step 2: Create GitHub Repository

1. **Create new repository on GitHub:**
   ```
   Repository name: module-sandbox-template
   Description: Module development sandbox for React Admin Foundation
   Public/Private: Your choice
   ```

2. **Upload files to repository:**
   - Upload downloaded folders
   - Add package.json with dependencies
   - Create README.md with setup instructions

#### Step 3: Connect to Replit

1. In Replit, choose "Import from GitHub"
2. Select your new `module-sandbox-template` repository
3. Replit will automatically set up the environment

## 🚀 Development Workflow

### Initial Setup

1. **Clone/Open the Sandbox Repository:**
   ```bash
   # If working locally
   git clone https://github.com/your-username/module-sandbox-template
   cd module-sandbox-template
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create `.env` file from template:
   ```bash
   cp .env.example .env
   ```
   
   Set required variables:
   ```bash
   DATABASE_URL=postgresql://username:password@host:port/database
   DEV_TENANT_CODE=dev
   DEV_TENANT_SCHEMA=main
   PORT=8787
   ```

4. **Initialize Database:**
   ```bash
   npm run db:push
   ```

### Module Development Process

#### Phase 1: Setup New Module

1. **Replace Module ID:**
   - Update `MODULE_ID` constant in `server/index.ts`
   - Example: Change `'sample'` to `'inventory'`, `'orders'`, `'products'`, etc.

2. **Customize Database Schema:**
   ```typescript
   // In shared/schema.ts - add your module tables (NO tenantId needed)
   export const inventory = pgTable('inventory', {
     id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
     name: varchar("name", { length: 255 }).notNull(),
     quantity: integer("quantity").default(0),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```

3. **Implement Plugin Business Logic:**
   ```typescript
   // In server/index.ts - your pure plugin implementation
   const plugin = {
     meta: { id: 'inventory', version: '0.1.0', api: '1.x' },
     
     async register(ctx: PluginContext) {
       // Add your CRUD endpoints using ctx.router, ctx.rbac, ctx.withTenantTx
       ctx.router.get('/items', ctx.rbac.require('inventory.items.read'), async (req: any, res) => {
         const rows = await ctx.withTenantTx(req.auth?.tenant_id, async (db) => {
           const r = await db.execute('select * from items order by created_at desc');
           return (r as any).rows ?? r;
         });
         res.json(rows);
       });
       
       ctx.log('registered');
     },
   };
   
   export const permissions = ['inventory.items.read', 'inventory.items.create'];
   export default plugin;
   ```

#### Phase 2: Develop Features

1. **Start Development Servers:**
   ```bash
   # Start both servers together (recommended)
   npm run dev
   
   # Or start separately in two terminals
   npm run dev:api     # API server on port 8787
   npm run dev:web     # Vite dev server on port 5173
   ```

2. **Access Development Interface:**
   - Frontend: http://localhost:5173 (Vite dev server)
   - API Health: http://localhost:8787/api/plugins/sample/health
   - Professional dashboard interface with hot reload
   - Vite proxy automatically routes `/api` calls to backend

3. **Develop Module Features:**
   - **Plugin Logic:** Implement business logic in `server/index.ts`
   - **Frontend:** Customize UI components in `client/src/`
   - **Database:** Add/modify tables in `shared/schema.ts`
   - **Infrastructure:** Sandbox handles permissions, auth, hosting

#### Phase 3: Test and Validate

1. **RBAC Testing:**
   - Use the Permissions section to validate access control
   - Test different permission combinations
   - Verify UI shows/hides elements correctly

2. **Database Operations:**
   - Test CRUD operations through the dashboard
   - Verify tenant isolation works correctly
   - Check data persistence and queries

3. **API Testing:**
   - Use the health check endpoint
   - Test all API endpoints manually
   - Verify error handling and validation

#### Phase 4: Integration Back to Foundation

1. **Prepare Module for Integration:**
   ```bash
   # Copy your pure plugin implementation
   cp server/index.ts ../foundation/src/modules/inventory/
   cp -r client/src/ ../foundation/src/client/modules/inventory/
   cp shared/schema.ts ../foundation/src/modules/inventory/schema.ts
   ```

2. **Update Foundation Application:**
   - Add module routes to main application
   - Update navigation menus with new module
   - Integrate RBAC permissions into main system
   - Run database migrations if schema changed

3. **Clean Integration:**
   - Test module within main application
   - Verify tenant isolation still works
   - Confirm RBAC integration is seamless
   - Update documentation and user guides

## 🔧 Configuration Details

### Environment Variables

Required environment variables for sandbox operation:

```bash
# Database (automatically configured in Replit)
DATABASE_URL=postgresql://username:password@host:port/database

# Sandbox Development Settings
DEV_TENANT_CODE=dev
DEV_TENANT_SCHEMA=tenant_dev
PORT=8787

# Optional settings
NODE_ENV=development
```

### Module Customization

#### Clean Plugin Pattern

The core of your module is the plugin in `server/index.ts`:

```typescript
// Module metadata
export const meta = {
  id: 'your-module',  // ← Change this ID
  name: 'Your Module',
  version: '0.1.0'
};

// Plugin registration with dependency injection
export const register = (ctx: PluginContext) => {
  // Use ctx.router for routes
  // Use ctx.rbac.require() for permissions
  // Use ctx.withTenantTx() for database operations
  // Use ctx.log for logging
};
```

#### Add Custom Business Logic

**Database Schema (shared/schema.ts):**
```typescript
// Schema-per-tenant: NO tenantId column needed - isolation via search_path
export const yourModuleTable = pgTable('your_module', {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  // Add your specific fields here
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Plugin Implementation (server/index.ts):**
```typescript
const plugin = {
  meta: { id: 'your-module', version: '0.1.0', api: '1.x' },
  
  async register(ctx: PluginContext) {
    // CRUD endpoints with proper dependency injection
    ctx.router.get('/items', ctx.rbac.require('your-module.items.read'), async (req: any, res) => {
      const rows = await ctx.withTenantTx(req.auth?.tenant_id, async (db) => {
        const r = await db.execute('select id, name, created_at from items order by created_at desc');
        return (r as any).rows ?? r;
      });
      res.json(rows);
    });
    
    ctx.router.post('/items', ctx.rbac.require('your-module.items.create'), async (req: any, res) => {
      const { name } = req.body ?? {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'NAME_REQUIRED' });
      const row = await ctx.withTenantTx(req.auth?.tenant_id, async (db) => {
        const r = await db.execute('insert into items (name) values ($1) returning id, name, created_at', [name]);
        return ((r as any).rows ?? r)[0];
      });
      res.status(201).json(row);
    });
    
    ctx.log('registered');
  },
};

export default plugin;
```

**UI Components (client/src/main.tsx):**
```typescript
// Customize the dashboard sections
// Add your module-specific UI components
// Implement your business workflows
```

## 📝 Best Practices

### Development Guidelines

1. **Schema-per-Tenant Isolation:**
   ```typescript
   // NO manual tenant filtering needed - isolation via search_path
   const items = await ctx.withTenantTx(req.auth?.tenant_id, async (db) => {
     const r = await db.execute('select * from your_table order by created_at desc');
     return (r as any).rows ?? r;
   });
   ```

2. **Implement Proper RBAC:**
   ```typescript
   // Define granular permissions
   'your-module.items.read'
   'your-module.items.create'
   'your-module.items.update'
   'your-module.items.delete'
   'your-module.admin'
   ```

3. **Follow UI Patterns:**
   - Use the same component structure as the dashboard
   - Implement consistent styling and interactions
   - Follow the permission-based visibility patterns

4. **Test Thoroughly:**
   - Test all CRUD operations
   - Verify permission enforcement
   - Validate tenant isolation
   - Check error handling

### Code Organization

```
📁 Clean Plugin Architecture:
├── Pure Plugin (server/index.ts)        # ← YOUR MAIN FOCUS
├── Database Schema (shared/schema.ts)    # ← Define your tables
├── Frontend Components (client/src/)     # ← Build your UI
├── Infrastructure (sandbox/)             # ← Managed by system
│   ├── bootstrap.ts                     #   Database initialization
│   ├── rbac.ts                         #   Permission system
│   ├── server.ts                       #   Hosting infrastructure
│   └── withTenantTx.ts                 #   Database helpers
└── Development (vite.config.ts)         # ← Proxy configuration
```

## 🚨 Common Issues and Solutions

### Database Driver Conflicts

**Problem:** "Cannot resolve module 'postgres'" or driver conflicts
**Solution:** Use only `pg` with `drizzle-orm/node-postgres` - Remove `postgres` (Postgres.js) from dependencies

### Schema-per-Tenant Errors

**Problem:** "tenantId column not found" in tenant schema tables
**Solution:** Remove `tenantId` columns from tables in tenant schemas - isolation is done by `search_path`

### Plugin Contract Mismatches

**Problem:** Plugin not registering or imports failing
**Solution:** Ensure `export default plugin` with `meta: { id, version, api: '1.x' }` and `export const permissions`

### Development Server Issues

**Problem:** Vite proxy not routing API calls
**Solution:** Verify API server runs on port 8787 and Vite proxies `/api` correctly

### Permission Seeding Failures

**Problem:** RBAC permissions not working
**Solution:** Check `plugin.permissions` export and `seedPermissions()` call in sandbox/server.ts

## 📚 Sanity Checklist

Before considering your sandbox complete, verify:

1. **✅ Health Endpoint:** `GET /api/plugins/sample/health` → `200 { ok: true }`
2. **✅ Bootstrap Success:** First run creates `public.sys_tenant`, `tenant_dev` schema, `items` table, and RBAC tables
3. **✅ API Operations:** `GET /api/plugins/sample/items` → `200` (permissions seeded for user 'dev')
4. **✅ React Integration:** Frontend loads and can add/list items via proxy
5. **✅ Schema Compliance:** No `tenantId` columns inside tenant schema tables
6. **✅ Plugin Contract:** Default export with `meta`, `register()`, and `permissions` export
7. **✅ Development Flow:** Both servers start with `npm run dev`

## 💡 Production-Ready Patterns

- **Plugin Contract:** Always use `export default { meta, register }` + `export const permissions`
- **Database Access:** Use `req.auth.tenant_id` and `ctx.withTenantTx()` for proper tenant isolation
- **Error Handling:** Return structured errors (`{ error: 'CODE' }`) with proper HTTP status codes
- **Schema Design:** No `tenantId` in tenant schema tables - isolation via `search_path`
- **Permission Naming:** Use `module-id.resource.action` format (e.g., `inventory.items.read`)
- **Development Flow:** Use `npm run dev` for concurrent API + web servers with hot reload
- **Foundation Integration:** Copy `server/index.ts` directly to main application module structure

## 🔗 Related Documentation

- [React Admin Foundation Architecture](./architecture.md)
- [RBAC Implementation Guide](./rbac-guide.md)
- [Database Schema Guidelines](./database-guidelines.md)
- [Module Integration Process](./module-integration.md)

---

**Ready to build your first module?** Follow this guide to set up your sandbox environment and start developing professional business modules with confidence!