import React from 'react';
import { ChevronDown } from 'lucide-react';

const FilterTabs = ({ 
  selectedStatus, 
  setSelectedStatus, 
  sortBy, 
  setSortBy, 
  selectedDept, 
  setSelectedDept, 
  counts
}) => {
  return (
    <section 
      style={{ 
        marginTop: '16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap', 
        gap: '16px',
        width: '100%',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Left side: pill tab buttons */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px',
          alignItems: 'center'
        }}
      >
        {[
          { status: 'All', label: 'All', count: counts.all },
          { status: 'Pending', label: 'Pending', count: counts.pending },
          { status: 'In Progress', label: 'In Progress', count: counts.inprogress },
          { status: 'Escalated', label: 'Escalated', count: counts.escalated },
          { status: 'Completed', label: 'Completed', count: counts.completed }
        ].map(tab => {
          const isActive = selectedStatus === tab.status;
          return (
            <button
              key={tab.status}
              onClick={() => setSelectedStatus(tab.status)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                boxSizing: 'border-box',
                border: isActive ? 'none' : '1px solid var(--border-color)',
                backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-primary)',
                color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                height: '36px'
              }}
              type="button"
            >
              <span>{tab.label}</span>
              <span 
                style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  backgroundColor: isActive ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                  color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  lineHeight: 1
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right side: three dropdown selects */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          gap: '12px' 
        }}
      >
        {/* Dropdown 1: Sort by */}
        <div 
          style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0 12px',
            height: '40px',
            boxSizing: 'border-box',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '4px' }}>Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)} 
            style={{ 
              border: 'none', 
              outline: 'none', 
              fontSize: '14px', 
              fontWeight: '600', 
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              paddingRight: '20px',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="Raised Date" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Raised Date</option>
            <option value="ID" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Complaint ID</option>
            <option value="Priority" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Priority</option>
          </select>
          <span 
            style={{ 
              position: 'absolute', 
              right: '10px', 
              pointerEvents: 'none', 
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
          </span>
        </div>

        {/* Dropdown 2: Category */}
        <div 
          style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0 12px',
            height: '40px',
            boxSizing: 'border-box',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '4px' }}>Category:</span>
          <select 
            value={selectedDept} 
            onChange={(e) => setSelectedDept(e.target.value)} 
            style={{ 
              border: 'none', 
              outline: 'none', 
              fontSize: '14px', 
              fontWeight: '600', 
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              paddingRight: '20px',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="All" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>All</option>
            <option value="Mismatch" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Mismatch</option>
            <option value="Packaging" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Packaging</option>
            <option value="Quality Issues" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Quality Issues</option>
            <option value="Transport Related" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Transport Related</option>
          </select>
          <span 
            style={{ 
              position: 'absolute', 
              right: '10px', 
              pointerEvents: 'none', 
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
          </span>
        </div>

        {/* Dropdown 3: Status */}
        <div 
          style={{ 
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0 12px',
            height: '40px',
            boxSizing: 'border-box',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '4px' }}>Status:</span>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)} 
            style={{ 
              border: 'none', 
              outline: 'none', 
              fontSize: '14px', 
              fontWeight: '600', 
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              paddingRight: '20px',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="All" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>All</option>
            <option value="Pending" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Pending</option>
            <option value="In Progress" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>In Progress</option>
            <option value="Escalated" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Escalated</option>
            <option value="Completed" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Completed</option>
          </select>
          <span 
            style={{ 
              position: 'absolute', 
              right: '10px', 
              pointerEvents: 'none', 
              display: 'flex', 
              alignItems: 'center' 
            }}
          >
            <ChevronDown size={14} style={{ color: 'var(--text-secondary)' }} />
          </span>
        </div>
      </div>
    </section>
  );
};

export default FilterTabs;
