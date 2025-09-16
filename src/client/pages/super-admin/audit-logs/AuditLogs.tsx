import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { RefreshCw, Filter, AlertTriangle } from 'lucide-react';

// Mock data - will be replaced with real API calls later
const auditData = {
  totalLogs: 23,
  securityAlerts: [
    {
      type: 'blocked request',
      message: 'portal-spider.com • 07/09/2025, 12:05:08',
      severity: 'warning'
    },
    {
      type: 'suspect tenant',
      message: 'manager@devco.com • 07/09/2025, 11:20:10',
      severity: 'critical'
    },
    {
      type: 'suspicious activity',
      message: 'manager@devco.com • 07/09/2025, 11:40:39',
      severity: 'high'
    },
    {
      type: 'unauthorized access',
      message: 'attacker@hostile.com • 07/09/2025, 11:20:10',
      severity: 'critical'
    }
  ],
  logs: [
    {
      time: '10/09/2025 13:31:59',
      userEmail: 'admin@dev.com',
      userType: 'tenant_admin',
      action: 'deactivate user',
      resource: 'user',
      status: 'success',
      severity: 'warning',
      ipAddress: '192.168.1.100'
    },
    {
      time: '10/09/2025 13:31:59',
      userEmail: 'john@acme.com',
      userType: 'user',
      action: 'create document',
      resource: 'document',
      status: 'success',
      severity: 'info',
      ipAddress: '192.168.1.105'
    },
    {
      time: '10/09/2025 13:31:59',
      userEmail: 'admin@dev.com',
      userType: 'tenant_admin',
      action: 'login',
      resource: 'authentication',
      status: 'success',
      severity: 'info',
      ipAddress: '192.168.1.100'
    },
    {
      time: '07/09/2025 12:05:08',
      userEmail: 'bot@crawler.com',
      userType: 'security',
      action: 'blocked request',
      resource: 'rate_limit',
      status: 'failed',
      severity: 'warning',
      ipAddress: '201.8.113.200'
    },
    {
      time: '07/09/2025 12:04:39',
      userEmail: 'manager@devco.com',
      userType: 'super_admin',
      action: 'update settings',
      resource: 'notification_preferences',
      status: 'success',
      severity: 'info',
      ipAddress: '10.0.1.10'
    },
    {
      time: '07/09/2025 12:04:39',
      userEmail: 'admin@testco.com',
      userType: 'super_admin',
      action: 'export audit logs',
      resource: 'audit_export',
      status: 'success',
      severity: 'info',
      ipAddress: '192.168.1.100'
    },
    {
      time: '07/09/2025 12:04:39',
      userEmail: 'system@erp.com',
      userType: 'system',
      action: 'security scan',
      resource: 'vulnerability_scan',
      status: 'success',
      severity: 'info',
      ipAddress: null
    },
    {
      time: '07/09/2025 12:01:39',
      userEmail: 'system@erp.com',
      userType: 'system',
      action: 'system backup',
      resource: 'database_backup',
      status: 'success',
      severity: 'info',
      ipAddress: null
    },
    {
      time: '07/09/2025 12:04:39',
      userEmail: 'admin@testco.com',
      userType: 'super_admin',
      action: 'view audit logs',
      resource: 'audit_logs_page',
      status: 'success',
      severity: 'info',
      ipAddress: '192.168.1.100'
    },
    {
      time: '07/09/2025 12:04:39',
      userEmail: 'admin@testco.com',
      userType: 'super_admin',
      action: 'activate tenant',
      resource: 'DevCo Solutions',
      status: 'success',
      severity: 'info',
      ipAddress: '192.168.1.100'
    }
  ]
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800';
    case 'info':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function AuditLogs() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Audit Logs Viewer</h1>
          <p className="text-muted-foreground">Monitor system activities, security events, and user actions across all tenants</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Show Filters
          </Button>
          <Button className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Alerts Panel */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Security Alerts ({auditData.securityAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditData.securityAlerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-orange-200">
                <div className="flex items-center space-x-3">
                  <Badge variant="destructive" className="text-xs">
                    {alert.type}
                  </Badge>
                  <span className="text-sm">{alert.message}</span>
                </div>
                <Badge className={getSeverityColor(alert.severity)}>
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Logs</CardTitle>
              <p className="text-sm text-muted-foreground">Showing {auditData.totalLogs} audit logs</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
              <span>Time</span>
              <span>User / Email</span>
              <span>Action</span>
              <span>Resource</span>
              <span>Status</span>
              <span>Severity</span>
              <span>IP Address</span>
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {auditData.logs.map((log, index) => (
                <div key={index} className="grid grid-cols-7 gap-4 items-center py-3 border-b border-gray-100 hover:bg-muted/50 text-sm">
                  <span className="font-mono text-xs">{log.time}</span>
                  <div>
                    <div className="font-medium">{log.userEmail}</div>
                    <div className="text-xs text-muted-foreground">{log.userType}</div>
                  </div>
                  <span>{log.action}</span>
                  <span>{log.resource}</span>
                  <Badge variant="outline" className={getStatusColor(log.status)}>
                    {log.status}
                  </Badge>
                  <Badge variant="outline" className={getSeverityColor(log.severity)}>
                    {log.severity}
                  </Badge>
                  <span className="font-mono text-xs">{log.ipAddress || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AuditLogs;