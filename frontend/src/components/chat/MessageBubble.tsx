import React, { useEffect, useRef, useState } from 'react';
import type { IMessage } from '../../types/chat';
import { useAuth } from '../../context/AuthContext';

interface MessageBubbleProps {
  message: IMessage;
  onMarkRead: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onMarkRead }) => {
  const { user } = useAuth();
  const isOwn = user?._id === message.senderId._id;
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // Only recipient triggers read event, and not for meeting invitation cards
    if (!isOwn && message.status === 'sent' && message.messageType !== 'meeting') {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onMarkRead(message._id);
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      
      if (bubbleRef.current) {
        observer.observe(bubbleRef.current);
      }
      return () => observer.disconnect();
    }
  }, [isOwn, message.status, message._id, message.messageType, onMarkRead]);

  // Local timer for visual countdown on self-destructing messages
  useEffect(() => {
    if (message.status === 'read' && message.scheduledDeletionAt && message.messageType !== 'meeting') {
      const deletionTime = new Date(message.scheduledDeletionAt).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((deletionTime - now) / 1000));
        setTimeLeft(diff);
      };

      setTimeout(updateTimer, 0);
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeout(() => setTimeLeft(null), 0);
    }
  }, [message.status, message.scheduledDeletionAt, message.messageType]);

  const copyMeetLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const meeting = message.meetingId;

  // Render Meeting Card if message is a meeting invitation
  if (message.messageType === 'meeting' && meeting) {
    const startTimeDate = new Date(meeting.startTime);
    const formattedDate = startTimeDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = startTimeDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const hostName = meeting.createdBy?.name || meeting.createdBy?.username || message.senderId.username;

    return (
      <div
        ref={bubbleRef}
        style={{
          alignSelf: isOwn ? 'flex-end' : 'flex-start',
          maxWidth: '85%',
          marginBottom: '16px',
        }}
      >
        <div className="meeting-card-chat">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3rem' }}>📅</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>
                  {meeting.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Organized by <strong style={{ color: '#e2e8f0' }}>{hostName}</strong>
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.7rem',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: meeting.status === 'scheduled' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: meeting.status === 'scheduled' ? '#10b981' : '#ef4444',
                border: `1px solid ${meeting.status === 'scheduled' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {meeting.status}
            </span>
          </div>

          {meeting.description && (
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.4 }}>
              {meeting.description}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.85rem',
              color: '#38bdf8',
            }}
          >
            <span>🕒</span>
            <span>{formattedDate} at {formattedTime}</span>
          </div>

          {meeting.googleMeetUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={meeting.googleMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                    color: '#fff',
                    padding: '9px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <span>📹</span> Join Google Meet
                </a>
                <button
                  type="button"
                  onClick={() => copyMeetLink(meeting.googleMeetUrl!)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Copy Google Meet Link"
                >
                  {copiedLink ? '✓ Copied' : '🔗 Copy'}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
                {meeting.isManualLink ? 'Direct Google Meet Link' : 'Official Google Calendar & Meet Conference'}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
              Meeting scheduled without a video conference link.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={bubbleRef}
      style={{
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        background: isOwn ? 'var(--nova-bubble-out)' : 'var(--nova-bubble-in)',
        color: '#ffffff',
        padding: '12px 16px',
        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        maxWidth: '75%',
        marginBottom: '14px',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid var(--nova-border-subtle)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
      }}
    >
      <span
        style={{
          fontSize: '0.75rem',
          color: isOwn ? 'rgba(255, 255, 255, 0.6)' : 'var(--nova-text-secondary)',
          marginBottom: '4px',
          fontWeight: 500,
        }}
      >
        {isOwn ? 'You' : message.senderId.name || message.senderId.username}
      </span>

      {message.attachmentUrl && (
        <div style={{ marginBottom: '8px', maxWidth: '100%', overflow: 'hidden', borderRadius: '8px' }}>
          {message.attachmentType === 'image' ? (
            <img
              src={`http://localhost:5005${message.attachmentUrl}`}
              alt={message.attachmentName || 'Attachment'}
              style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }}
            />
          ) : (
            <a
              href={`http://localhost:5005${message.attachmentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '10px 14px',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '0.85rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span>📎</span>
              <span>{message.attachmentName || 'Download File'}</span>
            </a>
          )}
        </div>
      )}

      {message.content && (
        <span style={{ fontSize: '0.95rem', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {message.content}
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '6px', gap: '6px' }}>
        <span style={{ fontSize: '0.7rem', opacity: 0.65 }}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isOwn && (
          <span style={{ fontSize: '0.8rem', color: message.status === 'read' ? '#38bdf8' : 'inherit', opacity: message.status === 'read' ? 1 : 0.6 }}>
            {message.status === 'read' ? '✓✓' : '✓'}
          </span>
        )}
      </div>

      {/* 15-second Self-destruct indicator */}
      {timeLeft !== null && timeLeft <= 15 && (
        <div
          style={{
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: timeLeft <= 5 ? '#ef4444' : 'var(--nova-accent)',
            fontWeight: 500,
          }}
        >
          <span>⏱️</span> Disappears in {timeLeft}s
        </div>
      )}
    </div>
  );
};
