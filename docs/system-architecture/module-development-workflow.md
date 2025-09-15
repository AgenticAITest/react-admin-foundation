# Module Development Workflow

## Overview

This document outlines the complete step-by-step process for developing, testing, and deploying business modules using the plugin-based foundation. This workflow is designed for business analysts who will use AI coding tools to build modules without deep programming knowledge.

## System Architecture Decisions

### 1. Tenant Separation Strategy

**Decision: Use Schema-Per-Tenant Architecture**

**Why schema-per-tenant approach:**
- **True Data Isolation**: Physical separation prevents any cross-tenant data access
- **Superior Performance**: Each tenant has dedicated tables and indexes (50-100 tenants scale efficiently)
- **Easy Backup/Restore**: Simple per-tenant backup with `pg_dump --schema=tenant_name`
- **Enterprise Compliance**: GDPR deletion, data residency requirements easily met
- **Scalability**: Can move tenants to different databases as needed
- **Simple Development**: Business analysts write clean code without tenant complexity

**Database Architecture:**
```
Database: business_foundation
├── public (shared foundation tables)
│   ├── tenants                    # Tenant registry
│   ├── global_users               # Cross-tenant user accounts  
│   ├── system_modules             # Available modules
│   └── system_configuration       # Global settings
├── tenant_acme (tenant: acme.com)
│   ├── users                      # Tenant-specific users
│   ├── roles                      # Tenant-specific roles
│   ├── permissions                # Tenant-specific permissions
│   └── [all business module tables]
├── tenant_widget_corp (tenant: widget-corp.com)
│   └── [complete isolated copy of all tables]
└── tenant_[other_tenants]
```

**Implementation Pattern for Business Analysts:**
```typescript
// Simple, clean table definitions - NO tenant_id needed!
export const businessEntity = pgTable('business_entity', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  // ... business fields only
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  // ... other fields
}, (t) => [
  // Simple unique constraints
  uniqueIndex("business_entity_name_idx").on(t.name),
]);
```

**Foundation Abstraction Layer:**
```typescript
// Business analysts use normal queries:
const items = await req.db.select().from(businessEntity);

// Behind the scenes, foundation routes to correct tenant schema:
// SELECT * FROM tenant_acme.business_entity (for ACME tenant)
// SELECT * FROM tenant_widget.business_entity (for Widget tenant)
```

### 2. Role Hierarchy System

The system supports three levels of administration:

#### Super Admin Level
**Purpose**: System-wide management and module lifecycle
```typescript
SUPERADMIN_PERMISSIONS = [
  // Tenant Management
  'system.tenant.create',
  'system.tenant.activate', 
  'system.tenant.deactivate',
  'system.tenant.delete',
  
  // Module Management
  'system.module.install',
  'system.module.activate',
  'system.module.deactivate',
  'system.module.configure',
  
  // System Health
  'system.monitoring.view',
  'system.logs.view',
  'system.performance.view',
  
  // Global Configuration
  'system.config.edit',
  'system.backup.manage'
]
```

#### Tenant Admin Level  
**Purpose**: Tenant-specific management within their organization
```typescript
TENANT_ADMIN_PERMISSIONS = [
  // User Management (within tenant)
  'tenant.user.create',
  'tenant.user.edit',
  'tenant.user.activate',
  'tenant.user.deactivate',
  
  // Role/Permission Management (within tenant)
  'tenant.role.create',
  'tenant.role.edit',
  'tenant.permission.assign',
  
  // Module Configuration (within tenant)
  'tenant.module.configure',
  'tenant.module.settings',
  
  // Tenant Settings
  'tenant.settings.edit',
  'tenant.profile.edit'
]
```

#### Module User Level
**Purpose**: Day-to-day business operations within specific modules
```typescript
// Example for inventory module
INVENTORY_PERMISSIONS = [
  'inventory.view',
  'inventory.add',
  'inventory.edit',
  'inventory.delete',
  'inventory.reports.view'
]
```

## Complete Development Workflow

### Phase 1: Foundation Setup (One-time)

#### 1.1 Foundation Repository Setup
```bash
# Main foundation repository (maintained by you)
Repository: github.com/yourorg/business-foundation
Branch Strategy:
- main: Production-ready foundation
- develop: Integration branch for new modules
- feature/module-name: Individual module development
```

#### 1.2 Super Admin Initial Setup
1. Deploy foundation to production environment
2. Create initial super admin user account
3. Configure system-wide settings and security parameters
4. Set up monitoring and logging systems

### Phase 2: Module Development (Per Business Module)

#### 2.1 Business Analyst Gets Started
```bash
# Fork the foundation repository
git fork github.com/yourorg/business-foundation

# Clone to their AI development environment (Replit/Vercel/etc.)
git clone github.com/analyst-name/business-foundation
cd business-foundation

# Checkout develop branch for new work
git checkout develop

# Run setup script that prepares module development environment
npm run setup-module-dev
```

#### 2.2 Setup Module Development Environment
The setup script performs:
```bash
# The setup script (npm run setup-module-dev) does:
# 1. Install all dependencies
npm install

# 2. Setup local PostgreSQL database
createdb business_foundation_dev

# 3. Run foundation migrations to create base tables
npm run db:push

# 4. Seed test data (tenants, users, roles, permissions)
npm run db:seed

# 5. Start development server
npm run dev

# 6. Verify setup by checking:
# - Server runs on http://localhost:5000
# - Can login with test credentials
# - Foundation features work correctly
```

#### 2.3 Create New Module
```bash
# Use module generator with appropriate template
npm run create-module inventory crud

# This creates complete module structure:
src/modules/inventory/
├── module.config.ts          # Module metadata and configuration
├── server/
│   ├── routes/               # API endpoints
│   ├── schemas/              # Validation schemas  
│   ├── services/             # Business logic
│   └── types/                # TypeScript interfaces
├── client/
│   ├── pages/                # React pages/components
│   ├── components/           # Module-specific UI components
│   ├── hooks/                # Custom React hooks
│   └── types/                # Frontend type definitions
├── database/
│   ├── schema.ts             # Database tables & relations
│   └── seed.ts               # Initial/sample data
├── permissions/
│   └── permissions.ts        # Module permissions & roles
└── README.md                 # Module documentation
```

#### 2.4 Vibe Code with AI Assistant

**Iterative Development Process:**
1. **Requirements Analysis**: Business analyst provides module requirements document (PRD/MRD)
2. **Step-by-Step Implementation**: AI assistant builds module following established patterns
3. **Continuous Testing**: Test each feature as it's developed
4. **Foundation Integration**: Use existing UI components and backend patterns
5. **Security Implementation**: Apply tenant scoping and permission controls

**AI Assistant Guidelines:**
- Follow existing code patterns and conventions
- Use foundation components and utilities
- Write simple schemas without tenant complexity (foundation handles tenant isolation)
- Add comprehensive error handling
- Include input validation and security checks
- Generate appropriate API documentation
- Use `req.db` for all database operations (automatically tenant-scoped)

#### 2.5 Module Testing Protocol
```bash
# 1. Unit Tests - Test individual components/functions
npm run test:unit src/modules/inventory

# 2. Integration Tests - Test module integration with foundation
npm run test:integration inventory

# 3. Security Tests - Verify tenant isolation and permissions
npm run test:security inventory

# 4. Performance Tests - Check for performance issues
npm run test:performance inventory

# 5. Manual Testing Checklist:
# - All CRUD operations work correctly
# - Permission controls function properly
# - UI components render correctly
# - Data is completely isolated between tenants (schema-level isolation)
# - Error handling works as expected
# - Cross-tenant data access is impossible
```

#### 2.6 Module Submission Process
```bash
# 1. Final code cleanup and documentation
npm run lint:fix
npm run docs:generate

# 2. Run complete test suite
npm run test:all

# 3. Commit and push to feature branch
git add .
git commit -m "feat: Add inventory management module

- Complete CRUD operations for inventory items
- Category management system  
- Stock movement tracking
- Low stock alerts
- Comprehensive reporting dashboard
- Full permission integration"

git push origin feature/inventory-module

# 4. Create pull request with:
# - Detailed module description
# - Test results and coverage report
# - Demo video showing functionality
# - Documentation updates
```

### Phase 3: Module Integration (Super Admin Process)

#### 3.1 Module Review and Validation
```bash
# 1. Automated validation checks
npm run validate-module src/modules/inventory
# Checks:
# - Code follows foundation patterns
# - All required files present
# - Database schema follows conventions
# - API endpoints documented
# - Security middleware applied

# 2. Conflict detection
npm run check-conflicts inventory
# Checks:
# - No table name conflicts across modules
# - No API endpoint conflicts  
# - No permission code conflicts
# - No navigation path conflicts
# - Schema deployment compatibility across all tenant schemas

# 3. Security audit
npm run test:security inventory
# Verifies:
# - All endpoints require authentication
# - Proper authorization controls
# - Schema-level tenant isolation implemented
# - Input validation in place
# - No cross-tenant data access possible
# - Database connections properly scoped to tenant schemas
```

#### 3.2 Staging Environment Testing
```bash
# 1. Deploy to staging environment
git checkout feature/inventory-module
npm run deploy:staging

# 2. Super admin manual testing:
# - Module functionality verification
# - Security controls testing
# - Performance impact assessment
# - Integration with existing modules
# - Schema-level tenant isolation verification
# - Module deployment across all tenant schemas
# - Backup/restore procedures for individual tenants

# 3. User acceptance testing
# - Business analyst demonstrates functionality
# - Super admin verifies requirements met
# - Edge cases and error scenarios tested
```

#### 3.3 Production Deployment Process
```bash
# 1. If staging tests pass, merge to develop
git checkout develop
git merge feature/inventory-module

# 2. Final integration testing
npm run test:integration:all

# 3. Merge to main for production
git checkout main  
git merge develop

# 4. Deploy to production (applies to all tenant schemas)
npm run deploy:production

# 5. Verify deployment across all tenant schemas
npm run verify:tenant-schemas

# 6. Monitor deployment
npm run logs:production
npm run health:check
```

#### 3.4 Module Activation and Configuration
1. **Super Admin Dashboard Access**
   - Login to production system
   - Navigate to System > Module Management
   - Review new "Inventory Management" module

2. **Module Activation**
   - Activate module system-wide
   - Configure module settings
   - Set tenant availability (which tenants can use this module)
   - Configure feature flags if applicable

3. **Permission System Integration**
   - Verify module permissions are created
   - Assign module permissions to existing roles as needed
   - Create new roles specific to module if required

### Phase 4: Tenant Rollout and Configuration

#### 4.1 Tenant Admin Configuration
1. **Module Availability**
   - Tenant admin sees new "Inventory" section in navigation
   - Module appears in tenant's available features list

2. **Role and Permission Setup**
   - Create tenant-specific roles (e.g., "Inventory Manager", "Warehouse Staff")
   - Assign appropriate module permissions to roles
   - Configure role hierarchy within tenant

3. **User Assignment**
   - Assign existing users to new inventory-related roles
   - Invite new users if needed for module functionality
   - Configure user access levels within module

#### 4.2 End User Experience
1. **Navigation Updates**
   - Users see new inventory features in dashboard
   - Menu items appear based on user permissions
   - Breadcrumb navigation includes module paths

2. **Feature Access**
   - Users can access features based on assigned permissions
   - Module integrates seamlessly with existing workflow
   - Data is completely isolated to user's tenant schema (no cross-tenant access possible)

## Required Development Tools

### 1. Foundation Setup Tools
```bash
# setup-module-dev.sh
npm run setup-module-dev
# Complete development environment setup
```

### 2. Module Generation Tools
```bash
# Module templates available:
npm run create-module <name> crud      # Basic CRUD operations
npm run create-module <name> workflow  # Process/workflow management  
npm run create-module <name> reporting # Analytics and reporting
npm run create-module <name> integration # External system integration
```

### 3. Validation and Testing Tools
```bash
npm run validate-module <module-name>    # Code and structure validation
npm run check-conflicts <module-name>    # Conflict detection
npm run test:security <module-name>      # Security audit including schema isolation
npm run test:integration <module-name>   # Integration testing across tenant schemas
npm run test:performance <module-name>   # Performance testing with multiple tenant schemas
npm run test:tenant-isolation <module-name> # Verify complete tenant data isolation
```

### 4. Administrative Interfaces

#### Super Admin Dashboard Features:
- **Module Management**: Install, activate, configure modules across all tenant schemas
- **Tenant Management**: Create, manage, monitor tenants (including schema provisioning)
- **Schema Management**: Monitor tenant schema health, backup/restore individual tenants
- **System Monitoring**: Performance, health, logs across all tenant schemas
- **Security Management**: System-wide security settings and schema-level access controls
- **Module Marketplace**: Browse and install available modules
- **Tenant Migration**: Move tenants between database instances for scaling

#### Tenant Admin Dashboard Features:
- **User Management**: Add, edit, manage tenant users
- **Role Management**: Create and assign roles within tenant
- **Module Configuration**: Configure modules for tenant use
- **Tenant Settings**: Tenant-specific configuration and branding

## Benefits of This Workflow

### For Business Analysts:
✅ **Familiar Tools**: Work with AI assistants and development environments they know  
✅ **Guided Process**: Step-by-step workflow with clear validation points  
✅ **Quality Assurance**: Multiple testing phases ensure module quality  
✅ **Foundation Benefits**: Don't need to worry about authentication, security, UI consistency  

### For System Administrators:
✅ **Quality Control**: Comprehensive validation prevents issues  
✅ **Security Assurance**: Built-in security patterns and testing  
✅ **Scalability**: Process supports multiple concurrent module development  
✅ **Maintainability**: Clear separation between foundation and business logic  

### For End Users:
✅ **Consistent Experience**: All modules follow same UI and interaction patterns  
✅ **Secure Access**: Physical schema-level tenant isolation (impossible to access other tenant data)
✅ **High Performance**: Dedicated tenant schemas optimize query performance
✅ **Integrated Workflow**: Modules work seamlessly together within tenant  
✅ **Reliable Performance**: Tested and validated before deployment  

## Success Metrics

### Development Velocity:
- Time from requirements to deployed module
- Number of modules developed per quarter
- Reduction in development complexity

### Quality Metrics:
- Module defect rate post-deployment
- Security incident rate
- User satisfaction scores

### System Health:
- Performance impact of new modules across tenant schemas
- System availability and reliability per tenant
- Resource utilization efficiency across tenant schemas
- Tenant schema backup and recovery success rates
- Cross-tenant performance isolation effectiveness

This workflow creates a sustainable "module marketplace" ecosystem where business knowledge can be quickly translated into functional software through AI assistance, while maintaining enterprise-grade quality and security standards.