import React from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = ({ profileDropdownOpen, setProfileDropdownOpen, handleLogout, onToggleSidebar, isDesktop }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    return 'KS';
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return 'Karthik S.';
  };

  const getUserRole = () => {
    return user?.role || 'Warehouse Team';
  };

  return (
    <header 
      style={{ 
        height: '64px',
        backgroundColor: 'var(--brand-primary)', // Dynamic royal/bright blue
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        width: '100%',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        userSelect: 'none'
      }}
    >
      {/* Left side: Hamburger menu (if mobile) + RC Logo square + Title/Subtitle two-line stack */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isDesktop && (
          <button
            onClick={onToggleSidebar}
            style={{ 
              width: '36px', 
              height: '36px', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              marginRight: '4px',
              padding: 0,
              borderRadius: '8px'
            }}
            type="button"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>☰</span>
          </button>
        )}
        
        {/* White square logo badge */}
        <div 
          style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold', 
            fontSize: '16px',
            backgroundColor: '#FFFFFF', 
            color: '#1E4FD9' // Logo text matches navbar blue
          }}
        >
          RC
        </div>

        {/* Two-line text stack with 4px gap from logo */}
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '4px', lineHeight: 1.1, textAlign: 'left' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#FFFFFF' }}>Complaint Portal</span>
          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#C7D6FF', marginTop: '2px' }}>
            Logistics Quality Assurance Matrix
          </span>
        </div>
      </div>

      {/* Right side: Role/Location, separator dot, Bell icon, User avatar & dropdown chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* (a) Role text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }}></span>
          <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: 'normal' }}>{getUserRole()}</span>
        </div>

        {/* (b) Dot separator */}
        <span style={{ fontSize: '14px', color: '#FFFFFF', opacity: 0.8 }}>·</span>

        {/* (c) Location text */}
        <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: 'normal' }}>Tirupur Warehouse</span>

        {/* (d) Bell Icon (white, 20px) with red badge */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <button 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              padding: '6px', 
              borderRadius: '8px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            type="button"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Bell size={20} style={{ color: '#FFFFFF' }} />
            <span 
              style={{ 
                position: 'absolute', 
                top: '0px', 
                right: '0px', 
                backgroundColor: '#EF4444', 
                color: '#FFFFFF', 
                width: '16px',
                height: '16px',
                fontSize: '10px', 
                fontWeight: 'bold', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1
              }}
            >
              5
            </span>
          </button>
        </div>

        {/* Theme Toggle Button next to Bell */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            transition: 'transform 200ms ease',
            color: '#FFFFFF'
          }}
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'rotate(15deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </button>

        {/* (e) Circular Avatar + User text + Dropdown Chevron */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div 
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              cursor: 'pointer', 
              padding: '4px 8px', 
              borderRadius: '8px',
              transition: 'background-color 150ms ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {/* User Avatar */}
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '12px', 
                backgroundColor: '#4F7CFF', 
                color: '#FFFFFF'
              }}
            >
              {getInitials()}
            </div>
            
            {/* User name text */}
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#FFFFFF' }}>
              {getUserName()}
            </span>

            {/* Dropdown Chevron */}
            <ChevronDown size={14} style={{ color: '#FFFFFF' }} />
          </div>

          {profileDropdownOpen && (
            <div 
              style={{ 
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                width: '192px',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-color)',
                padding: '8px',
                zIndex: 1000,
                backgroundColor: 'var(--bg-floating)', 
                color: 'var(--text-primary)'
              }}
            >
              <div 
                style={{ 
                  padding: '8px 12px', 
                  borderBottom: '1px solid var(--border-color)', 
                  fontSize: '10px', 
                  color: 'var(--text-muted)' 
                }}
              >
                Signed in as <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '2px' }}>{user?.email || 'admin@complaint.com'}</strong>
              </div>
              <button
                onClick={() => { setProfileDropdownOpen(false); window.location.href = '/change-password'; }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                type="button"
              >
                <span>Change Password</span>
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: '#EF4444'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                type="button"
              >
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
