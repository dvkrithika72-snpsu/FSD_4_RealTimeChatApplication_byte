import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { GOOGLE_CLIENT_ID } from '../config';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // 2FA State (retained for backward compatibility)
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [otp, setOtp] = useState('');
  const [etherealUrl, setEtherealUrl] = useState('');

  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username/Email and password are required');
      return;
    }

    try {
      const res = await api.post('/auth/login', { username: username.trim(), password });
      
      if (res.data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        if (res.data.etherealUrl) {
          setEtherealUrl(res.data.etherealUrl);
        }
      } else {
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        login(res.data.token, res.data.user);
        navigate(redirectParam || (res.data.user.profileSetupComplete ? '/dashboard' : '/setup'));
      }
    } catch (err: any) {
      console.error('Login submit error:', err);
      const errMsg = err.response?.data?.error || 
        (err.message === 'Network Error' ? 'Connecting to server... If backend is asleep (Render free tier), please wait ~30 seconds and try again.' : 'Invalid email or password');
      setError(errMsg);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!otp) {
      setError('Please enter the 6-digit code');
      return;
    }

    try {
      const res = await api.post('/auth/verify-otp', { username, otp });
      const redirectParam = new URLSearchParams(window.location.search).get('redirect');
      login(res.data.token, res.data.user);
      navigate(redirectParam || (res.data.user.profileSetupComplete ? '/dashboard' : '/setup'));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired code');
    }
  };

  const isGoogleConfigured = Boolean(
    GOOGLE_CLIENT_ID && 
    !GOOGLE_CLIENT_ID.includes('YOUR_CLIENT_ID')
  );

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      try {
        const res = await api.post('/auth/google', { token: tokenResponse.access_token });
        const redirectParam = new URLSearchParams(window.location.search).get('redirect');
        login(res.data.token, res.data.user);
        navigate(redirectParam || (res.data.user.profileSetupComplete ? '/dashboard' : '/setup'));
      } catch (err: any) {
        console.error('Google auth error:', err);
        const errMsg = err.response?.data?.error || 
          (err.message === 'Network Error' ? 'Server is waking up (Render free tier). Please wait ~30 seconds and try again.' : err.message) || 
          'Google authentication failed';
        setError(errMsg);
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.');
    },
  });

  const onGoogleBtnClick = () => {
    if (!isGoogleConfigured) {
      setError('Google Sign-In is not configured yet (missing VITE_GOOGLE_CLIENT_ID in frontend/.env). You can log in using your email/username and password below.');
      return;
    }
    handleGoogleLogin();
  };

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
        
        {!requiresTwoFactor ? (
          <>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '35px' }}>Connect. Chat. In Real Time.</p>
            <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 600 }}>Welcome Back</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '30px', textAlign: 'center' }}>Sign in to continue your secure session</p>
            
            {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</div>}
            
            {/* Google Sign In Button */}
            <button 
              type="button"
              onClick={onGoogleBtnClick}
              style={{
                width: '100%', padding: '12px', marginBottom: '20px',
                background: 'white', color: '#334155', border: 'none',
                borderRadius: '8px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={(e) => e.currentTarget.style.background = 'white'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
              <span style={{ padding: '0 10px', color: '#64748b', fontSize: '0.8rem' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Username or Email</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>👤</span>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder="Enter your username or email"
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
                <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>🔒</span>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Enter your password"
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#3b82f6', textDecoration: 'none' }}>Forgot password?</Link>
                </div>
              </div>

              <button type="submit" style={{ 
                width: '100%', padding: '14px', 
                background: 'linear-gradient(135deg, rgba(30,58,138,0.9), rgba(59,130,246,0.9))', 
                color: 'white', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '8px', fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(59,130,246,0.3)', transition: 'all 0.2s',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}>
                <span>🔓</span> Login
              </button>
            </form>
            
            <p style={{ marginTop: '30px', fontSize: '0.9rem', color: '#94a3b8' }}>
              Don't have an account? <Link to="/register" style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}>Create account</Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '35px' }}>2-Step Verification</p>
            <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 600 }}>Enter OTP</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px', textAlign: 'center' }}>
              We've sent a 6-digit code to your email.
            </p>

            {etherealUrl && (
              <div style={{ marginBottom: '30px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', textAlign: 'center' }}>
                <a href={etherealUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem' }}>
                  [DEV] Click to view OTP Email
                </a>
              </div>
            )}

            {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</div>}
            
            <form onSubmit={handleOtpSubmit} style={{ width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>🔑</span>
                  <input 
                    type="text" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    placeholder="123456"
                    maxLength={6}
                    style={{ 
                      width: '100%', padding: '12px 12px 12px 42px', 
                      background: 'rgba(15, 23, 42, 0.6)', 
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px', color: '#f8fafc', outline: 'none',
                      fontSize: '1.2rem', transition: 'border-color 0.2s', letterSpacing: '4px', textAlign: 'center'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div 
                  onClick={() => setRequiresTwoFactor(false)}
                  style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', padding: '10px 0' }}
                >
                  Back
                </div>
                <button type="submit" style={{ 
                  padding: '14px 24px', 
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9))', 
                  color: 'white', border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '8px', fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                }}>
                  <span>✓</span> Verify
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
