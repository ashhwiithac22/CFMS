import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Card from './common/Card';

// Custom hook to animate number count-up on mount/change
const useCountUp = (targetValue, duration = 500) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const startValue = 0;
    const endValue = typeof targetValue === 'number' ? targetValue : parseInt(targetValue, 10) || 0;

    if (endValue === 0) {
      setDisplayValue(0);
      return;
    }

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease-out cubic formula
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (endValue - startValue) * easeOutProgress);
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
  }, [targetValue, duration]);

  return displayValue;
};

const StatCard = ({ title, value, icon, color, status, activeStatus, onClick }) => {
  const isActive = activeStatus === status;
  const [isHovered, setIsHovered] = useState(false);
  const animatedValue = useCountUp(value, 550);
  const shouldReduceMotion = useReducedMotion();

  // Status-colored 32px circular badge color mapping using CSS variables
  const badgeColors = {
    slate: { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' },
    amber: { bg: 'var(--pending-bg)', text: 'var(--pending-text)' },
    blue: { bg: 'var(--inprogress-bg)', text: 'var(--inprogress-text)' },
    red: { bg: 'var(--escalated-bg)', text: 'var(--escalated-text)' },
    green: { bg: 'var(--completed-bg)', text: 'var(--completed-text)' }
  }[color] || { bg: 'var(--bg-secondary)', text: 'var(--text-secondary)' };

  return (
    <Card
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isActive ? 'var(--card-selected-bg)' : 'var(--bg-primary)',
        border: isActive ? '2px solid var(--card-selected-border)' : '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: isActive 
          ? '0 4px 12px rgba(30, 79, 217, 0.18)' 
          : isHovered 
            ? '0 10px 20px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' 
            : '0 1px 3px rgba(0, 0, 0, 0.06)',
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
        <motion.div 
          animate={isHovered && !shouldReduceMotion ? { scale: 1.15 } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
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
        </motion.div>
      </div>

      {/* Large animated count-up value text */}
      <span 
        style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)',
          lineHeight: 1,
          textAlign: 'left'
        }}
      >
        {animatedValue}
      </span>
    </Card>
  );
};

export default StatCard;
