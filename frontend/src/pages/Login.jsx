import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Eye, EyeOff, Lock, Mail, User, ShieldCheck, Briefcase, Check, Clock, GitBranch } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import Button from '../components/common/Button';
import CustomSelect from '../components/common/CustomSelect';

const COMPLEXITY_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'At least 1 digit (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'At least 1 special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function PasswordChecklist({ password }) {
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2.5 p-3 rounded-lg border border-[var(--border-card)] bg-[var(--bg-body)]"
    >
      <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Password Requirements:</div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {COMPLEXITY_RULES.map((rule) => {
          const met = password.length > 0 && rule.test(password);
          return (
            <li 
              key={rule.id} 
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${
                met ? 'text-blue-500' : 'text-[var(--text-muted)]'
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold transition-all duration-200 ${
                met ? 'bg-blue-500 text-white' : 'border border-[var(--border-card)] bg-transparent'
              }`}>
                {met && <Check size={10} strokeWidth={3} />}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

const Login = () => {
  const { login, register } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Metadata for roles and departments
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // Fetch metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await api.get('/auth/metadata');
        if (response.ok) {
          const result = await response.json();
          setRoles(result.data.roles);
          setDepartments(result.data.departments);
        }
      } catch (err) {
        console.error('Failed to load signup metadata:', err);
      }
    };
    fetchMetadata();
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setRoleId('');
    setDepartmentId('');
    setError('');
    setFieldErrors({});
    setSuccess('');
  };

  const handleToggle = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        const origin = location.state?.from?.pathname || '/dashboard';
        navigate(origin, { replace: true });
      } else {
        if (!roleId) {
          throw new Error('Please select a role');
        }
        
        const payload = {
          email,
          password,
          firstName,
          lastName,
          role: roleId
        };
        
        await register(payload);
        setSuccess('Registration successful! Switching to Sign In...');
        setTimeout(() => {
          setIsLogin(true);
          setSuccess('');
          setPassword('');
        }, 1500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'An authentication error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="auth-split-container"
    >
      {/* Theme Toggle Top Right */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      {/* LEFT PANEL — Concrete Spec Redesign */}
      <div className="auth-hero-panel">

        {/* TOP BRANDING — Reduced top space, 40x40px badge, tight text */}
        <div className="auth-hero-branding">
          <div 
            style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '10px', 
              backgroundColor: '#3B5FE0', 
              color: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 500, 
              fontSize: '14px',
              flexShrink: 0
            }}
          >
            RC
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#F4F5F7', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              CFMS Portal
            </h2>
            <p style={{ fontSize: '12.5px', color: '#8B93A3', margin: 0, marginTop: '1px', fontWeight: 400 }}>
              Customer Feedback Management
            </p>
          </div>
        </div>

        {/* MIDDLE CONTENT */}
        <div className="auth-hero-content text-left">
          {/* Quieter Pill Badge */}
          <div className="mb-6 flex justify-start">
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '5px 12px', 
                borderRadius: '9999px', 
                backgroundColor: 'rgba(59, 95, 224, 0.08)', 
                border: '0.5px solid #2A3550', 
                color: '#A9BDF0', 
                fontSize: '11.5px', 
                fontWeight: 500
              }}
            >
              <ShieldCheck size={16} style={{ color: '#7BA1F5' }} />
              <span>Enterprise SLA & Escalation Governance</span>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: '38px', fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>
            <span style={{ color: '#F4F5F7' }}>Complaint lifecycle</span> <br />
            <span style={{ color: '#6690F2' }}>automation and escalation</span>
          </h1>

          {/* Body Text */}
          <p style={{ fontSize: '14px', color: '#8B93A3', lineHeight: 1.6, maxWidth: '400px', marginTop: '18px' }}>
            Track, escalate, and resolve customer feedback across all warehouses — all in one unified, real-time platform.
          </p>

          {/* Feature Cards — Single Bordered Container with Internal 1px Divider */}
          <div 
            style={{ 
              marginTop: '32px', 
              maxWidth: '420px', 
              borderRadius: '12px', 
              border: '0.5px solid #2A3550', 
              backgroundColor: '#1C2230', 
              overflow: 'hidden' 
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px' }}>
              
              {/* Card 1 */}
              <div style={{ backgroundColor: '#0D1119', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                <Clock size={18} style={{ color: '#6690F2' }} />
                <div style={{ fontSize: '11px', color: '#6690F2', fontWeight: 500, marginTop: '10px' }}>
                  Real-time SLA
                </div>
                <div style={{ fontSize: '14px', color: '#F4F5F7', fontWeight: 500, marginTop: '2px' }}>
                  24h auto-escalation
                </div>
              </div>

              {/* Card 2 */}
              <div style={{ backgroundColor: '#0D1119', padding: '18px 20px', display: 'flex', flexDirection: 'column' }}>
                <GitBranch size={18} style={{ color: '#6690F2' }} />
                <div style={{ fontSize: '11px', color: '#6690F2', fontWeight: 500, marginTop: '10px' }}>
                  Role oversight
                </div>
                <div style={{ fontSize: '14px', color: '#F4F5F7', fontWeight: 500, marginTop: '2px' }}>
                  Automated approval routing
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER TAGLINE */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 Ramraj Cotton</span>
          <span className="flex items-center gap-1.5 text-slate-300"><Briefcase size={13} /> Enterprise Portal</span>
        </div>
      </div>

      {/* RIGHT PANEL — Form Panel (UNTOUCHED) */}
      <div className="auth-form-panel">
        <div className="auth-form-card">
          
          {/* Mobile Logo Branding (Only visible on <768px via .auth-mobile-logo) */}
          <div className="auth-mobile-logo items-center gap-3 mb-6 justify-center">
            <div 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '10px', 
                backgroundColor: 'var(--color-primary)', 
                color: '#FFFFFF', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold', 
                fontSize: '16px' 
              }}
            >
              RC
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>CFMS Portal</h2>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>Complaint Management System</p>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-6 text-left">
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              {isLogin ? 'Sign In' : 'Create an account'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
              {isLogin 
                ? 'Enter your credentials to access your account' 
                : 'Fill in your details below to get started'}
            </p>
          </div>

          {/* Sign In vs Register Tab Switcher */}
          <div className="tab-container mb-6">
            <motion.div 
              layout
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="tab-indicator auth-tab-indicator"
              style={{
                transform: isLogin ? 'translateX(0%)' : 'translateX(100%)'
              }}
            />
            <button
              type="button"
              onClick={() => !isLogin && handleToggle()}
              className={`tab-btn ${isLogin ? 'active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => isLogin && handleToggle()}
              className={`tab-btn ${!isLogin ? 'active' : ''}`}
            >
              Register
            </button>
          </div>

          {/* Error / Success Feedback Alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 mb-4 rounded-xl text-red-500 text-xs font-medium"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 mb-4 rounded-xl text-green-500 text-xs font-medium"
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)'
                }}
              >
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isLogin ? 'signin' : 'register'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex flex-col gap-4"
              >
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass-input-group">
                      <label className="text-xs font-semibold mb-1.5 block text-[var(--text-secondary)]">First Name</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }}>
                          <User size={18} />
                        </span>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className={`glass-input rounded-xl ${fieldErrors.firstName ? 'invalid' : ''}`}
                          style={{ paddingLeft: '42px' }}
                        />
                      </div>
                      {fieldErrors.firstName && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.firstName}</span>}
                    </div>
                    <div className="glass-input-group">
                      <label className="text-xs font-semibold mb-1.5 block text-[var(--text-secondary)]">Last Name</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }}>
                          <User size={18} />
                        </span>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className={`glass-input rounded-xl ${fieldErrors.lastName ? 'invalid' : ''}`}
                          style={{ paddingLeft: '42px' }}
                        />
                      </div>
                      {fieldErrors.lastName && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.lastName}</span>}
                    </div>
                  </div>
                )}

                <div className="glass-input-group">
                  <label className="text-xs font-semibold mb-1.5 block text-[var(--text-secondary)]">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }}>
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@company.com"
                      className={`glass-input rounded-xl ${fieldErrors.email ? 'invalid' : ''}`}
                      style={{ paddingLeft: '42px' }}
                    />
                  </div>
                  {fieldErrors.email && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.email}</span>}
                </div>

                <div className="glass-input-group">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold block text-[var(--text-secondary)]">Password</label>
                    {isLogin && (
                      <span
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs font-semibold hover:underline cursor-pointer transition-colors text-blue-600 dark:text-blue-400"
                      >
                        Forgot Password?
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }}>
                      <Lock size={18} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`glass-input rounded-xl ${fieldErrors.password ? 'invalid' : ''}`}
                      style={{ paddingLeft: '42px', paddingRight: '42px' }}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '14px', top: '13px', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </span>
                  </div>
                  {fieldErrors.password && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.password}</span>}

                  {/* Password Complexity Checklist for Register flow */}
                  {!isLogin && password.length > 0 && (
                    <PasswordChecklist password={password} />
                  )}
                </div>

                {!isLogin && (
                  <>
                    <div className="glass-input-group">
                      <label className="text-xs font-semibold mb-1.5 block text-[var(--text-secondary)]">Role</label>
                      <CustomSelect
                        value={roleId}
                        onChange={(val) => setRoleId(val)}
                        placeholder="Select Role"
                        options={roles.map((r) => ({ value: r.id, label: r.name }))}
                        style={{ width: '100%' }}
                      />
                      {fieldErrors.roleId && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.roleId}</span>}
                    </div>

                    <div className="glass-input-group">
                      <label className="text-xs font-semibold mb-1.5 block text-[var(--text-secondary)]">Department (Optional)</label>
                      <CustomSelect
                        value={departmentId}
                        onChange={(val) => setDepartmentId(val)}
                        placeholder="Select Department"
                        options={[{ value: '', label: 'Select Department' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  size="lg"
                  className="mt-3 w-full py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </motion.div>
            </AnimatePresence>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;
