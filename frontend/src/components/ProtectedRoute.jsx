import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div 
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          color: 'var(--text-primary)', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}
      >
        <div style={{ width: '48px', height: '48px', border: '4px solid var(--brand-primary)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Verifying Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
