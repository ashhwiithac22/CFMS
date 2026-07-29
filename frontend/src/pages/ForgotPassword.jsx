import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Mail, ArrowLeft, Sun, Moon } from 'lucide-react';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await forgotPassword(email);
      setSuccess(result.message || 'If the email is registered, a password reset link has been sent!');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
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
        <div 
          onClick={() => navigate('/login')}
          className="flex items-center gap-2 text-sm font-medium mb-6 cursor-pointer transition w-fit"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Forgot Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your email and we'll send you a link to reset your password.</p>
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-button mt-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Sending...
              </span>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
