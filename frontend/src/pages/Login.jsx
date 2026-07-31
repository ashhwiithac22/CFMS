import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Eye, EyeOff, Lock, Mail, User, Shield, Briefcase, Sun, Moon } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import Button from '../components/common/Button';
import CustomSelect from '../components/common/CustomSelect';

const Login = () => {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-auth-mesh"
    >
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <ThemeToggle />
      </div>

      <motion.div 
        layout
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="glass-card-auth max-w-md w-full" 
        style={{ zIndex: 1, position: 'relative', overflow: 'hidden' }}
      >
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-2">
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
                fontSize: '17px',
                boxShadow: '0 4px 12px rgba(30, 79, 217, 0.25)'
              }}
            >
              RC
            </div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)', margin: 0 }}>CFMS Portal</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Customer Feedback Management System</p>
        </div>

        <div className="tab-container mb-6">
          <motion.div 
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="tab-indicator"
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

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 mb-4 rounded-lg text-red-400"
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid var(--border-card)',
                fontSize: '14px'
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
              className="p-4 mb-4 rounded-lg text-green-400"
              style={{
                background: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid var(--border-card)',
                fontSize: '14px'
              }}
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

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
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>First Name</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                        <User size={18} />
                      </span>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className={`glass-input ${fieldErrors.firstName ? 'invalid' : ''}`}
                        style={{ paddingLeft: '44px' }}
                      />
                    </div>
                    {fieldErrors.firstName && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.firstName}</span>}
                  </div>
                  <div className="glass-input-group">
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                        <User size={18} />
                      </span>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className={`glass-input ${fieldErrors.lastName ? 'invalid' : ''}`}
                        style={{ paddingLeft: '44px' }}
                      />
                    </div>
                    {fieldErrors.lastName && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.lastName}</span>}
                  </div>
                </div>
              )}

              <div className="glass-input-group">
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@company.com"
                    className={`glass-input ${fieldErrors.email ? 'invalid' : ''}`}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                {fieldErrors.email && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.email}</span>}
              </div>

              <div className="glass-input-group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium block" style={{ color: 'var(--text-secondary)' }}>Password</label>
                  {isLogin && (
                    <span
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs hover:underline cursor-pointer"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Forgot Password?
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`glass-input ${fieldErrors.password ? 'invalid' : ''}`}
                    style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '16px', top: '14px', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </span>
                </div>
                {fieldErrors.password && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.password}</span>}
              </div>

              {!isLogin && (
                <>
                  <div className="glass-input-group">
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Role</label>
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
                    <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Department (Optional)</label>
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
                className="mt-4"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </motion.div>
          </AnimatePresence>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Login;
