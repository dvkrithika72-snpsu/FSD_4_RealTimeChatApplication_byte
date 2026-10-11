import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface InviteGroupDetails {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  admin?: {
    username: string;
    name?: string;
  };
  isMember: boolean;
}

export const GroupInvitePage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<InviteGroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('No invitation code provided in link.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/chat/invites/${code}`);
        setGroup(res.data.group);
        if (res.data.group?.isMember) {
          setAlreadyMember(true);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
          'This invitation link is invalid, expired, or has been revoked by the group administrator.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchDetails();
    }
  }, [code, authLoading, user]);

  const handleJoinGroup = async () => {
    if (!code) return;
    if (!user) {
      navigate(`/login?redirect=/invite/${code}`);
      return;
    }

    try {
      setJoining(true);
      setError(null);
      const res = await api.post(`/chat/invites/${code}/join`);

      if (res.data.alreadyMember) {
        setAlreadyMember(true);
      }

      const groupId = res.data.conversation?._id || group?._id;
      if (groupId) {
        // Open the group directly in the dashboard
        navigate(`/dashboard?room=${groupId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join group');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 30px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* NOVA App Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: '0 0 16px rgba(255,255,255,0.2)',
            }}
          >
            <span style={{ fontSize: '1.3rem', color: '#0f172a' }}>✦</span>
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '1px', color: '#fff' }}>
            NOVA
          </span>
        </div>

        {loading || authLoading ? (
          <div style={{ padding: '40px 0', color: '#94a3b8', fontSize: '0.95rem' }}>
            Checking group invitation link...
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '2rem',
                color: '#ef4444',
              }}
            >
              ✕
            </div>
            <h3 style={{ color: '#fff', margin: '4px 0', fontSize: '1.2rem' }}>
              Invitation Link Invalid
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                marginTop: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                width: '100%',
              }}
            >
              Return to Dashboard
            </button>
          </div>
        ) : group ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            {/* Group Avatar */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(139, 92, 246, 0.3))',
                border: '2px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '2.2rem',
                marginBottom: '16px',
                boxShadow: '0 0 24px rgba(56, 189, 248, 0.2)',
              }}
            >
              👥
            </div>

            <div style={{ fontSize: '0.75rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '4px' }}>
              GROUP INVITATION
            </div>

            <h2 style={{ color: '#fff', fontSize: '1.4rem', margin: '4px 0 8px 0', fontWeight: 700 }}>
              {group.name}
            </h2>

            {group.description && (
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', fontStyle: 'italic', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                "{group.description}"
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '6px 14px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '24px',
                fontSize: '0.8rem',
                color: '#cbd5e1',
              }}
            >
              <span>👥 {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
              {group.admin && (
                <>
                  <span>•</span>
                  <span>Created by {group.admin.name || group.admin.username}</span>
                </>
              )}
            </div>

            {/* If user is NOT logged in: Direct through Login or Register */}
            {!user ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '6px', lineHeight: 1.5 }}>
                  You need a NOVA account to join this group chat.
                </p>
                <Link
                  to={`/login?redirect=/invite/${code}`}
                  className="btn-primary"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                  }}
                >
                  Log In to Join Group
                </Link>
                <Link
                  to={`/register?redirect=/invite/${code}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                  }}
                >
                  Register New Account
                </Link>
              </div>
            ) : alreadyMember ? (
              /* Already a member */
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                  }}
                >
                  ✓ You are already a member of this group
                </div>
                <button
                  onClick={() => navigate(`/dashboard?room=${group._id}`)}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.92rem' }}
                >
                  Open Group Chat →
                </button>
              </div>
            ) : (
              /* Authenticated and ready to join */
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleJoinGroup}
                  disabled={joining}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    opacity: joining ? 0.7 : 1,
                  }}
                >
                  {joining ? 'Joining Group...' : 'Join Group'}
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    padding: '6px',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
