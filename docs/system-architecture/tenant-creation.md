# Tenant Creation System Plan

## Overview
This document outlines the implementation plan for Super Admin tenant creation functionality, including UI, API, and database schema provisioning.

## 🎯 Requirements Summary

### Super Admin Capabilities
- List all tenants in a searchable table (registry info only)
- Create new tenants with mandatory info + optional company details
- Control tenant name and domain (contract-based, login routing)
- Automatically provision tenant schemas with RBAC tables
- Create tenant admin users with default roles and permissions

### Tenant Admin Capabilities
- Full CRUD access to company details (logo, address, phone, localization)
- READ-ONLY access to tenant name (contract-based, super admin controlled)
- NO access to domain (super admin controlled, affects login routing)

### Schema Naming & Login Routing
- Pattern: `tenant_<domain_name>`
- Example: Domain "acme-corp" → Schema "tenant_acme_corp" 
- Domain is used during login to route users to correct tenant schema
- Super admin controls domain (cannot be changed by tenant admin)

## 📱 Frontend Design

### 1. Tenant Management Page
**Route:** `/console/super-admin/tenants`

#### Page Structure
```typescript
interface TenantListPage {
  header: {
    title: "Tenant Management"
    searchField: SearchInput
    addTenantButton: Button
  }
  
  table: {
    columns: [
      "Tenant Name",
      "Domain", 
      "Modules Subscribed",
      "Status",
      "Created Date",
      "Actions"
    ]
    actions: ["View", "Edit", "Deactivate"]
  }
}
```

#### Table Data Structure
```typescript
interface TenantTableRow {
  id: string
  name: string                    // Company name
  domain: string                  // Domain used for schema
  moduleCount: number            // Count of assigned modules
  status: 'active' | 'inactive' | 'provisioning'
  createdAt: Date
  logoUrl?: string
  phoneNumber?: string
  address?: string
}
```

### 2. Add Tenant Modal Form

#### Form Sections
```typescript
interface CreateTenantForm {
  // MANDATORY fields
  tenantName: string             // Required - contract-based (super admin controlled)
  domain: string                 // Required - used for schema name + login routing
  
  // MANDATORY tenant admin user
  adminUsername: string          // Required
  adminEmail: string             // Required
  adminFullName: string          // Required
  adminPassword: string          // Required
  confirmPassword: string        // Required - must match password
  
  // OPTIONAL company details (if filled, goes to tenant_info table)
  logoUrl?: string               // Optional - can be added by tenant admin later
  address?: string               // Optional - can be added by tenant admin later
  phoneNumber?: string           // Optional - can be added by tenant admin later
  timezone: string               // Default: 'UTC'
  currency: string               // Default: 'USD' 
  language: string               // Default: 'en'
}
```

#### Validation Rules
```typescript
const validationSchema = {
  tenantName: {
    required: true,
    minLength: 2,
    maxLength: 255
  },
  domain: {
    required: true,
    pattern: /^[a-z0-9-]+$/,      // Only lowercase, numbers, hyphens
    minLength: 2,
    maxLength: 50,
    unique: true                   // Must not exist in database
  },
  adminUsername: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  adminEmail: {
    required: true,
    format: 'email'
  },
  adminPassword: {
    required: true,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: true
  },
  confirmPassword: {
    required: true,
    mustMatch: 'adminPassword'
  }
}
```

## 🔧 Backend API Design

### 1. Tenant Management Endpoints

#### List Tenants
```http
GET /api/system/tenant?search={query}&page={page}&limit={limit}

Response:
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Acme Corporation",
      "domain": "acme-corp", 
      "schemaName": "tenant_acme_corp",
      "logoUrl": "https://example.com/logo.png",
      "address": "123 Main St, City, State",
      "phoneNumber": "+1-555-123-4567",
      "timezone": "America/New_York",
      "currency": "USD",
      "language": "en",
      "status": "active",
      "moduleCount": 3,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

#### Create Tenant
```http
POST /api/system/tenant

Request Body:
{
  "tenantName": "Acme Corporation",
  "logoUrl": "https://example.com/logo.png",
  "domain": "acme-corp",
  "address": "123 Main St, City, State 12345",
  "phoneNumber": "+1-555-123-4567",
  "timezone": "America/New_York",
  "currency": "USD", 
  "language": "en",
  "adminUsername": "admin",
  "adminEmail": "admin@acme-corp.com",
  "adminFullName": "John Smith",
  "adminPassword": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}

Response:
{
  "success": true,
  "tenant": {
    "id": "uuid",
    "name": "Acme Corporation",
    "domain": "acme-corp",
    "schemaName": "tenant_acme_corp",
    "status": "active"
  },
  "tenantAdmin": {
    "id": "uuid", 
    "username": "admin",
    "email": "admin@acme-corp.com"
  }
}
```

#### Other Endpoints
```http
GET    /api/system/tenant/:id              # Get single tenant
PUT    /api/system/tenant/:id              # Update tenant info
DELETE /api/system/tenant/:id              # Deactivate tenant
POST   /api/system/tenant/:id/reactivate   # Reactivate tenant
```

## 🗄️ Database Schema Design

### 1. Enhanced sys_tenant Table (PUBLIC Schema)
```sql
-- Add only registry/admin-controlled columns to existing sys_tenant table
ALTER TABLE sys_tenant ADD COLUMN IF NOT EXISTS domain VARCHAR(255) UNIQUE;

-- sys_tenant stores ONLY super admin controlled data:
-- id, code, name, domain, schemaName, status, created_at, updated_at
-- NO company details (logo, address, phone, timezone, currency, language)
```

### 2. Tenant Schema Structure
For each tenant with domain "acme-corp", create schema "tenant_acme_corp":

#### A. Tenant Info Table (Tenant Schema)
```sql
CREATE TABLE tenant_acme_corp.tenant_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,           -- READ-ONLY for tenant admin (contract-based)
  logo_url VARCHAR(500),                -- Tenant admin can modify
  address TEXT,                         -- Tenant admin can modify
  phone_number VARCHAR(50),             -- Tenant admin can modify
  timezone VARCHAR(100) DEFAULT 'UTC',  -- Tenant admin can modify
  currency VARCHAR(10) DEFAULT 'USD',   -- Tenant admin can modify
  language VARCHAR(10) DEFAULT 'en',    -- Tenant admin can modify
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- NOTE: Domain is NOT stored here - it's in sys_tenant (super admin controlled)
-- NOTE: Name is duplicated but tenant admin has READ-ONLY access (contract-based)
```

#### B. RBAC Tables (Tenant Schema) 
Copy structure from PUBLIC schema:
```sql
-- Users table (tenant-specific)
CREATE TABLE tenant_acme_corp.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  fullname VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table (tenant-specific)
CREATE TABLE tenant_acme_corp.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(code)
);

-- Permissions table (tenant-specific)
CREATE TABLE tenant_acme_corp.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User-Role relationship (tenant-specific)
CREATE TABLE tenant_acme_corp.user_roles (
  user_id UUID NOT NULL REFERENCES tenant_acme_corp.users(id),
  role_id UUID NOT NULL REFERENCES tenant_acme_corp.roles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Role-Permission relationship (tenant-specific)
CREATE TABLE tenant_acme_corp.role_permissions (
  role_id UUID NOT NULL REFERENCES tenant_acme_corp.roles(id),
  permission_id UUID NOT NULL REFERENCES tenant_acme_corp.permissions(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);
```

#### C. Default RBAC Data
```sql
-- Insert default roles
INSERT INTO tenant_acme_corp.roles (id, code, name, description, is_system) VALUES
  (gen_random_uuid(), 'ADMIN', 'Administrator', 'Full tenant administration access', true),
  (gen_random_uuid(), 'USER', 'User', 'Regular user access', true),
  (gen_random_uuid(), 'VIEWER', 'Viewer', 'Read-only access', true);

-- Insert default permissions
INSERT INTO tenant_acme_corp.permissions (id, code, name, description) VALUES
  (gen_random_uuid(), 'users.view', 'View Users', 'Can view user lists'),
  (gen_random_uuid(), 'users.create', 'Create Users', 'Can create new users'),
  (gen_random_uuid(), 'users.edit', 'Edit Users', 'Can modify user details'),
  (gen_random_uuid(), 'users.delete', 'Delete Users', 'Can remove users'),
  (gen_random_uuid(), 'roles.view', 'View Roles', 'Can view role lists'),
  (gen_random_uuid(), 'roles.create', 'Create Roles', 'Can create new roles'),
  (gen_random_uuid(), 'roles.edit', 'Edit Roles', 'Can modify roles'),
  (gen_random_uuid(), 'roles.delete', 'Delete Roles', 'Can remove roles'),
  (gen_random_uuid(), 'permissions.view', 'View Permissions', 'Can view permissions'),
  (gen_random_uuid(), 'modules.view', 'View Modules', 'Can view available modules'),
  (gen_random_uuid(), 'modules.manage', 'Manage Modules', 'Can subscribe/unsubscribe modules'),
  (gen_random_uuid(), 'integrations.view', 'View Integrations', 'Can view integrations'),
  (gen_random_uuid(), 'integrations.manage', 'Manage Integrations', 'Can create/modify integrations');

-- Assign permissions to ADMIN role
INSERT INTO tenant_acme_corp.role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM tenant_acme_corp.roles r, tenant_acme_corp.permissions p 
WHERE r.code = 'ADMIN';

-- Create tenant admin user
INSERT INTO tenant_acme_corp.users (id, username, password_hash, email, fullname, status)
VALUES (
  gen_random_uuid(),
  'admin',
  <hashed_password>,
  'admin@acme-corp.com',
  'John Smith',
  'active'
);

-- Assign ADMIN role to tenant admin user
INSERT INTO tenant_acme_corp.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM tenant_acme_corp.users u, tenant_acme_corp.roles r
WHERE u.username = 'admin' AND r.code = 'ADMIN';
```

## 💻 Implementation Plan

### Phase 1: Backend API Development

#### 1.1 Schema Generation Utility
```typescript
// src/server/lib/utils/schema-generator.ts
export const generateSchemaName = (domain: string): string => {
  // Convert domain to valid PostgreSQL schema name
  // Example: "acme-corp" → "tenant_acme_corp"
  return `tenant_${domain.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
};

export const validateDomainName = (domain: string): boolean => {
  return /^[a-z0-9-]+$/.test(domain) && domain.length >= 2 && domain.length <= 50;
};
```

#### 1.2 Tenant Provisioning Service
```typescript
// src/server/services/TenantProvisioningService.ts
export class TenantProvisioningService {
  async createTenant(data: CreateTenantRequest): Promise<CreateTenantResponse> {
    return await db.transaction(async (tx) => {
      // 1. Validate domain uniqueness
      await this.validateDomainUniqueness(tx, data.domain);
      
      // 2. Generate schema name
      const schemaName = generateSchemaName(data.domain);
      
      // 3. Create tenant record in PUBLIC sys_tenant
      const tenant = await this.createTenantRecord(tx, data, schemaName);
      
      // 4. Create tenant schema
      await this.createTenantSchema(tx, schemaName);
      
      // 5. Create tenant_info table
      await this.createTenantInfoTable(tx, schemaName, data);
      
      // 6. Create RBAC tables in tenant schema
      await this.createRBACTables(tx, schemaName);
      
      // 7. Insert default roles and permissions
      await this.insertDefaultRBACData(tx, schemaName);
      
      // 8. Create tenant admin user
      const adminUser = await this.createTenantAdminUser(tx, schemaName, data);
      
      return {
        tenant,
        tenantAdmin: adminUser
      };
    });
  }
  
  private async validateDomainUniqueness(tx: Transaction, domain: string) {
    const existing = await tx.select()
      .from(sys_tenant)
      .where(eq(sys_tenant.domain, domain))
      .limit(1);
      
    if (existing.length > 0) {
      throw new Error(`Domain '${domain}' already exists`);
    }
  }
  
  private async createTenantSchema(tx: Transaction, schemaName: string) {
    await tx.execute(sql`CREATE SCHEMA ${sql.identifier(schemaName)}`);
  }
  
  private async createTenantInfoTable(tx: Transaction, schemaName: string, data: CreateTenantRequest) {
    // Create tenant_info table structure
    await tx.execute(sql`
      CREATE TABLE ${sql.identifier(schemaName)}.tenant_info (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,           -- READ-ONLY for tenant admin (contract-based)
        logo_url VARCHAR(500),                -- Tenant admin can modify
        address TEXT,                         -- Tenant admin can modify
        phone_number VARCHAR(50),             -- Tenant admin can modify
        timezone VARCHAR(100) DEFAULT 'UTC',  -- Tenant admin can modify
        currency VARCHAR(10) DEFAULT 'USD',   -- Tenant admin can modify
        language VARCHAR(10) DEFAULT 'en',    -- Tenant admin can modify
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert initial tenant info (including optional fields if provided by super admin)
    await tx.execute(sql`
      INSERT INTO ${sql.identifier(schemaName)}.tenant_info 
      (name, logo_url, address, phone_number, timezone, currency, language)
      VALUES (
        ${data.tenantName}, 
        ${data.logoUrl || null}, 
        ${data.address || null}, 
        ${data.phoneNumber || null}, 
        ${data.timezone || 'UTC'}, 
        ${data.currency || 'USD'}, 
        ${data.language || 'en'}
      )
    `);
  }

  // ... other methods
}
```

#### 1.3 API Routes
```typescript
// src/server/routes/system/tenants.ts
import { Router } from 'express';
import { TenantProvisioningService } from '../services/TenantProvisioningService';

const router = Router();
const provisioningService = new TenantProvisioningService();

// List tenants with search
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const result = await provisioningService.listTenants({
      search: search as string,
      page: Number(page),
      limit: Number(limit)
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Create new tenant
router.post('/', async (req, res) => {
  try {
    const result = await provisioningService.createTenant(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Other CRUD operations...

export default router;
```

### Phase 2: Frontend Implementation

#### 2.1 Tenant Management Page
```typescript
// src/client/pages/system/TenantsPage.tsx
import React, { useState, useEffect } from 'react';
import { TenantTable } from './components/TenantTable';
import { AddTenantModal } from './components/AddTenantModal';
import { SearchField } from '../../components/SearchField';

export const TenantsPage = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTenants = async () => {
    try {
      const response = await fetch(`/api/system/tenant?search=${searchQuery}`);
      const data = await response.json();
      setTenants(data.tenants);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [searchQuery]);

  const handleTenantCreated = () => {
    setShowAddModal(false);
    fetchTenants(); // Refresh list
  };

  return (
    <div className="tenants-page">
      <div className="page-header">
        <h1>Tenant Management</h1>
        <div className="page-actions">
          <SearchField
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            Add Tenant
          </button>
        </div>
      </div>

      <TenantTable 
        tenants={tenants}
        loading={loading}
        onEdit={(tenant) => {/* Handle edit */}}
        onView={(tenant) => {/* Handle view */}}
        onDeactivate={(tenant) => {/* Handle deactivate */}}
      />

      {showAddModal && (
        <AddTenantModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleTenantCreated}
        />
      )}
    </div>
  );
};
```

#### 2.2 Add Tenant Modal Component
```typescript
// src/client/pages/system/components/AddTenantModal.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createTenantSchema = z.object({
  tenantName: z.string().min(2).max(255),
  logoUrl: z.string().url().optional(),
  domain: z.string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  language: z.string().default('en'),
  adminUsername: z.string().min(3).max(50),
  adminEmail: z.string().email(),
  adminFullName: z.string().min(2).max(255),
  adminPassword: z.string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: z.string()
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

interface AddTenantModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ 
  onClose, 
  onSuccess 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en'
    }
  });

  const onSubmit = async (data: CreateTenantForm) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/system/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tenant');
      }

      onSuccess();
    } catch (error) {
      setError('root', { 
        type: 'manual', 
        message: error.message 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h2>Add New Tenant</h2>
          <button 
            className="modal-close"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
          {/* Mandatory Fields Section */}
          <div className="form-section">
            <h3>Tenant Registration (Required)</h3>
            
            <div className="form-group">
              <label>Tenant Name *</label>
              <input
                {...register('tenantName')}
                className={errors.tenantName ? 'error' : ''}
                placeholder="Company Name"
              />
              {errors.tenantName && (
                <span className="error-message">{errors.tenantName.message}</span>
              )}
            </div>

            <div className="form-group">
              <label>Domain *</label>
              <input
                {...register('domain')}
                className={errors.domain ? 'error' : ''}
                placeholder="acme-corp"
              />
              {errors.domain && (
                <span className="error-message">{errors.domain.message}</span>
              )}
              <small>Used for schema naming: tenant_{domain}</small>
            </div>

            <div className="form-group">
              <label>Company Logo URL</label>
              <input
                {...register('logoUrl')}
                className={errors.logoUrl ? 'error' : ''}
                placeholder="https://example.com/logo.png"
              />
              {errors.logoUrl && (
                <span className="error-message">{errors.logoUrl.message}</span>
              )}
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                {...register('address')}
                placeholder="Company address"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                {...register('phoneNumber')}
                placeholder="+1-555-123-4567"
              />
            </div>
          </div>

          {/* Optional Company Details Section */}
          <div className="form-section">
            <h3>Company Details (Optional)</h3>
            <small>These fields can be filled now or added later by the tenant administrator.</small>
            
            <div className="form-group">
              <label>Company Logo URL</label>
              <input
                {...register('logoUrl')}
                className={errors.logoUrl ? 'error' : ''}
                placeholder="https://example.com/logo.png"
              />
              {errors.logoUrl && (
                <span className="error-message">{errors.logoUrl.message}</span>
              )}
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                {...register('address')}
                placeholder="Company address"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                {...register('phoneNumber')}
                placeholder="+1-555-123-4567"
              />
            </div>
            
            <h4>Localization Settings</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Timezone</label>
                <select {...register('timezone')}>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Currency</label>
                <select {...register('currency')}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Language</label>
                <select {...register('language')}>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ja">Japanese</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tenant Administrator Section */}
          <div className="form-section">
            <h3>Tenant Administrator</h3>
            
            <div className="form-group">
              <label>Admin Username *</label>
              <input
                {...register('adminUsername')}
                className={errors.adminUsername ? 'error' : ''}
                placeholder="admin"
              />
              {errors.adminUsername && (
                <span className="error-message">{errors.adminUsername.message}</span>
              )}
            </div>

            <div className="form-group">
              <label>Admin Email *</label>
              <input
                {...register('adminEmail')}
                type="email"
                className={errors.adminEmail ? 'error' : ''}
                placeholder="admin@company.com"
              />
              {errors.adminEmail && (
                <span className="error-message">{errors.adminEmail.message}</span>
              )}
            </div>

            <div className="form-group">
              <label>Admin Full Name *</label>
              <input
                {...register('adminFullName')}
                className={errors.adminFullName ? 'error' : ''}
                placeholder="John Smith"
              />
              {errors.adminFullName && (
                <span className="error-message">{errors.adminFullName.message}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  {...register('adminPassword')}
                  type="password"
                  className={errors.adminPassword ? 'error' : ''}
                  placeholder="Secure password"
                />
                {errors.adminPassword && (
                  <span className="error-message">{errors.adminPassword.message}</span>
                )}
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  {...register('confirmPassword')}
                  type="password"
                  className={errors.confirmPassword ? 'error' : ''}
                  placeholder="Confirm password"
                />
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword.message}</span>
                )}
              </div>
            </div>
          </div>

          {errors.root && (
            <div className="error-banner">
              {errors.root.message}
            </div>
          )}

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating Tenant...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### Phase 3: File Structure
```
src/
├── client/
│   └── pages/
│       └── system/
│           ├── TenantsPage.tsx
│           └── components/
│               ├── TenantTable.tsx
│               ├── AddTenantModal.tsx
│               ├── TenantActions.tsx
│               └── TenantStatusBadge.tsx
├── server/
│   ├── routes/
│   │   └── system/
│   │       └── tenants.ts
│   ├── services/
│   │   └── TenantProvisioningService.ts
│   ├── lib/
│   │   └── utils/
│   │       └── schema-generator.ts
│   └── lib/db/schema/
│       └── system.ts (enhanced)
```

### Phase 4: Testing Checklist

#### Backend Testing
- [ ] Domain validation (format, uniqueness)
- [ ] Schema creation and naming
- [ ] RBAC table copying
- [ ] Default data insertion
- [ ] Password hashing
- [ ] Transaction rollback on errors

#### Frontend Testing
- [ ] Form validation (all fields)
- [ ] Modal open/close behavior
- [ ] Table search functionality
- [ ] Loading states
- [ ] Error handling display
- [ ] Success notifications

#### Integration Testing
- [ ] Complete tenant creation flow
- [ ] Schema accessibility from tenant admin
- [ ] Default login functionality
- [ ] Permission enforcement

## 🚀 Deployment Considerations

### Security
- Hash passwords with bcrypt (salt rounds: 12)
- Validate all inputs server-side
- Prevent SQL injection in dynamic schema creation
- Rate limiting on tenant creation endpoint

### Performance
- Index domain column for uniqueness checks
- Batch RBAC data insertion
- Connection pooling for schema operations

### Monitoring
- Log all tenant creation attempts
- Monitor schema creation time
- Alert on creation failures

## ✅ Success Criteria

1. **Super Admin can create tenants** with complete form validation
2. **Schemas are automatically created** with proper naming convention
3. **RBAC tables are copied** with default roles and permissions
4. **Tenant admin can login** immediately after creation
5. **All data is properly isolated** by tenant schema
6. **Error handling works** for all failure scenarios
7. **Search and table functionality** works smoothly

This plan provides a complete roadmap for implementing tenant creation functionality with proper database isolation and user management.