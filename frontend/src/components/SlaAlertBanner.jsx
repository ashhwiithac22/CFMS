import React from 'react';
import { AlertTriangle } from 'lucide-react';

const SlaAlertBanner = ({ breachCount }) => {
  if (breachCount === 0) return null;

  return (
    <section 
      style={{ 
        width: '100%',
        marginTop: '16px',
        backgroundColor: 'var(--sla-banner-bg)', // Dedicated SLA banner bg
        borderLeft: '4px solid var(--color-escalated)', // Dynamic red left border
        borderRadius: '8px', 
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Left stack: icon + title + detail sentence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
        <AlertTriangle size={18} style={{ color: 'var(--color-escalated)', flexShrink: 0 }} />
        <span 
          style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: 'var(--escalated-text)', // Dynamic red text
            marginRight: '6px'
          }}
        >
          SLA Breach Alert
        </span>
        <span 
          style={{ 
            fontSize: '14px', 
            fontWeight: 'normal', 
            color: 'var(--escalated-text)' // Dynamic red text
          }}
        >
          — {breachCount} complaints have exceeded the SLA resolution threshold and require immediate management attention.
        </span>
      </div>

      {/* Right side trigger link */}
      <button 
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontSize: '14px',
          fontWeight: 'bold',
          color: 'var(--color-escalated)',
          textDecoration: 'underline',
          whiteSpace: 'nowrap'
        }}
        type="button"
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--escalated-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-escalated)'}
      >
        View All Escalated
      </button>
    </section>
  );
};

export default SlaAlertBanner;
