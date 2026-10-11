import React, { useEffect, useState, useRef } from 'react';
import type { IMessage } from '../../types/chat';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../services/socket';
import api from '../../services/api';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

interface ChatRoomProps {
  roomId: string;
  roomName: string;
  onMenuClick?: () => void;
  onOnlineUsersChange?: (users: { userId: string, username: string }[]) => void;
  onMessageSent?: () => void;
  onScheduleMeetingClick?: () => void;
  onAddMembersClick?: () => void;
  onInviteLinkClick?: () => void;
  isAdmin?: boolean;
  isGroup?: boolean;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  roomName,
  onMenuClick,
  onOnlineUsersChange,
  onMessageSent,
  onScheduleMeetingClick,
  onAddMembersClick,
  onInviteLinkClick,
  isAdmin,
  isGroup,
}) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [onlineUsers, setOnlineUsers] = useState<{ userId: string, username: string }[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ userId: string, username: string }[]>([]);

  const onMessageSentRef = useRef(onMessageSent);
  useEffect(() => {
    onMessageSentRef.current = onMessageSent;
  }, [onMessageSent]);

  const onOnlineUsersChangeRef = useRef(onOnlineUsersChange);
  useEffect(() => {
    onOnlineUsersChangeRef.current = onOnlineUsersChange;
  }, [onOnlineUsersChange]);

  useEffect(() => {
    if (!token) return;

    let isSubscribed = true;

    const fetchMessages = async () => {
      try {
        setError(null);
        const res = await api.get(`/chat/messages?roomId=${roomId}`);
        if (isSubscribed) {
          setMessages(res.data.messages);
        }
      } catch (err: any) {
        if (isSubscribed) {
          console.error('Failed to load chat history', err);
          setError('Failed to load chat history');
        }
      }
    };
    fetchMessages();

    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('join_room', roomId);
    }

    const handleConnect = () => {
      if (isSubscribed) setError(null);
      socket.emit('join_room', roomId);
    };

    const handleReceiveMessage = (msg: IMessage) => {
      // Only append if it belongs to the current room
      if (msg.roomId !== roomId) {
        if (onMessageSentRef.current) onMessageSentRef.current();
        return;
      }

      setMessages((prev) => {
        if (prev.find(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (onMessageSentRef.current) onMessageSentRef.current();
    };

    const handleStatusUpdate = (update: { messageId: string, status: 'read', readAt: string, scheduledDeletionAt?: string }) => {
      setMessages((prev) =>
        prev.map(m => m._id === update.messageId ? { ...m, status: update.status, readAt: update.readAt, scheduledDeletionAt: update.scheduledDeletionAt } : m)
      );
    };

    const handleMessageDeleted = (data: { messageId: string, roomId: string }) => {
      setMessages((prev) => prev.filter(m => m._id !== data.messageId));
    };

    const handleOnlineUsers = (users: { userId: string, username: string }[]) => {
      setOnlineUsers(users);
      if (onOnlineUsersChangeRef.current) onOnlineUsersChangeRef.current(users);
    };

    const handleUserTyping = ({ userId, username }: { userId: string, username: string }) => {
      if (userId === user?._id) return;
      setTypingUsers(prev => {
        if (!prev.find(u => u.userId === userId)) {
          return [...prev, { userId, username }];
        }
        return prev;
      });
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      }, 3000);
    };

    const handleError = (err: { message: string }) => {
      if (isSubscribed) {
        setError(err.message);
      }
    };

    const handleDisconnect = (reason: string) => {
      if (isSubscribed && reason !== 'io client disconnect') {
        setError('Disconnected from chat server');
      }
    };

    socket.on('connect', handleConnect);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_status_update', handleStatusUpdate);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('online_users', handleOnlineUsers);
    socket.on('user_typing', handleUserTyping);
    socket.on('error', handleError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      isSubscribed = false;
      socket.off('connect', handleConnect);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('online_users', handleOnlineUsers);
      socket.off('user_typing', handleUserTyping);
      socket.off('error', handleError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [token, roomId, user?._id]);

  const handleSendMessage = (content: string, attachment?: { url: string, type: string, name: string }) => {
    socket.emit('send_message', {
      roomId,
      content,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      attachmentName: attachment?.name,
    });
  };

  const handleTyping = () => {
    socket.emit('typing', { roomId });
  };

  const handleMarkRead = (messageId: string) => {
    socket.emit('mark_read', { messageId });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--nova-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(3, 7, 18, 0.7)', backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onMenuClick && (
            <button
              className="mobile-menu-btn"
              onClick={onMenuClick}
              style={{ display: 'none', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              ☰
            </button>
          )}
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.9))', border: '1px solid var(--nova-border-subtle)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
            {roomId === 'general' ? '💬' : roomId.startsWith('meeting_') ? '📅' : '👤'}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#fff', letterSpacing: '0.3px' }}>{roomName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
              {roomId === 'general' ? (
                <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></span>
                  {onlineUsers.length} online
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></span> Active
                </span>
              )}
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>•</span>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                {roomId === 'general' ? 'Public Room' : roomId.startsWith('meeting_') ? 'Meeting Space' : 'Conversation'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {isGroup && isAdmin && onAddMembersClick && (
            <button
              onClick={onAddMembersClick}
              title="Add members to this group"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#10b981',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
            >
              <span>👤+</span> Add Members
            </button>
          )}

          {isGroup && isAdmin && onInviteLinkClick && (
            <button
              onClick={onInviteLinkClick}
              title="Invite to group via link"
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#a78bfa',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)')}
            >
              <span>🔗</span> Invite Link
            </button>
          )}

          {onScheduleMeetingClick && !roomId.startsWith('meeting_') && (
            <button
              onClick={onScheduleMeetingClick}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)')}
            >
              <span>📅</span> Schedule Meeting
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', textAlign: 'center', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}

      <MessageList messages={messages} onMarkRead={handleMarkRead} />

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div style={{ padding: '0 20px', fontSize: '0.8rem', color: 'var(--nexus-text-muted)', fontStyle: 'italic', marginBottom: '10px' }}>
          {typingUsers.map(u => u.username).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
        </div>
      )}

      <ChatInput onSendMessage={handleSendMessage} onTyping={handleTyping} />

      <style>{`
        @media (max-width: 600px) {
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
};
