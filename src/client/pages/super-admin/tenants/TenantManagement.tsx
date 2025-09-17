import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import { Building2, DollarSign, Plus, Search, Users2, Calendar, Filter, RefreshCw } from 'lucide-react';
import { useErrorHandler } from '@client/hooks/useErrorHandler';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AddTenantModal from './components/AddTenantModal';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  schemaName: string;
  status: string;
  moduleCount: number;
  createdAt: string;
}

interface TenantListResponse {
  tenants: Tenant[];
  count: number;
  total: number;
  page: number;
  perPage: number;
}

export function TenantManagement() {
  const { throwError } = useErrorHandler();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Calculate overview metrics from tenant data
  const overview = {
    totalTenants: totalCount,
    activeTenants: tenants.filter(t => t.status === 'active').length,
    trialTenants: tenants.filter(t => t.status === 'trial').length,
    totalUsers: 0, // This would come from a separate API call
    monthlyRevenue: 0 // This would come from a separate API call
  };

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await axios.get<TenantListResponse>('/api/system/tenant', {
        params: {
          page,
          perPage,
          search: searchTerm
        }
      });
      
      setTenants(response.data.tenants || []);
      setTotalCount(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throwError(error as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [page, searchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const handleTenantCreated = () => {
    toast.success('Tenant created successfully');
    setIsAddModalOpen(false);
    fetchTenants(); // Refresh the list
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground">Manage all tenant organizations across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTenants} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{overview.totalTenants}</p>
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
                <p className="text-2xl font-bold">{overview.activeTenants}</p>
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
                <p className="text-2xl font-bold">{overview.trialTenants}</p>
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
                <p className="text-2xl font-bold">{overview.totalUsers}</p>
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
                <p className="text-2xl font-bold">${overview.monthlyRevenue.toLocaleString()}</p>
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
            <Input 
              placeholder="Search tenants..." 
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {tenants.length} of {totalCount} tenants
        </p>
      </div>

      {/* Tenant Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading tenants...</span>
        </div>
      ) : tenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tenants found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No tenants match your search criteria' : 'Get started by creating your first tenant'}
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tenants.map((tenant) => (
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
                  <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                    {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tenant.moduleCount}</p>
                    <p className="text-xs text-muted-foreground">Modules</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Schema</span>
                    <span className="font-medium">{tenant.schemaName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(tenant.createdAt), 'MMM d, yyyy')}</span>
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
      )}

      {/* Add Tenant Modal */}
      <AddTenantModal 
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleTenantCreated}
      />
    </div>
  );
}

export default TenantManagement;