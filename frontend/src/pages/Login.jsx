import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Eye, EyeOff, Lock, Mail, User, Shield, Briefcase, Sun, Moon } from 'lucide-react';

const Login = () => {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
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
        setSuccess('Login successful! Redirecting...');
        
        // Redirect to protected origin route or dashboard
        const origin = location.state?.from?.pathname || '/dashboard';
        setTimeout(() => navigate(origin, { replace: true }), 1000);
      } else {
        if (!roleId) {
          throw new Error('Please select a role');
        }
        
        const payload = {
          email,
          password,
          firstName,
          lastName,
          roleId: parseInt(roleId, 10),
          departmentId: departmentId ? parseInt(departmentId, 10) : null
        };
        
        await register(payload);
        setSuccess('Registration successful! You can now sign in.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
      if (err.errors) {
        const errorMap = {};
        err.errors.forEach(e => {
          if (errorMap[e.field]) {
            errorMap[e.field] += '. ' + e.message;
          } else {
            errorMap[e.field] = e.message;
          }
        });
        setFieldErrors(errorMap);
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Theme Toggle Button (floating top-right) */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            fontSize: '20px',
            lineHeight: 1,
            transition: 'transform 200ms ease, opacity 200ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'rotate(15deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          type="button"
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="glass-card max-w-md w-full p-8 animate-fade-in-up" style={{ zIndex: 1, position: 'relative' }}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>CFMS Portal</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Customer Feedback Management System</p>
        </div>

        {/* Tab Selector */}
        <div className="tab-container mb-6">
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

        {error && (
          <div className="p-4 mb-4 rounded-lg text-red-400" style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--border-card)',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 mb-4 rounded-lg text-green-400" style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid var(--border-card)',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
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
                    className="glass-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                {fieldErrors.firstName && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.firstName}</span>}
              </div>
              <div>
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
                    className="glass-input"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                {fieldErrors.lastName && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.lastName}</span>}
              </div>
            </div>
          )}

          <div>
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
                className="glass-input"
                style={{ paddingLeft: '44px' }}
              />
            </div>
            {fieldErrors.email && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.email}</span>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium block" style={{ color: 'var(--text-secondary)' }}>Password</label>
              {isLogin && (
                <span
                  onClick={() => navigate('/forgot-password')}
                  className="text-xs hover:underline cursor-pointer"
                  style={{ color: 'var(--brand-primary)' }}
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
                className="glass-input"
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
            {!isLogin && (
              <span className="text-slate-400 text-[11px] mt-1.5 block text-left" style={{ lineHeight: 1.3 }}>
                Requirements: Minimum 6 characters, at least 1 number, and 1 uppercase letter.
              </span>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8', zIndex: 2 }}>
                    <Shield size={18} />
                  </span>
                  <select
                    required
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="glass-input glass-select"
                    style={{ paddingLeft: '44px' }}
                  >
                    <option value="">Select Role</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.roleId && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.roleId}</span>}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Department (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8', zIndex: 2 }}>
                    <Briefcase size={18} />
                  </span>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="glass-input glass-select"
                    style={{ paddingLeft: '44px' }}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.departmentId && <span className="text-red-400 text-xs mt-1 block text-left">{fieldErrors.departmentId}</span>}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glass-button mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </span>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
