# Module Sandbox Setup Guide

## Overview

The Module Sandbox provides a complete isolated development environment for creating and testing business modules before integrating them into the main React Admin Foundation. This guide explains how to set up a separate repository for independent module development.

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
📁 Sandbox Repository Structure:
├── sandbox/
│   ├── bootstrap.ts         # Database initialization
│   ├── rbac.ts             # Permission system
│   ├── server.ts           # Module server
│   └── withTenantTx.ts     # Database helpers
├── client/
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── lib/            # Utilities
│   │   ├── provider/       # Context providers
│   │   ├── main.tsx        # React app entry
│   │   └── styles.css      # Styling
│   └── index.html          # HTML template
├── db/
│   ├── client.ts           # Database client
│   └── schema.ts           # Database schema
├── package.json            # Dependencies
└── README.md               # Setup instructions
```

#### Step 3: Install Dependencies

Create `package.json` with sandbox-specific dependencies:

```json
{
  "name": "module-sandbox-template",
  "version": "1.0.0",
  "description": "Module development sandbox for React Admin Foundation",
  "scripts": {
    "dev": "tsx sandbox/server.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "cors": "^2.8.5",
    "drizzle-orm": "^0.29.0",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "postgres": "^3.4.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tsx": "^4.6.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9",
    "drizzle-kit": "^0.20.4"
  }
}
```

### Option 2: Download and Manual Setup

If you prefer to work outside Replit initially:

#### Step 1: Download Components

From your current foundation project:
1. Download the `sandbox/` folder
2. Download the `client/` folder
3. Download the `db/` folder (client.ts and schema.ts)

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
   - Set `DATABASE_URL` environment variable
   - Database will be automatically configured in Replit

4. **Initialize Database:**
   ```bash
   npm run db:push
   ```

### Module Development Process

#### Phase 1: Setup New Module

1. **Replace Module Placeholder:**
   - Find and replace `<module-id>` throughout the codebase
   - Example: Replace with `inventory`, `orders`, `products`, etc.

2. **Customize Database Schema:**
   ```typescript
   // In db/schema.ts - add your module tables
   export const inventory = pgTable('inventory', {
     id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
     name: varchar("name", { length: 255 }).notNull(),
     quantity: integer("quantity").default(0),
     tenantId: varchar("tenant_id").notNull(),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```

3. **Update API Endpoints:**
   ```typescript
   // In sandbox/server.ts - customize your business logic
   app.get('/api/plugins/inventory/items', async (req, res) => {
     // Your module-specific logic here
   });
   ```

#### Phase 2: Develop Features

1. **Start Development Server:**
   ```bash
   npm run dev
   ```

2. **Access Development Interface:**
   - Open browser to Replit preview URL
   - Professional dashboard interface loads automatically
   - Test RBAC permissions in real-time

3. **Develop Module Features:**
   - **Backend:** Add business logic to server endpoints
   - **Frontend:** Customize UI components in client/src/
   - **Database:** Add/modify tables in schema
   - **Permissions:** Define and test RBAC rules

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
   # Copy your completed module files
   cp -r sandbox/server.ts ../foundation/src/modules/inventory/
   cp -r client/src/ ../foundation/src/client/modules/inventory/
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

# Optional development settings
NODE_ENV=development
PORT=5000
```

### Module Customization

#### Replace Module ID

Find and replace these patterns throughout the codebase:

```typescript
// File paths and API routes
'/api/plugins/<module-id>/' → '/api/plugins/your-module/'

// Permission strings  
'<module-id>.items.read' → 'your-module.items.read'

// UI text and titles
'<module-id> Sandbox' → 'Your Module Sandbox'
```

#### Add Custom Business Logic

**Database Schema (db/schema.ts):**
```typescript
export const yourModuleTable = pgTable('your_module', {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Add your specific fields
  tenantId: varchar("tenant_id").notNull(), // Always include for isolation
  createdAt: timestamp("created_at").defaultNow(),
});
```

**API Endpoints (sandbox/server.ts):**
```typescript
// Add your module-specific endpoints
app.get('/api/plugins/your-module/custom-endpoint', requirePerm('your-module.custom.read'), async (req, res) => {
  // Your business logic here
});
```

**UI Components (client/src/main.tsx):**
```typescript
// Customize the dashboard sections
// Add your module-specific UI components
// Implement your business workflows
```

## 📝 Best Practices

### Development Guidelines

1. **Always Use Tenant Isolation:**
   ```typescript
   // Always filter by tenant in database queries
   const items = await db.select()
     .from(yourTable)
     .where(eq(yourTable.tenantId, req.user.activeTenantId));
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
📁 Recommended Module Structure:
├── Business Logic (sandbox/server.ts)
├── Database Schema (db/schema.ts) 
├── Frontend Components (client/src/)
├── RBAC Permissions (sandbox/rbac.ts)
└── Integration Tests
```

## 🚨 Common Issues and Solutions

### Database Connection Issues

**Problem:** `DATABASE_URL` not found
**Solution:** Ensure environment variable is set in Replit secrets

### Permission Errors

**Problem:** UI elements not showing/hiding correctly
**Solution:** Check permission strings match exactly in both backend and frontend

### Module Integration Issues

**Problem:** Module doesn't work when copied to foundation
**Solution:** Ensure all dependencies are included and paths are updated

### RBAC Testing Issues

**Problem:** Permissions not working as expected
**Solution:** Verify user has correct role and permissions are seeded properly

## 📚 Next Steps

After setting up your module sandbox:

1. **Start with Simple CRUD:** Create basic Create, Read, Update, Delete operations
2. **Add Business Logic:** Implement your specific business requirements
3. **Test RBAC Thoroughly:** Ensure proper access control at all levels
4. **Polish the UI:** Make it consistent with the main application
5. **Document Your Module:** Create usage and integration documentation
6. **Integrate to Foundation:** Copy your working module back to the main system

## 💡 Tips for Success

- **Start Small:** Begin with simple operations and gradually add complexity
- **Use the Dashboard:** The professional interface helps visualize your module
- **Test Permissions:** Use the RBAC testing interface extensively
- **Follow Patterns:** Stick to the established patterns for consistency
- **Document Changes:** Keep track of what you modify for easier integration

## 🔗 Related Documentation

- [React Admin Foundation Architecture](./architecture.md)
- [RBAC Implementation Guide](./rbac-guide.md)
- [Database Schema Guidelines](./database-guidelines.md)
- [Module Integration Process](./module-integration.md)

---

**Ready to build your first module?** Follow this guide to set up your sandbox environment and start developing professional business modules with confidence!