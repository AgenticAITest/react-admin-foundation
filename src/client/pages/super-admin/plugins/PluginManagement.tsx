import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Input } from '@client/components/ui/input';
import { Badge } from '@client/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@client/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@client/components/ui/select';
import { Puzzle, Search, RefreshCw, ToggleLeft, ToggleRight, Building2, Package } from 'lucide-react';
import { useErrorHandler } from '@client/hooks/useErrorHandler';
import axios from 'axios';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  schemaName: string;
  status: string;
}

interface Plugin {
  plugin_id: string;
  version_installed: string;
  enabled: boolean;
  name?: string;
  description?: string;
}

interface TenantListResponse {
  tenants: Tenant[];
  count: number;
  total: number;
}

export function PluginManagement() {
  const { throwError } = useErrorHandler();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch tenants on component mount
  useEffect(() => {
    fetchTenants();
  }, []);

  // Fetch plugins when tenant is selected
  useEffect(() => {
    if (selectedTenantId) {
      fetchPlugins();
    } else {
      setPlugins([]);
    }
  }, [selectedTenantId]);

  const fetchTenants = async () => {
    try {
      const response = await axios.get<TenantListResponse>('/api/system/tenant');
      setTenants(response.data.tenants || []);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      throwError(error);
    }
  };

  const fetchPlugins = async () => {
    if (!selectedTenantId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`/api/system/tenants/${selectedTenantId}/plugins`);
      setPlugins(response.data || []);
    } catch (error: any) {
      console.error('Error fetching plugins:', error);
      throwError(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    if (!selectedTenantId) return;

    try {
      await axios.put(`/api/system/tenants/${selectedTenantId}/plugins/${pluginId}`, {
        enabled
      });
      
      toast.success(`Plugin ${enabled ? 'enabled' : 'disabled'} successfully`);
      fetchPlugins(); // Refresh the list
    } catch (error: any) {
      console.error('Error toggling plugin:', error);
      toast.error('Failed to update plugin status');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPlugins();
    setRefreshing(false);
  };

  // Filter plugins based on search term
  const filteredPlugins = plugins.filter(plugin =>
    plugin.plugin_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (plugin.name && plugin.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate overview metrics
  const overview = {
    totalPlugins: plugins.length,
    enabledPlugins: plugins.filter(p => p.enabled).length,
    disabledPlugins: plugins.filter(p => !p.enabled).length,
  };

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plugin Management</h1>
          <p className="text-muted-foreground">Manage plugin enablement for individual tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={!selectedTenantId || refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tenant to manage plugins..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tenant.name}</span>
                        <Badge variant="secondary">{tenant.domain}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTenant && (
              <div className="text-sm text-muted-foreground">
                Schema: <code className="bg-muted px-1 rounded">{selectedTenant.schemaName}</code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Metrics */}
      {selectedTenantId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-blue-600">{overview.totalPlugins}</p>
              <p className="text-sm text-muted-foreground">Total Plugins</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-green-600">{overview.enabledPlugins}</p>
              <p className="text-sm text-muted-foreground">Enabled</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-gray-600">{overview.disabledPlugins}</p>
              <p className="text-sm text-muted-foreground">Disabled</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plugin List */}
      {selectedTenantId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Plugin Status for {selectedTenant?.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search plugins..." 
                    className="pl-10 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading plugins...</p>
              </div>
            ) : filteredPlugins.length === 0 ? (
              <div className="text-center py-8">
                <Puzzle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {plugins.length === 0 ? 'No plugins found for this tenant' : 'No plugins match your search'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plugin</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlugins.map((plugin) => (
                    <TableRow key={plugin.plugin_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plugin.name || plugin.plugin_id}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {plugin.plugin_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{plugin.version_installed}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plugin.enabled ? "default" : "secondary"}>
                          {plugin.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePlugin(plugin.plugin_id, !plugin.enabled)}
                          className="flex items-center gap-2"
                        >
                          {plugin.enabled ? (
                            <>
                              <ToggleRight className="h-4 w-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="h-4 w-4" />
                              Enable
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedTenantId && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Select a Tenant</h3>
            <p className="text-muted-foreground">
              Choose a tenant from the dropdown above to view and manage their plugin configuration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PluginManagement;