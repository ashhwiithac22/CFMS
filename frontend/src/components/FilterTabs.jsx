import React from 'react';
import CustomSelect from './common/CustomSelect';

const FilterTabs = ({ 
  selectedStatus, 
  setSelectedStatus, 
  sortBy, 
  setSortBy, 
  selectedDept, 
  setSelectedDept, 
  counts,
  categories = []
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
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 30
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
              className="pill-hover"
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 180ms ease',
                boxSizing: 'border-box',
                border: isActive ? 'none' : '1px solid var(--border-color)',
                backgroundColor: isActive ? 'var(--brand-primary)' : 'var(--bg-primary)',
                color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                height: '36px',
                boxShadow: isActive ? '0 2px 8px rgba(30, 79, 217, 0.25)' : 'none'
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

      {/* Right side: three custom dropdown selects */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          gap: '12px' 
        }}
      >
        {/* Dropdown 1: Sort by */}
        <CustomSelect 
          label="Sort by:"
          value={sortBy}
          onChange={setSortBy}
          align="left"
          style={{ minWidth: '170px' }}
          options={[
            { value: 'Raised Date', label: 'Raised Date' },
            { value: 'ID', label: 'Complaint ID' },
            { value: 'Priority', label: 'Priority' }
          ]}
        />

        {/* Dropdown 2: Category */}
        <CustomSelect 
          label="Category:"
          value={selectedDept}
          onChange={setSelectedDept}
          align="right"
          style={{ minWidth: '180px' }}
          options={[
            { value: 'All', label: 'All' },
            ...categories.map(cat => ({ value: cat.name, label: cat.name }))
          ]}
        />

        {/* Dropdown 3: Status */}
        <CustomSelect 
          label="Status:"
          value={selectedStatus}
          onChange={setSelectedStatus}
          align="right"
          style={{ minWidth: '155px' }}
          options={[
            { value: 'All', label: 'All' },
            { value: 'Pending', label: 'Pending' },
            { value: 'In Progress', label: 'In Progress' },
            { value: 'Escalated', label: 'Escalated' },
            { value: 'Completed', label: 'Completed' }
          ]}
        />
      </div>
    </section>
  );
};

export default FilterTabs;
