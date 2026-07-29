import React, { useState } from 'react';

const StatCard = ({ title, value, icon, color, status, activeStatus, onClick }) => {
  const isActive = activeStatus === status;
  const [isHovered, setIsHovered] = useState(false);

  // Status-colored 32px circular badge color mapping using CSS variables
  const badgeColors = {
    slate: { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
    amber: { bg: 'var(--pending-bg)', text: 'var(--pending-text)' },
    blue: { bg: 'var(--inprogress-bg)', text: 'var(--inprogress-text)' },
    red: { bg: 'var(--escalated-bg)', text: 'var(--escalated-text)' },
    green: { bg: 'var(--completed-bg)', text: 'var(--completed-text)' }
  }[color] || { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isActive ? 'var(--card-selected-bg)' : 'var(--bg-primary)',
        border: isActive ? '2px solid var(--card-selected-border)' : '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: isActive 
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.08)' 
          : isHovered 
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
            : '0 1px 3px rgba(0, 0, 0, 0.06)',
        transform: (!isActive && isHovered) ? 'translateY(-2px)' : 'none',
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Top row: Title and Icon Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span 
          style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: 'var(--text-secondary)',
            textTransform: 'none'
          }}
        >
          {title}
        </span>
        <div 
          style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            backgroundColor: badgeColors.bg, 
            color: badgeColors.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {React.cloneElement(icon, { size: 16, style: { color: badgeColors.text } })}
        </div>
      </div>

      {/* Large value text */}
      <span 
        style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)',
          lineHeight: 1,
          textAlign: 'left'
        }}
      >
        {value}
      </span>
    </div>
  );
};

export default StatCard;
