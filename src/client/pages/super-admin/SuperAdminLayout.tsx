import React from 'react';
import { Outlet, Navigate } from 'react-router';
import { useAuth } from '@client/provider/AuthProvider';
import Authorized from '@client/components/auth/Authorized';

const SuperAdminLayout: React.FC = () => {
  const { user } = useAuth();

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check if user has super admin role or is marked as super admin
  const isSuperAdmin = user.isSuperAdmin || user.roles.includes('super_admin');
  
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
    <Authorized roles="super_admin">
      <Outlet />
    </Authorized>
  );
};

export default SuperAdminLayout;