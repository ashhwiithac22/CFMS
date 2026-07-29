import React, { useState } from 'react';
import { Clock, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';

const ComplaintsTable = ({ 
  complaints, 
  currentPage, 
  setCurrentPage, 
  onMessageClick, 
  onStatusChange, 
  isMobile,
  selectedQuickComplaint,
  onRowSelect
}) => {
  const pageSize = 5;
  const totalPages = Math.ceil(complaints.length / pageSize) || 1;
  const pageComplaints = complaints.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Hover states dictionary for table rows
  const [hoveredRowId, setHoveredRowId] = useState(null);

  // Map Category Type pill colors using theme variables
  const getTypeStyles = (type) => {
    return {
      'Mismatch': { backgroundColor: 'var(--mismatch-bg)', color: 'var(--mismatch-text)' },
      'Packaging': { backgroundColor: 'var(--packaging-bg)', color: 'var(--packaging-text)' },
      'Quality Issues': { backgroundColor: 'var(--quality-bg)', color: 'var(--quality-text)' },
      'Transport Related': { backgroundColor: 'var(--transport-bg)', color: 'var(--transport-text)' }
    }[type] || { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' };
  };

  // Map Status Badge pill colors using theme variables
  const getStatusStyles = (status) => {
    return {
      'Pending': { backgroundColor: 'var(--pending-bg)', color: 'var(--pending-text)' },
      'In Progress': { backgroundColor: 'var(--inprogress-bg)', color: 'var(--inprogress-text)' },
      'Escalated': { backgroundColor: 'var(--escalated-bg)', color: 'var(--escalated-text)' },
      'Completed': { backgroundColor: 'var(--completed-bg)', color: 'var(--completed-text)' }
    }[status] || { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' };
  };

  // Mobile stacked cards view
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
        {pageComplaints.map((comp) => {
          const typeStyles = getTypeStyles(comp.type);
          const statusStyles = getStatusStyles(comp.status);
          const isSelected = selectedQuickComplaint?.id === comp.id;
          
          return (
            <div 
              key={comp.id}
              onClick={(e) => {
                const tagName = e.target.tagName;
                if (tagName !== 'BUTTON' && !e.target.closest('button')) {
                  if (onRowSelect) onRowSelect(comp);
                }
              }}
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left',
                boxShadow: isSelected ? '0 4px 12px rgba(30,79,217,0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
                boxSizing: 'border-box',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--brand-primary)', fontSize: '14px' }}>{comp.id}</span>
                <span 
                  style={{ 
                    padding: '4px 10px', 
                    borderRadius: '12px', 
                    fontSize: '11px', 
                    fontWeight: 'bold', 
                    ...statusStyles,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyles.color }}></span>
                  {comp.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Customer:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{comp.customer}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Invoice:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{comp.invoice}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', ...typeStyles }}>
                  {comp.type}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>SLA Timer:</span>
                <span style={{ fontWeight: 'bold', color: comp.sla.includes('!') ? 'var(--color-escalated)' : 'var(--color-completed)' }}>
                  {comp.sla}
                </span>
              </div>

              {/* Actions row on mobile (full 44px height targets) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                <button 
                  onClick={() => onStatusChange(comp.id, 'In Progress')}
                  style={{ flex: '1 1 45%', height: '44px', borderRadius: '8px', backgroundColor: '#0F2A4A', color: '#FFFFFF', fontWeight: 'bold', border: 'none', fontSize: '12px', cursor: 'pointer' }}
                >
                  Take Action
                </button>
                <button 
                  onClick={() => onStatusChange(comp.id, 'Escalated')}
                  style={{ flex: '1 1 45%', height: '44px', borderRadius: '8px', border: '1px solid var(--color-pending)', backgroundColor: 'transparent', color: 'var(--color-pending)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Escalate
                </button>
                <button 
                  onClick={() => onStatusChange(comp.id, 'Completed')}
                  style={{ flex: '1 1 45%', height: '44px', borderRadius: '8px', border: '1px solid var(--color-completed)', backgroundColor: 'transparent', color: 'var(--color-completed)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Complete
                </button>
                <button 
                  onClick={() => onMessageClick(comp)}
                  style={{ flex: '1 1 45%', height: '44px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  Message
                </button>
              </div>
            </div>
          );
        })}

        {/* Pagination view */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ width: '44px', height: '44px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentPage === totalPages ? 0.4 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Desktop tabular layout
  return (
    <section 
      style={{ 
        width: '100%', 
        border: '1px solid var(--border-color)',
        borderRadius: '12px', 
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)',
        boxSizing: 'border-box'
      }}
    >
      {/* Scoped Horizontal Scroll container */}
      <div style={{ overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
        <table 
          style={{ 
            width: '100%', 
            minWidth: '1210px', // Exact minimum content width containing 9 columns
            tableLayout: 'fixed', 
            borderCollapse: 'collapse',
            boxSizing: 'border-box'
          }}
        >
          {/* Header Row */}
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '100px', minWidth: '100px', boxSizing: 'border-box' }}>Complaint ID</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '120px', minWidth: '120px', boxSizing: 'border-box' }}>Customer</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '130px', minWidth: '130px', boxSizing: 'border-box' }}>Invoice No.</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '180px', minWidth: '180px', boxSizing: 'border-box' }}>Category / Type</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '120px', minWidth: '120px', boxSizing: 'border-box' }}>Raised By</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '100px', minWidth: '100px', boxSizing: 'border-box' }}>SLA Timer</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'left', width: '120px', minWidth: '120px', boxSizing: 'border-box' }}>Status</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center', width: '70px', minWidth: '70px', boxSizing: 'border-box' }}>Attach.</th>
              <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right', width: '330px', minWidth: '330px', boxSizing: 'border-box' }}>Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody style={{ backgroundColor: 'var(--bg-primary)' }}>
            {pageComplaints.map((comp) => {
              const typeStyles = getTypeStyles(comp.type);
              const statusStyles = getStatusStyles(comp.status);
              
              const isBreached = comp.sla.includes('!');
              const isApproaching = parseInt(comp.sla) < 10 && !isBreached;
              
              let slaColor = 'var(--color-completed)'; // Green
              if (isBreached) {
                slaColor = 'var(--color-escalated)'; // Red
              } else if (isApproaching) {
                slaColor = 'var(--color-pending)'; // Orange
              }

              const isRowHovered = hoveredRowId === comp.id;
              const isSelected = selectedQuickComplaint?.id === comp.id;

              return (
                <tr
                  key={comp.id}
                  onMouseEnter={() => setHoveredRowId(comp.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                  onClick={(e) => {
                    const tagName = e.target.tagName;
                    if (tagName !== 'BUTTON' && tagName !== 'INPUT' && tagName !== 'SELECT' && tagName !== 'A' && !e.target.closest('button')) {
                      if (onRowSelect) onRowSelect(comp);
                    }
                  }}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--card-selected-bg)' : isRowHovered ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    borderLeft: isSelected ? '4px solid var(--brand-primary)' : 'none',
                    transition: 'background-color 150ms ease',
                    cursor: 'pointer'
                  }}
                >
                  {/* Complaint ID */}
                  <td style={{ padding: '14px 16px', width: '100px', minWidth: '100px', boxSizing: 'border-box', textAlign: 'left' }}>
                    <button 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: 0,
                        color: 'var(--brand-primary)', 
                        fontWeight: 'bold',
                        fontSize: '13px',
                        textDecoration: 'underline'
                      }}
                    >
                      {comp.id}
                    </button>
                  </td>

                  {/* Customer */}
                  <td style={{ padding: '14px 16px', width: '120px', minWidth: '120px', boxSizing: 'border-box', textAlign: 'left', fontSize: '13px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                    {comp.customer}
                  </td>

                  {/* Invoice No. */}
                  <td style={{ padding: '14px 16px', width: '130px', minWidth: '130px', boxSizing: 'border-box', textAlign: 'left', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                    {comp.invoice}
                  </td>

                  {/* Category / Type */}
                  <td style={{ padding: '14px 16px', width: '180px', minWidth: '180px', boxSizing: 'border-box', textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span 
                        style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '12px', 
                          fontWeight: 'bold',
                          width: 'fit-content',
                          whiteSpace: 'nowrap',
                          ...typeStyles 
                        }}
                      >
                        {comp.type}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                        {comp.subtype}
                      </span>
                    </div>
                  </td>

                  {/* Raised By */}
                  <td style={{ padding: '14px 16px', width: '120px', minWidth: '120px', boxSizing: 'border-box', textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{comp.raisedBy}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{comp.date}</span>
                    </div>
                  </td>

                  {/* SLA Timer */}
                  <td style={{ padding: '14px 16px', width: '100px', minWidth: '100px', boxSizing: 'border-box', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: slaColor, fontSize: '13px' }}>
                      <Clock size={14} style={{ color: slaColor }} />
                      <span>{comp.sla}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px', width: '120px', minWidth: '120px', boxSizing: 'border-box', textAlign: 'left' }}>
                    <span 
                      style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: 'fit-content',
                        ...statusStyles 
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusStyles.color }}></span>
                      {comp.status}
                    </span>
                  </td>

                  {/* Attach. */}
                  <td style={{ padding: '14px 16px', width: '70px', minWidth: '70px', boxSizing: 'border-box', textAlign: 'center' }}>
                    {comp.attach ? <Paperclip size={14} style={{ color: 'var(--text-secondary)', margin: '0 auto' }} /> : '—'}
                  </td>

                  {/* Actions cell: 4 buttons side by side */}
                  <td style={{ padding: '14px 16px', width: '330px', minWidth: '330px', boxSizing: 'border-box', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      
                      {/* Take Action */}
                      <button 
                        onClick={() => onStatusChange(comp.id, 'In Progress')}
                        style={{ 
                          height: '28px',
                          padding: '0 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: '#0F2A4A', 
                          color: '#FFFFFF',
                          transition: 'opacity 150ms ease',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        type="button"
                      >
                        Take Action
                      </button>

                      {/* Escalate */}
                      <button 
                        onClick={() => onStatusChange(comp.id, 'Escalated')}
                        style={{ 
                          height: '28px',
                          padding: '0 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: '1px solid var(--color-pending)',
                          cursor: 'pointer',
                          backgroundColor: 'transparent', 
                          color: 'var(--color-pending)',
                          transition: 'background-color 150ms ease',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--pending-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        type="button"
                      >
                        Escalate
                      </button>

                      {/* Complete */}
                      <button 
                        onClick={() => onStatusChange(comp.id, 'Completed')}
                        style={{ 
                          height: '28px',
                          padding: '0 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: '1px solid var(--color-completed)',
                          cursor: 'pointer',
                          backgroundColor: 'transparent', 
                          color: 'var(--color-completed)',
                          transition: 'background-color 150ms ease',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--completed-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        type="button"
                      >
                        Complete
                      </button>

                      {/* Message */}
                      <button 
                        onClick={() => onMessageClick(comp)}
                        style={{ 
                          height: '28px',
                          padding: '0 14px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: 'transparent', 
                          color: 'var(--text-secondary)',
                          transition: 'background-color 150ms ease',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        type="button"
                      >
                        Message
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & detail summary footer row */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '14px 16px', 
          borderTop: '1px solid var(--border-color)', 
          backgroundColor: 'var(--bg-primary)',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
          Showing {Math.min(complaints.length, (currentPage - 1) * pageSize + 1)}–{Math.min(complaints.length, currentPage * pageSize)} of {complaints.length} complaints for Tirupur Warehouse
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: 'bold' }}>
          {/* Prev chevron */}
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxSizing: 'border-box',
              opacity: currentPage === 1 ? 0.4 : 1
            }}
            type="button"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Numbered buttons */}
          {[...Array(totalPages).keys()].map(idx => {
            const page = idx + 1;
            const isCurrent = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: isCurrent ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: isCurrent ? 'var(--brand-primary)' : 'var(--bg-primary)',
                  color: isCurrent ? '#FFFFFF' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
                type="button"
              >
                {page}
              </button>
            );
          })}

          {/* Next chevron */}
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)', 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)',
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxSizing: 'border-box',
              opacity: currentPage === totalPages ? 0.4 : 1
            }}
            type="button"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default ComplaintsTable;
