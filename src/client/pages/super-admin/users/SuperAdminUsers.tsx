import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@client/components/ui/avatar';
import { Plus, Search, Users2, UserCheck, UserX, Edit2, Trash2 } from 'lucide-react';

// Mock data - will be replaced with real API calls later
const superAdminData = {
  overview: {
    totalSuperAdmins: 2,
    activeSuperAdmins: 2,
    activeThisWeek: 0
  },
  admins: [
    {
      id: 1,
      name: 'Super Admin 2',
      email: 'super2@example.com',
      status: 'Active',
      avatar: null,
      lastLogin: '2025-09-16T08:30:00Z',
      createdAt: '2025-01-15T10:00:00Z',
      permissions: ['system.tenant.manage', 'system.user.manage', 'system.module.manage']
    },
    {
      id: 2,
      name: 'Super Admin',
      email: 'super@example.com',
      status: 'Active',
      avatar: null,
      lastLogin: '2025-09-16T09:15:00Z',
      createdAt: '2025-01-01T08:00:00Z',
      permissions: ['system.tenant.manage', 'system.user.manage', 'system.module.manage', 'system.logs.view']
    }
  ]
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getInitials = (name: string) => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase();
};

export function SuperAdminUsers() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Management</h1>
          <p className="text-muted-foreground">Manage Super administrator accounts with global platform access</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Super Admin
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{superAdminData.overview.totalSuperAdmins}</p>
                <p className="text-sm text-muted-foreground">Total Super Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{superAdminData.overview.activeSuperAdmins}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserX className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{superAdminData.overview.activeThisWeek}</p>
                <p className="text-sm text-muted-foreground">Active This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search super admins..." className="pl-10 w-64" />
        </div>
      </div>

      {/* Super Administrator Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Super Administrator Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {superAdminData.admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={admin.avatar || undefined} />
                    <AvatarFallback>{getInitials(admin.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold">{admin.name}</h3>
                      <Badge variant={admin.status === 'Active' ? 'default' : 'secondary'}>
                        {admin.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                      <span>Last login: {formatDate(admin.lastLogin)}</span>
                      <span>•</span>
                      <span>Created: {formatDate(admin.createdAt)}</span>
                      <span>•</span>
                      <span>{admin.permissions.length} permissions</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-800">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-800">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Global Permissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Super administrators have access to system-wide operations across all tenants
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Tenant Management</h4>
              <p className="text-xs text-muted-foreground">Create, edit, activate, and deactivate tenant organizations</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">User Management</h4>
              <p className="text-xs text-muted-foreground">Manage users across all tenants and impersonate users</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Module Management</h4>
              <p className="text-xs text-muted-foreground">Install, configure, and manage modules across the platform</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">System Monitoring</h4>
              <p className="text-xs text-muted-foreground">View system health, performance metrics, and audit logs</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Global Configuration</h4>
              <p className="text-xs text-muted-foreground">Edit system configuration and manage security settings</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Database Management</h4>
              <p className="text-xs text-muted-foreground">Manage database schemas and cross-tenant operations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperAdminUsers;