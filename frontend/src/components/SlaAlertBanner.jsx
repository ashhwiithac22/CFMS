import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const SlaAlertBanner = ({ breachCount, onViewEscalatedClick }) => {
  const isZero = breachCount === 0;

  return (
    <section 
      className="animate-banner-down"
      style={{ 
        width: '100%',
        marginTop: '16px',
        backgroundColor: isZero ? 'rgba(16, 185, 129, 0.08)' : 'var(--sla-banner-bg)', 
        borderLeft: isZero ? '4px solid #10B981' : '4px solid var(--color-escalated)', 
        borderRadius: '8px', 
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'all 150ms ease'
      }}
    >
      {/* Left stack: icon + title + detail sentence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
        {isZero ? (
          <CheckCircle size={18} style={{ color: '#10B981', flexShrink: 0 }} />
        ) : (
          <AlertTriangle size={18} style={{ color: 'var(--color-escalated)', flexShrink: 0 }} />
        )}
        <span 
          style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: isZero ? '#10B981' : 'var(--escalated-text)', 
            marginRight: '6px'
          }}
        >
          {isZero ? 'SLA Status' : 'SLA Breach Alert'}
        </span>
        <span 
          style={{ 
            fontSize: '14px', 
            fontWeight: 'normal', 
            color: isZero ? 'var(--text-secondary)' : 'var(--escalated-text)' 
          }}
        >
          {isZero ? (
            '— All complaints are within SLA. There are no escalated complaints.'
          ) : breachCount === 1 ? (
            '— 1 complaint has exceeded the SLA resolution threshold and requires immediate management attention.'
          ) : (
            `— ${breachCount} complaints have exceeded the SLA resolution threshold and require immediate management attention.`
          )}
        </span>
      </div>

      {/* Right side trigger link */}
      {!isZero && (
        <button 
          onClick={onViewEscalatedClick}
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
      )}
    </section>
  );
};

export default SlaAlertBanner;
