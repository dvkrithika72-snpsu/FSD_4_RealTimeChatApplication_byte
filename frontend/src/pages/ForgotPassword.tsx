import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [etherealUrl, setEtherealUrl] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [rawToken, setRawToken] = useState('');
  const [isMockEmail, setIsMockEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setEtherealUrl(res.data.etherealUrl || '');
      setResetUrl(res.data.resetUrl || '');
      setRawToken(res.data.rawToken || '');
      setIsMockEmail(Boolean(res.data.isMockEmail));
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (resetUrl) {
      navigator.clipboard.writeText(resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', color: '#f8fafc' }}>
      <div style={{ 
        background: 'rgba(2, 6, 23, 0.6)', 
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '36px', 
        width: '100%', 
        maxWidth: '460px', 
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
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '25px' }}>Connect. Chat. In Real Time.</p>
        
        <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 600 }}>Reset Password</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '25px', textAlign: 'center' }}>
          {submitted ? 'Reset link ready' : 'Enter your registered email address to reset your password'}
        </p>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '14px', borderRadius: '8px', marginBottom: '20px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', lineHeight: 1.5 }}>
            <div>{error}</div>
            <div style={{ marginTop: '8px' }}>
              <Link to="/register" style={{ color: '#60a5fa', fontWeight: 600, textDecoration: 'underline' }}>
                Click here to Register this account →
              </Link>
            </div>
          </div>
        )}
        
        {submitted ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '16px', borderRadius: '8px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center', lineHeight: 1.5 }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>✓</div>
              {isMockEmail ? (
                <>Password reset link generated for <strong>{email}</strong>!</>
              ) : (
                <>
                  A recovery email has been sent to <strong>{email}</strong>!
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#86efac' }}>
                    ✉️ Please check your Gmail inbox (and Spam folder).
                  </div>
                </>
              )}
            </div>

            {/* Instant One-Click Direct Reset Button */}
            {(rawToken || (resetUrl && resetUrl.includes('/reset-password/'))) && (
              <Link
                to={rawToken ? `/reset-password/${rawToken}` : `/reset-password/${resetUrl.split('/reset-password/')[1]}`}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(59,130,246,0.4)',
                  textAlign: 'center'
                }}
              >
                🔒 Reset Your Password Directly Now →
              </Link>
            )}

            {/* Copyable Reset URL */}
            {resetUrl && (
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>DIRECT RESET LINK:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={resetUrl}
                    style={{ flex: 1, padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#cbd5e1', fontSize: '0.8rem', outline: 'none' }}
                  />
                  <button
                    onClick={copyToClipboard}
                    type="button"
                    style={{ padding: '8px 14px', background: copied ? '#10b981' : '#334155', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Explanation Note for SMTP vs Development */}
            {isMockEmail && (
              <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.78rem', color: '#93c5fd', lineHeight: 1.5 }}>
                ℹ️ <strong>Why didn't an email arrive in your Gmail?</strong><br />
                External email delivery requires configuring real SMTP credentials (such as a Google App Password) in <code>backend/.env</code>. Because SMTP is currently unconfigured, NOVA provided the direct reset button above so you can reset your password immediately without waiting!
              </div>
            )}
            
            {etherealUrl && (
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem' }}>
                <span style={{ color: '#94a3b8' }}>Virtual Test Inbox: </span>
                <a href={etherealUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                  View simulated email on Ethereal →
                </a>
              </div>
            )}

            <button
              onClick={() => { setSubmitted(false); setResetUrl(''); setRawToken(''); }}
              type="button"
              style={{ padding: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              ← Try another email address
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>✉</span>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Enter your registered email"
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

            <button type="submit" disabled={!email.trim() || loading} style={{ 
              width: '100%', padding: '14px', 
              background: (email.trim() && !loading) ? 'linear-gradient(135deg, rgba(30,58,138,0.9), rgba(59,130,246,0.9))' : 'rgba(255,255,255,0.05)', 
              color: (email.trim() && !loading) ? 'white' : '#64748b', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', fontSize: '1rem', fontWeight: 500, 
              cursor: (email.trim() && !loading) ? 'pointer' : 'default',
              boxShadow: (email.trim() && !loading) ? '0 4px 15px rgba(59,130,246,0.3)' : 'none', 
              transition: 'all 0.2s',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
            }}>
              <span>✉</span> {loading ? 'Checking...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        
        <p style={{ marginTop: '30px', fontSize: '0.9rem', color: '#94a3b8' }}>
          Remembered your password? <Link to="/login" style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
};
