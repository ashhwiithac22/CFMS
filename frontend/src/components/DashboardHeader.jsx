import React from 'react';
import { Search, Calendar, Download, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DashboardHeader = ({ searchQuery, setSearchQuery, onRaiseComplaint }) => {
  const { user } = useAuth();
  const isSalesExec = user?.role === 'Sales Executive';

  return (
    <section 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        width: '100%', 
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Title & subtitle info */}
      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        <h1 
          style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: 'var(--text-primary)', 
            margin: 0,
            lineHeight: 1.2
          }}
        >
          Complaint Dashboard
        </h1>
        <p 
          style={{ 
            fontSize: '14px', 
            color: 'var(--text-secondary)', 
            margin: '4px 0 0 0',
            lineHeight: 1.5
          }}
        >
          {user?.role === 'Sales Executive'
            ? 'Sales Executive Portal — Real-time Complaint Tracking & Escalation'
            : user?.role === 'Administrator'
            ? 'Administrator Portal — Real-time Complaint Tracking & Escalation'
            : `${user?.warehouseName || 'Tirupur Warehouse'} — Real-time SLA Tracking & Complaint Management`}
        </p>
      </div>

      {/* Toolbar actions */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          gap: '12px',
          justifyContent: 'flex-start'
        }}
      >
        {/* Search input with search icon */}
        <div style={{ position: 'relative', width: '240px', height: '40px', boxSizing: 'border-box' }}>
          <span 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search complaints..."
            style={{ 
              width: '100%', 
              height: '100%',
              padding: '0 12px 0 36px', 
              fontSize: '14px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Date picker display button (Hidden for Sales Executive) */}
        {!isSalesExec && (
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '0 16px', 
              height: '40px',
              fontSize: '14px', 
              fontWeight: '600', 
              backgroundColor: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
            type="button"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          >
            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
            <span>Jul 13 – Jul 15, 2024</span>
          </button>
        )}

        {/* Export action button (Hidden for Sales Executive) */}
        {!isSalesExec && (
          <button 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '0 16px', 
              height: '40px',
              fontSize: '14px', 
              fontWeight: '600', 
              backgroundColor: 'var(--bg-primary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
            type="button"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          >
            <Download size={16} style={{ color: 'var(--text-secondary)' }} />
            <span>Export</span>
          </button>
        )}

        {/* Primary Raise Complaint trigger (Visible for Sales Executive) */}
        {isSalesExec && (
          <button 
            onClick={onRaiseComplaint}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '0 20px', 
              height: '40px',
              fontSize: '14px', 
              fontWeight: '600', 
              borderRadius: '8px', 
              backgroundColor: 'var(--brand-primary)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
              transition: 'opacity 0.15s ease'
            }}
            type="button"
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Plus size={16} style={{ color: '#FFFFFF' }} />
            <span>Raise Complaint</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default DashboardHeader;
