import React from 'react';
import CustomSelect from './common/CustomSelect';

const FilterTabs = ({ 
  selectedStatus, 
  setSelectedStatus, 
  sortBy, 
  setSortBy, 
  selectedDept, 
  setSelectedDept, 
  categories = []
}) => {
  return (
    <section 
      style={{ 
        marginTop: '16px', 
        display: 'flex', 
        justifyContent: 'flex-end', 
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
      {/* Custom dropdown selects */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          gap: '12px',
          justifyContent: 'flex-end'
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
