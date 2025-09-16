import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import { Building2, DollarSign, Plus, Search, Users2, Calendar, Filter } from 'lucide-react';

// Mock data - will be replaced with real API calls later
const tenantData = {
  overview: {
    totalTenants: 4,
    activeTenants: 4, 
    trialTenants: 0,
    totalUsers: 0,
    monthlyRevenue: 8209
  },
  tenants: [
    {
      id: 1,
      name: 'XL Logistics',
      domain: 'xl@yourdomain.com',
      status: 'Active',
      users: 0,
      modules: 0,
      monthlyRevenue: 2048,
      created: 'Sep 10, 2025',
      lastActivity: 'Sep 15, 2025'
    },
    {
      id: 2,
      name: 'Development Company', 
      domain: 'dev@yourdomain.com',
      status: 'Active',
      users: 0,
      modules: 1,
      monthlyRevenue: 1438,
      created: 'Sep 2, 2025',
      lastActivity: 'Aug 18, 2025'
    },
    {
      id: 3,
      name: 'Tech Corp Ltd',
      domain: 'tech@yourdomain.com', 
      status: 'Active',
      users: 0,
      modules: 1,
      monthlyRevenue: 3101,
      created: 'Sep 2, 2025',
      lastActivity: 'Sep 7, 2025'
    },
    {
      id: 4,
      name: 'ACME Corporation',
      domain: 'acme@yourdomain.com',
      status: 'Active',
      users: 0,
      modules: 1,
      monthlyRevenue: 0,
      created: 'Sep 2, 2025',
      lastActivity: 'Sep 7, 2025'
    }
  ]
};

export function TenantManagement() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage all tenant organizations across the platform</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{tenantData.overview.totalTenants}</p>
                <p className="text-xs text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-2xl font-bold">{tenantData.overview.activeTenants}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{tenantData.overview.trialTenants}</p>
                <p className="text-xs text-muted-foreground">Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{tenantData.overview.totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">${tenantData.overview.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tenants..." className="pl-10 w-64" />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Showing {tenantData.tenants.length} of {tenantData.tenants.length} tenants</p>
      </div>

      {/* Tenant Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tenantData.tenants.map((tenant) => (
          <Card key={tenant.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                  </div>
                </div>
                <Badge variant={tenant.status === 'Active' ? 'default' : 'secondary'}>
                  {tenant.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{tenant.users}</p>
                  <p className="text-xs text-muted-foreground">Users</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{tenant.modules}</p>
                  <p className="text-xs text-muted-foreground">Modules</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Revenue</span>
                  <span className="font-medium">${tenant.monthlyRevenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{tenant.created}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span>{tenant.lastActivity}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  Details
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  Modules
                </Button>
                <Button size="sm" variant="outline" className="text-red-600">
                  Suspend
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default TenantManagement;