import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Both fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Invalid Reset Link</div>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', color: '#f8fafc' }}>
      <div style={{ 
        background: 'rgba(2, 6, 23, 0.6)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '40px', 
        width: '100%', 
        maxWidth: '420px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
            <span style={{ fontSize: '1.2rem', color: '#0f172a' }}>✦</span>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '1px' }}>NOVA</span>
        </div>
        
        <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 600 }}>Create New Password</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '30px', textAlign: 'center' }}>
          Enter your new cosmic key
        </p>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</div>}
        
        {success ? (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '8px', marginBottom: '20px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center', lineHeight: 1.5 }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>✓</div>
            Password successfully updated! <br/> Redirecting to login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>🔒</span>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="New password"
                  style={{ 
                    width: '100%', padding: '12px 12px 12px 42px', 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', color: '#f8fafc', outline: 'none',
                    fontSize: '0.95rem', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>🔒</span>
                <input 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm new password"
                  style={{ 
                    width: '100%', padding: '12px 12px 12px 42px', 
                    background: 'rgba(15, 23, 42, 0.6)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', color: '#f8fafc', outline: 'none',
                    fontSize: '0.95rem', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ 
              width: '100%', padding: '14px', 
              background: 'linear-gradient(135deg, rgba(30,58,138,0.9), rgba(59,130,246,0.9))', 
              color: 'white', border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59,130,246,0.3)', transition: 'all 0.2s',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
            }}>
              <span>🔒</span> {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        )}
        
        <p style={{ marginTop: '30px', fontSize: '0.9rem', color: '#94a3b8' }}>
          <Link to="/login" style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
};
