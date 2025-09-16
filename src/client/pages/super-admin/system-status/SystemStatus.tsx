import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/components/ui/card';
import { Button } from '@client/components/ui/button';
import { Badge } from '@client/components/ui/badge';
import { Activity, Database, Server, HardDrive, Gauge, FileText, Shield, Settings, RefreshCw } from 'lucide-react';

// Mock data - will be replaced with real API calls later
const systemData = {
  overview: {
    status: 'Healthy',
    uptime: '6d 6h 10m',
    version: '1.0.0',
    environment: 'Development'
  },
  infrastructure: {
    database: {
      status: 'connected',
      responseTime: '15ms',
      connections: 1709,
      connectionUsage: '1%'
    },
    redis: {
      status: 'connected', 
      hitRate: '99.8%',
      memoryUsage: 473,
      cacheEfficiency: '92.0%'
    }
  },
  serverPerformance: {
    cpu: {
      usage: 17,
      label: 'CPU Usage'
    },
    memory: {
      usage: 31,
      label: 'Memory'
    },
    disk: {
      usage: 32,
      label: 'Disk Usage'
    },
    load: {
      average: 0.5,
      label: 'Load Average'
    }
  },
  apiPerformance: {
    requestsPerSecond: 79,
    avgResponseTime: '178ms',
    errorRate: 1.70,
    totalRequests: 1252146
  },
  actions: [
    {
      title: 'Export Logs',
      description: 'Download and process logs',
      icon: FileText
    },
    {
      title: 'Security Scan',
      description: 'Run security check',
      icon: Shield
    },
    {
      title: 'System Config',
      description: 'Manage settings',
      icon: Settings
    }
  ]
};

export function SystemStatus() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Management</h1>
          <p className="text-muted-foreground">Monitor system health, performance, and infrastructure metrics</p>
        </div>
        <Button className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold text-green-600">{systemData.overview.status}</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">{systemData.overview.uptime}</p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-2xl font-bold">{systemData.overview.version}</p>
              </div>
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Environment</p>
                <p className="text-2xl font-bold">{systemData.overview.environment}</p>
              </div>
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {systemData.infrastructure.database.status}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Response Time</span>
                <span className="font-medium">{systemData.infrastructure.database.responseTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-medium">{systemData.infrastructure.database.connections.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Connection Usage</span>
                <span className="font-medium">{systemData.infrastructure.database.connectionUsage}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Redis Cache
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                {systemData.infrastructure.redis.status}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hit Rate</span>
                <span className="font-medium">{systemData.infrastructure.redis.hitRate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Memory Usage</span>
                <span className="font-medium">{systemData.infrastructure.redis.memoryUsage}MB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cache Efficiency</span>
                <span className="font-medium">{systemData.infrastructure.redis.cacheEfficiency}</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(systemData.serverPerformance).map(([key, metric]) => (
              <div key={key} className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {key === 'load' ? metric.average : `${metric.usage}%`}
                </div>
                <div className="text-sm text-muted-foreground mb-3">{metric.label}</div>
                {key !== 'load' && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metric.usage > 80 ? 'bg-red-500' : 
                        metric.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${metric.usage}%` }}
                    ></div>
                  </div>
                )}
                {key === 'load' && (
                  <div className="text-xs text-muted-foreground">1 min average</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            API Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{systemData.apiPerformance.requestsPerSecond}</div>
              <div className="text-sm text-muted-foreground">Requests/Sec</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{systemData.apiPerformance.avgResponseTime}</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{systemData.apiPerformance.errorRate}%</div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{systemData.apiPerformance.totalRequests.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Requests (24h)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemData.actions.map((action, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <action.icon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{action.title}</p>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemStatus;