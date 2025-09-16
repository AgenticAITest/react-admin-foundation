import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import { Plus, Search, Filter, Package, DollarSign } from 'lucide-react';

// Mock data - will be replaced with real API calls later
const moduleData = {
  categories: {
    total: 6,
    active: 0,
    free: 1,
    premium: 5
  },
  modules: [
    {
      id: 1,
      name: 'Accounting',
      version: 'v1.0.0',
      description: 'Financial management',
      category: 'Finance',
      type: 'Premium',
      status: 'Inactive',
      price: 149,
      monthlyPrice: 25,
      tenants: 0,
      requirements: 'Core'
    },
    {
      id: 2,
      name: 'Core System',
      version: 'v1.0.0', 
      description: 'Essential system features',
      category: 'System',
      type: 'Free',
      status: 'Inactive',
      price: 0,
      monthlyPrice: 0,
      tenants: 0,
      requirements: 'Core'
    },
    {
      id: 3,
      name: 'Human Resources',
      version: 'v1.0.0',
      description: 'HR management',
      category: 'HR',
      type: 'Premium',
      status: 'Inactive',
      price: 89,
      monthlyPrice: 18,
      tenants: 0,
      requirements: 'Core'
    },
    {
      id: 4,
      name: 'Integration Hub',
      version: 'v1.0.0',
      description: 'Comprehensive integration management for inbound APIs, outbound APIs, and webhooks with smart self-service configuration.',
      category: 'Integration',
      type: 'Premium', 
      status: 'Inactive',
      price: 99,
      monthlyPrice: 6,
      tenants: 0,
      requirements: 'Core'
    },
    {
      id: 5,
      name: 'Point of Sale',
      version: 'v1.0.0',
      description: 'Multi-store POS system',
      category: 'Retail',
      type: 'Premium',
      status: 'Inactive',
      price: 79,
      monthlyPrice: 12,
      tenants: 0,
      requirements: 'Core'
    },
    {
      id: 6,
      name: 'Warehouse Management',
      version: 'v1.0.0',
      description: 'Warehouse and inventory management',
      category: 'Operations',
      type: 'Premium',
      status: 'Inactive',
      price: 99,
      monthlyPrice: 15,
      tenants: 0,
      requirements: 'Core'
    }
  ]
};

const categoryColors: Record<string, string> = {
  Finance: 'bg-red-100 text-red-800',
  System: 'bg-blue-100 text-blue-800', 
  HR: 'bg-purple-100 text-purple-800',
  Integration: 'bg-green-100 text-green-800',
  Retail: 'bg-orange-100 text-orange-800',
  Operations: 'bg-teal-100 text-teal-800'
};

export function ModuleMarketplace() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Module Marketplace</h1>
          <p className="text-muted-foreground">Manage and configure available modules for your tenants</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Module
        </Button>
      </div>

      {/* Category Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-blue-600">{moduleData.categories.total}</p>
            <p className="text-sm text-muted-foreground">Total Modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-green-600">{moduleData.categories.active}</p>
            <p className="text-sm text-muted-foreground">Active Modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">{moduleData.categories.free}</p>
            <p className="text-sm text-muted-foreground">Free Modules</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-2xl font-bold text-purple-600">{moduleData.categories.premium}</p>
            <p className="text-sm text-muted-foreground">Premium Modules</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search modules..." className="pl-10 w-64" />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Showing {moduleData.modules.length} of {moduleData.modules.length} modules</p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {moduleData.modules.map((module) => (
          <Card key={module.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    module.category === 'Finance' ? 'bg-red-100' :
                    module.category === 'System' ? 'bg-blue-100' :
                    module.category === 'HR' ? 'bg-purple-100' :
                    module.category === 'Integration' ? 'bg-green-100' :
                    module.category === 'Retail' ? 'bg-orange-100' :
                    'bg-teal-100'
                  }`}>
                    <Package className={`h-5 w-5 ${
                      module.category === 'Finance' ? 'text-red-600' :
                      module.category === 'System' ? 'text-blue-600' :
                      module.category === 'HR' ? 'text-purple-600' :
                      module.category === 'Integration' ? 'text-green-600' :
                      module.category === 'Retail' ? 'text-orange-600' :
                      'text-teal-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{module.version}</p>
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge 
                    variant={module.status === 'Inactive' ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {module.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{module.description}</p>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  categoryColors[module.category] || 'bg-gray-100 text-gray-800'
                }`}>
                  {module.category}
                </span>
                <div className="text-right">
                  {module.type === 'Free' ? (
                    <div className="font-bold text-green-600">Free</div>
                  ) : (
                    <>
                      <div className="font-bold">${module.price}</div>
                      <div className="text-xs text-muted-foreground">${module.monthlyPrice}/mo per user</div>
                    </>
                  )}
                </div>
              </div>

              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenants:</span>
                  <span>{module.tenants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requirements:</span>
                  <span>{module.requirements}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  View Details
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className={module.status === 'Inactive' ? 'text-green-600' : 'text-orange-600'}
                >
                  {module.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ModuleMarketplace;