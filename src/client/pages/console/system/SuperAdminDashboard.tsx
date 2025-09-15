import React from 'react';
import { PageLayout } from '@client/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Authorized } from '@client/components/auth/Authorized';
import { TenantManagementWidget } from './widgets/TenantManagementWidget';
import { ModuleManagementWidget } from './widgets/ModuleManagementWidget';
import { SystemHealthWidget } from './widgets/SystemHealthWidget';
import { SystemMetricsWidget } from './widgets/SystemMetricsWidget';
import { Building, Package, Activity, BarChart } from 'lucide-react';

export const SuperAdminDashboard = () => {
  return (
    <Authorized permissions={["system.manage"]}>
      <PageLayout 
        title="Super Admin Dashboard"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "System", href: "/console/system" },
          { label: "Dashboard", href: "/console/system/dashboard" }
        ]}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Tenant Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Tenant Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TenantManagementWidget />
            </CardContent>
          </Card>
          
          {/* Module Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Module Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ModuleManagementWidget />
            </CardContent>
          </Card>
          
          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemHealthWidget />
            </CardContent>
          </Card>
          
          {/* System Metrics */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                System Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemMetricsWidget />
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </Authorized>
  );
};

export default SuperAdminDashboard;