import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Eye, EyeOff, CheckCircle, Sun, Moon } from 'lucide-react';

// Password complexity rules — must match backend policy
const COMPLEXITY_RULES = [
  { id: 'length',    label: 'At least 8 characters',          test: (p) => p.length >= 8 },
  { id: 'digit',     label: 'At least one digit (0–9)',        test: (p) => /[0-9]/.test(p) },
  { id: 'uppercase', label: 'At least one uppercase letter',   test: (p) => /[A-Z]/.test(p) },
  { id: 'special',   label: 'At least one special character',  test: (p) => /[!@#$%^&*()\-_+=[\]{};:'"<>,.?/\\|`~]/.test(p) },
];

function PasswordChecklist({ password }) {
  return (
    <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {COMPLEXITY_RULES.map((rule) => {
        const met = password.length > 0 && rule.test(password);
        return (
          <li key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: met ? '#22c55e' : 'var(--text-secondary)', transition: 'color 200ms ease' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${met ? '#22c55e' : 'var(--border-card)'}`, background: met ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 200ms ease' }}>
              {met && <span style={{ width: '6px', height: '6px', background: 'white', borderRadius: '50%' }} />}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Password reset token is missing from the URL.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess('Your password has been reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
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
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Please enter and confirm your new password below.</p>
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
          <div className="p-4 mb-4 rounded-lg text-green-400 flex items-start gap-2" style={{
            background: 'rgba(34, 197, 94, 0.08)',
            border: '1px solid var(--border-card)',
            fontSize: '14px'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{success}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password (min 8 chars)"
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
              {/* Real-time password complexity feedback */}
              <PasswordChecklist password={password} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="glass-input"
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glass-button mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving Password...
                </span>
              ) : (
                'Save Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
