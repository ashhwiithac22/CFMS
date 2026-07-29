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
    // Role not authorized, redirect to placeholder dashboard or show access denied
    return (
      <div 
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          minHeight: '100vh', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '16px' 
        }}
      >
        <div className="glass-card max-w-md w-full p-8 text-center border border-red-500/20">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">You do not have permission to view this resource. Your role ({user.role}) is unauthorized.</p>
          <button 
            onClick={() => window.history.back()} 
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition duration-300 shadow-lg shadow-blue-600/20"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
