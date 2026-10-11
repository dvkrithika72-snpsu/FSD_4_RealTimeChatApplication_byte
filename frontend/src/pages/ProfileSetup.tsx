import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const ProfileSetup: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [status, setStatus] = useState(user?.status || 'Available');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.username) setUsername(user.username);
      if (user.status) setStatus(user.status);
      if (user.profilePicture) setProfilePicture(user.profilePicture);
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    
    try {
      const res = await api.put('/users/profile', {
        name,
        username,
        status,
        profilePicture
      });
      
      // Update local auth context
      login(localStorage.getItem('token') || '', res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
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
        padding: '40px', 
        width: '100%', 
        maxWidth: '450px', 
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
        
        <h2 style={{ marginBottom: '8px', fontSize: '1.5rem', fontWeight: 600 }}>Setup Your Profile</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '30px', textAlign: 'center' }}>
          Let everyone know who you are.
        </p>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', width: '100%', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: '100px', height: '100px', borderRadius: '50%', 
                background: profilePicture ? `url(${profilePicture}) center/cover` : 'rgba(15, 23, 42, 0.8)',
                border: '2px dashed rgba(255,255,255,0.2)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.8)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
            >
              {!profilePicture && <span style={{ fontSize: '2rem', color: '#64748b' }}>📸</span>}
              <div style={{ position: 'absolute', bottom: 0, background: 'rgba(0,0,0,0.5)', width: '100%', textAlign: 'center', padding: '4px 0', fontSize: '0.7rem', color: 'white', opacity: 0, transition: 'opacity 0.2s' }} 
                   className="hover-show">
                Upload
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>📝</span>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="E.g. John Doe"
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '1rem' }}>👤</span>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Choose a username"
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
            <label style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>About / Status</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '12px', color: '#64748b', fontSize: '1rem' }}>💬</span>
              <textarea 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                placeholder="What's on your mind?"
                rows={2}
                style={{ 
                  width: '100%', padding: '12px 12px 12px 42px', 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', color: '#f8fafc', outline: 'none',
                  fontSize: '0.95rem', transition: 'border-color 0.2s', resize: 'none'
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
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            opacity: loading ? 0.7 : 1
          }}>
            <span>🚀</span> {loading ? 'Saving...' : (user?.profileSetupComplete ? 'Save Profile' : 'Enter NOVA')}
          </button>
          {user?.profileSetupComplete && (
            <div 
              onClick={() => navigate('/dashboard')}
              style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center' }}
            >
              Cancel
            </div>
          )}
        </form>
      </div>
      <style>{`
        .hover-show { opacity: 0; }
        div:hover > .hover-show { opacity: 1 !important; }
      `}</style>
    </div>
  );
};
