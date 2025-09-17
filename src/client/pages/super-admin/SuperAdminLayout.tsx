import React from 'react';
import { Outlet, Navigate } from 'react-router';
import { useAuth } from '@client/provider/AuthProvider';
import Authorized from '@client/components/auth/Authorized';
import { AppSidebar } from '@client/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@client/components/ui/sidebar';
import { ModeToggle } from '@client/components/ModeToggle';
import ConsoleErrorBoundary from '@client/components/error/ConsoleErrorBoundary';

const SuperAdminLayout: React.FC = () => {
  const { user } = useAuth();

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check if user has super admin role or is marked as super admin
  const isSuperAdmin = user.isSuperAdmin || user.roles.includes('SYSADMIN');
  
  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the Super Admin panel.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Super Admin access is required to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Authorized roles="SYSADMIN">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 z-10 sticky top-0 items-center bg-background border-b gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
            </div>
            <div className="ml-auto px-4">
              <div className="flex items-center gap-2 text-sm">
                <ModeToggle />
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col p-4 pt-4">
            <ConsoleErrorBoundary resetOnLocationChange={true}>
              <Outlet />
            </ConsoleErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Authorized>
  );
};

export default SuperAdminLayout;