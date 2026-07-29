import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Eye, EyeOff, ArrowLeft, Sun, Moon } from 'lucide-react';

const ChangePassword = () => {
  const { changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please verify current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      {/* Theme Toggle Button (floating top-right) */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn flex items-center justify-center"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          type="button"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <div className="glass-card max-w-md w-full p-8 animate-fade-in-up" style={{ zIndex: 1, position: 'relative' }}>
        <div 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm font-medium mb-6 cursor-pointer transition w-fit"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Update your account password. You will need your current password.</p>
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
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="glass-input"
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '14px', color: '#94a3b8' }}>
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 6 chars)"
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
                Updating...
              </span>
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
