import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Activity, Building2, DollarSign, TrendingUp, Users } from 'lucide-react';

// Mock data - will be replaced with real API calls later
const dashboardData = {
  metrics: {
    totalTenants: 4,
    tenantsTrend: '+1 last 30 days',
    activeUsers: 7, 
    usersTrend: '+7 last 30 days',
    monthlyRevenue: 89420,
    revenueTrend: '+$12,420 this month',
    systemUptime: '99.9%',
    uptimeTrend: 'Last updated: 5 minutes ago'
  },
  recentTenants: [
    {
      company: 'Acme Corporation',
      domain: 'acme',
      status: 'Active',
      users: 25,
      created: '15/01/2024'
    },
    {
      company: 'TechStart Inc',
      domain: 'techstart', 
      status: 'Active',
      users: 12,
      created: '14/01/2024'
    },
    {
      company: 'Global Solutions',
      domain: 'globalsol',
      status: 'Suspended',
      users: 45,
      created: '13/01/2024'
    }
  ],
  systemHealth: [
    {
      service: 'API Gateway',
      status: 'Healthy',
      uptime: '99.9%'
    },
    {
      service: 'Database', 
      status: 'Healthy',
      uptime: '99.8%'
    },
    {
      service: 'Redis Cache',
      status: 'Healthy', 
      uptime: '100%'
    },
    {
      service: 'File Storage',
      status: 'Warning',
      uptime: '98.3%'
    }
  ]
};

export function SuperAdminDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">System Dashboard</h1>
        <p className="text-muted-foreground">Overview of your multi-tenant SaaS platform</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.metrics.totalTenants}</div>
            <p className="text-xs text-muted-foreground">{dashboardData.metrics.tenantsTrend}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">{dashboardData.metrics.usersTrend}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.metrics.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{dashboardData.metrics.revenueTrend}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.metrics.systemUptime}</div>
            <p className="text-xs text-muted-foreground">{dashboardData.metrics.uptimeTrend}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tenants</CardTitle>
            <p className="text-sm text-muted-foreground">Latest tenant organizations and their status</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                <span>Company</span>
                <span>Status</span>
                <span>Users</span>
                <span>Created</span>
                <span></span>
              </div>
              {dashboardData.recentTenants.map((tenant, index) => (
                <div key={index} className="grid grid-cols-5 gap-4 items-center text-sm">
                  <div>
                    <div className="font-medium">{tenant.company}</div>
                    <div className="text-muted-foreground">{tenant.domain}</div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                  <span>{tenant.users}</span>
                  <span>{tenant.created}</span>
                  <button className="text-blue-600 hover:text-blue-800 text-xs">Details</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <p className="text-sm text-muted-foreground">Current status of core system services</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.systemHealth.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'Healthy' 
                        ? 'bg-green-500' 
                        : service.status === 'Warning'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`} />
                    <span className="font-medium">{service.service}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{service.status}</div>
                    <div className="text-xs text-muted-foreground">Uptime: {service.uptime}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;