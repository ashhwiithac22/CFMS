import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={shouldReduceMotion ? { opacity: 0.6 } : { opacity: [0.35, 0.75, 0.35] }}
      transition={{
        repeat: Infinity,
        duration: 1.2,
        ease: 'easeInOut'
      }}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--border-color)',
        boxSizing: 'border-box',
        ...style
      }}
    />
  );
};

export const StatCardSkeleton = () => (
  <div
    style={{
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      boxSizing: 'border-box'
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonBox width="80px" height="14px" />
      <SkeletonBox width="32px" height="32px" borderRadius="50%" />
    </div>
    <SkeletonBox width="60px" height="32px" />
  </div>
);

export const TableRowSkeleton = () => (
  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="70px" height="16px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="90px" height="16px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="100px" height="16px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="110px" height="24px" borderRadius="12px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="90px" height="16px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="60px" height="16px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="80px" height="24px" borderRadius="12px" /></td>
    <td style={{ padding: '14px 16px' }}><SkeletonBox width="20px" height="16px" /></td>
    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <SkeletonBox width="80px" height="28px" borderRadius="6px" />
        <SkeletonBox width="70px" height="28px" borderRadius="6px" />
      </div>
    </td>
  </tr>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <tbody className="w-full">
    {Array.from({ length: rows }).map((_, i) => (
      <TableRowSkeleton key={i} />
    ))}
  </tbody>
);

export default SkeletonBox;
