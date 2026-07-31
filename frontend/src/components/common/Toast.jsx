import React, { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({
  toast, // { id, message, type: 'success'|'error'|'info', duration: 4000 }
  onClose
}) => {
  const shouldReduceMotion = useReducedMotion();
  const duration = toast?.duration || 3500;

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 size={18} style={{ color: '#22C55E' }} />,
    error: <AlertCircle size={18} style={{ color: '#EF4444' }} />,
    info: <Info size={18} style={{ color: 'var(--color-primary)' }} />
  };

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.95 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        minWidth: '280px',
        maxWidth: '380px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: '10px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        color: 'var(--text-primary)',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {icons[toast.type] || icons.info}
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{toast.message}</span>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          type="button"
        >
          <X size={14} />
        </button>
      </div>

      {/* Shrinking progress bar timer */}
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        style={{
          height: '3px',
          backgroundColor: toast.type === 'error' ? '#EF4444' : toast.type === 'success' ? '#22C55E' : 'var(--color-primary)',
          transformOrigin: 'left'
        }}
      />
    </motion.div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => (
  <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
    <AnimatePresence>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onClose={removeToast} />
      ))}
    </AnimatePresence>
  </div>
);

export default Toast;
