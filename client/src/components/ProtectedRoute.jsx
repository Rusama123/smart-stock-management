import React from 'react';
import { Navigate } from 'react-router-dom';

// Protected Route - For both Admin and User
export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Allow both admin, superadmin, and user
  if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'user') {
    return children;
  }

  return <Navigate to="/admin/login" replace />;
};

// Protected Admin Route - For Admin and Super Admin only
export const ProtectedAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Only allow admin and superadmin
  if (userRole === 'admin' || userRole === 'superadmin') {
    return children;
  }

  // Redirect users to dashboard
  return <Navigate to="/admin/pages/dashboard" replace />;
};

// NEW: Protected Super Admin Route - For Super Admin ONLY
export const ProtectedSuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const userRole = user?.role;
  const userEmail = user?.email;
  const isSuperAdmin = user?.isSuperAdmin;

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if super admin by role OR email OR isSuperAdmin flag
  const hasSuperAdminAccess = userRole === 'superadmin' || 
                              isSuperAdmin === true ||
                              userEmail?.toLowerCase() === 'usama.rana.tech@gmail.com';

  if (hasSuperAdminAccess) {
    return children;
  }

  // Redirect non-super-admins to their respective pages
  if (userRole === 'admin') {
    return <Navigate to="/Admin/control-panel/admin-control" replace />;
  }
  
  return <Navigate to="/admin/pages/dashboard" replace />;
};