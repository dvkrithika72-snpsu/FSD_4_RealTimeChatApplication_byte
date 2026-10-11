import React from 'react';
import { Link } from 'react-router-dom';

export const Landing: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
            <span style={{ fontSize: '1.2rem', color: '#0f172a' }}>✦</span>
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '1px' }}>NOVA</span>
        </div>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <span style={{ cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>Home</span>
          <span style={{ cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>Features</span>
          <span style={{ cursor: 'pointer', color: '#94a3b8', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}>About</span>
          <Link to="/login" style={{ padding: '8px 24px', border: '1px solid rgba(59,130,246,0.5)', borderRadius: '20px', color: '#fff', textDecoration: 'none', transition: 'all 0.2s ease', background: 'rgba(59,130,246,0.1)' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}>
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: '0 10%', position: 'relative' }}>
        <h1 style={{ fontSize: '5rem', lineHeight: 1.1, marginBottom: '20px', fontWeight: 800, letterSpacing: '-1px' }}>
          Connect. Chat.<br />
          <span style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>In Real Time.</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '500px', marginBottom: '40px', lineHeight: 1.6 }}>
          A highly secure, blazing fast chat platform for individuals and teams who value sleek design and privacy.
        </p>
        
        <Link to="/login" style={{ fontSize: '1.1rem', padding: '16px 36px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, rgba(30,58,138,0.9), rgba(59,130,246,0.9))', color: 'white', textDecoration: 'none', fontWeight: 600, boxShadow: '0 4px 20px rgba(59,130,246,0.4)', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
          Enter NOVA <span>→</span>
        </Link>

        {/* Features Row */}
        <div style={{ display: 'flex', gap: '40px', marginTop: '80px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(2,6,23,0.4)', padding: '15px 25px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '1.2rem' }}>💬</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Real-time Messaging</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Instant & reliable</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(2,6,23,0.4)', padding: '15px 25px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '1.2rem' }}>⏱️</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Self-Destructing Messages</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Your privacy, our priority</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(2,6,23,0.4)', padding: '15px 25px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '1.2rem' }}>🔒</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>End-to-End Security</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>JWT + Secure WebSockets</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
