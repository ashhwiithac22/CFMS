import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const Card = ({
  children,
  onClick,
  hoverable = true,
  className = '',
  style = {},
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  const hoverAnimation = (hoverable && !shouldReduceMotion) ? {
    whileHover: { y: -4, scale: 1.01 },
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  } : {};

  return (
    <motion.div
      onClick={onClick}
      style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: onClick ? 'pointer' : 'default',
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...style
      }}
      className={`glass-card ${className}`}
      {...hoverAnimation}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
