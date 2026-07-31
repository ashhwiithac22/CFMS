import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggle = ({ className = '', style = {} }) => {
  const { theme, toggleTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const isDark = theme === 'dark';

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={shouldReduceMotion ? {} : { scale: 1.08 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      style={{
        background: 'transparent',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        width: '38px',
        height: '38px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...style
      }}
      className={className}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={shouldReduceMotion ? { opacity: 0 } : { y: -20, opacity: 0, rotate: -90 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1, rotate: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0, rotate: 90 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isDark ? (
            <Moon size={18} style={{ color: '#F59E0B' }} />
          ) : (
            <Sun size={18} style={{ color: '#F59E0B' }} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
};

export default ThemeToggle;
