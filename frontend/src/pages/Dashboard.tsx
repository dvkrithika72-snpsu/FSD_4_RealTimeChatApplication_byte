import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChatRoom } from '../components/chat/ChatRoom';
import { socket } from '../services/socket';
import api from '../services/api';
import type { IConversation, IMeeting } from '../types/chat';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; username: string }[]>([]);

  const [activeRoom, setActiveRoom] = useState<string>('general');
  const [activeRoomName, setActiveRoomName] = useState<string>('General Chat');
  const [activeConversation, setActiveConversation] = useState<IConversation | null>(null);

  // Meetings Modal State: 'upcoming' | 'schedule' | null
  const [showMeetingsModal, setShowMeetingsModal] = useState<'upcoming' | 'schedule' | null>(null);
  const [meetings, setMeetings] = useState<IMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDateTime, setMeetingDateTime] = useState('');
  const [manualMeetUrl, setManualMeetUrl] = useState('');
  const [meetingSelectedConversationId, setMeetingSelectedConversationId] = useState<string>('');
  const [meetingError, setMeetingError] = useState('');
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Google Meet Integration Status
  const [googleStatus, setGoogleStatus] = useState<{ isConfigured: boolean; isConnected: boolean; authUrl: string | null }>({
    isConfigured: false,
    isConnected: false,
    authUrl: null,
  });

  // Private Chats & Contacts State
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ _id: string; username: string; name?: string; status?: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Search input in sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ _id: string; username: string; name?: string }[]>([]);
  const [conversations, setConversations] = useState<IConversation[]>([]);

  // Group creation state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupSelectedMembers, setGroupSelectedMembers] = useState<string[]>([]);
  const [groupError, setGroupError] = useState('');
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  // Group Member & Invitation state
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [addMembersSelected, setAddMembersSelected] = useState<string[]>([]);
  const [addMembersSearch, setAddMembersSearch] = useState('');
  const [addMembersError, setAddMembersError] = useState('');
  const [addMembersSubmitting, setAddMembersSubmitting] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState('');
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Check URL query param for meeting links, room navigation, or Google auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      api.post('/meetings/google/connect', { code })
        .then(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
          fetchGoogleStatus();
        })
        .catch(err => console.error('Error connecting Google account:', err));
    }

    const roomParam = params.get('room');
    if (roomParam) {
      if (roomParam.startsWith('meeting_')) {
        const meetingId = roomParam.replace('meeting_', '');
        api.get(`/meetings/${meetingId}`).then(res => {
          if (res.data.meeting) {
            setActiveRoom(roomParam);
            setActiveRoomName(res.data.meeting.title);
          }
        }).catch(err => console.error('Error opening meeting from link:', err));
      } else if (roomParam !== 'general') {
        api.get(`/chat/conversations/${roomParam}`).then(res => {
          if (res.data.conversation) {
            selectConversation(res.data.conversation);
          }
        }).catch(err => console.error('Error opening conversation from roomParam:', err));
      }
    }
  }, []);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await api.get('/meetings/google/status');
      setGoogleStatus(res.data);
    } catch (e) {
      console.error('Failed to check Google status', e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const res = await api.get('/users/search');
      setAvailableUsers(res.data.users || []);
    } catch (e) {
      console.error('Failed to fetch available users', e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      setMeetingsLoading(true);
      const res = await api.get('/meetings');
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error('Failed to fetch meetings', err);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/chat/conversations');
      const convList: IConversation[] = res.data.conversations || [];
      setConversations(convList);
      setActiveConversation((prev) => {
        if (!prev) return null;
        const updated = convList.find((c) => c._id === prev._id);
        return updated || prev;
      });
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    }
  }, []);

  useEffect(() => {
    const handleConvUpdated = () => {
      fetchConversations();
    };
    socket.on('conversation_updated', handleConvUpdated);
    return () => {
      socket.off('conversation_updated', handleConvUpdated);
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (showMeetingsModal === 'upcoming') {
      fetchMeetings();
    }
  }, [showMeetingsModal, fetchMeetings]);

  useEffect(() => {
    fetchConversations();
    fetchMeetings();
    fetchUsers();
    fetchGoogleStatus();
  }, [activeRoom, fetchConversations, fetchMeetings, fetchUsers, fetchGoogleStatus]);

  // Sidebar inline user search debouncing
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim()) {
        try {
          const res = await api.get(`/users/search?q=${searchQuery}`);
          setSearchResults(res.data.users || []);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const startPrivateChat = async (targetUser: { _id: string; username: string; name?: string }) => {
    try {
      const res = await api.post('/chat/conversations', { targetUserId: targetUser._id });
      const conv = res.data.conversation;
      setActiveRoom(conv._id);
      setActiveConversation(conv);
      setActiveRoomName(targetUser.name || targetUser.username);
      setSearchQuery('');
      setSearchResults([]);
      setShowNewChatModal(false);
      setSidebarOpen(false);
      fetchConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = (conv: IConversation) => {
    setActiveRoom(conv._id);
    setActiveConversation(conv);

    if (conv._id === 'general') {
      setActiveRoomName('General Chat');
    } else if (conv.type === 'group') {
      setActiveRoomName(conv.name || 'Group Chat');
    } else if (conv.participants.length === 1 && conv.participants[0]._id === user?._id) {
      setActiveRoomName('You');
    } else {
      const otherUser = conv.participants.find((p: any) => p._id !== user?._id);
      setActiveRoomName(otherUser ? (otherUser.name || otherUser.username) : 'Direct Chat');
    }

    setSidebarOpen(false);
  };

  const copyMeetingLink = (m: IMeeting) => {
    const url = m.googleMeetUrl || `${window.location.origin}/dashboard?room=meeting_${m._id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const openScheduleModal = (preferredConvId?: string) => {
    let chosen = preferredConvId;
    if (!chosen) {
      if (activeRoom !== 'general' && !activeRoom.startsWith('meeting_')) {
        chosen = activeRoom;
      } else {
        chosen = '';
      }
    }
    setMeetingSelectedConversationId(chosen);
    setMeetingError('');
    setShowMeetingsModal('schedule');
    setSidebarOpen(false);
  };

  const handleStartInstantMeeting = async () => {
    setMeetingError('');
    const title = meetingTitle.trim() || `${user?.name || user?.username}'s Instant Meeting`;
    const targetConvId = meetingSelectedConversationId.trim() || (activeRoom !== 'general' && !activeRoom.startsWith('meeting_') ? activeRoom : undefined);

    try {
      setMeetingSubmitting(true);
      const res = await api.post('/meetings', {
        title,
        startTime: new Date().toISOString(),
        conversationId: targetConvId,
        manualMeetUrl: manualMeetUrl.trim() || undefined,
      });
      const newMeeting = res.data.meeting;
      setMeetings((prev) => [newMeeting, ...prev]);
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDateTime('');
      setManualMeetUrl('');
      setMeetingSelectedConversationId('');
      setShowMeetingsModal(null);
      await fetchConversations();

      if (targetConvId) {
        const targetConv = conversations.find((c) => c._id === targetConvId);
        if (targetConv) {
          selectConversation(targetConv);
        } else {
          setActiveRoom(targetConvId);
        }
      }

      if (newMeeting.googleMeetUrl) {
        window.open(newMeeting.googleMeetUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setMeetingError(err.response?.data?.error || 'Failed to start instant meeting');
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeetingError('');
    if (!meetingTitle.trim()) {
      setMeetingError('Meeting title is required');
      return;
    }
    if (!meetingDateTime) {
      setMeetingError('Meeting date and time are required');
      return;
    }

    const targetConvId = meetingSelectedConversationId.trim() || (activeRoom !== 'general' && !activeRoom.startsWith('meeting_') ? activeRoom : undefined);

    try {
      setMeetingSubmitting(true);
      const res = await api.post('/meetings', {
        title: meetingTitle.trim(),
        description: meetingDescription.trim() || undefined,
        startTime: meetingDateTime,
        conversationId: targetConvId,
        manualMeetUrl: manualMeetUrl.trim() || undefined,
      });
      setMeetings((prev) => [res.data.meeting, ...prev].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      setMeetingTitle('');
      setMeetingDescription('');
      setMeetingDateTime('');
      setManualMeetUrl('');
      setMeetingSelectedConversationId('');
      setShowMeetingsModal(null);
      await fetchConversations();

      if (targetConvId) {
        const targetConv = conversations.find((c) => c._id === targetConvId);
        if (targetConv) {
          selectConversation(targetConv);
        } else {
          setActiveRoom(targetConvId);
        }
      }
    } catch (err: any) {
      setMeetingError(err.response?.data?.error || 'Failed to schedule meeting');
    } finally {
      setMeetingSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await api.delete(`/meetings/${meetingId}`);
      setMeetings((prev) => prev.filter(m => m._id !== meetingId));
    } catch (err) {
      console.error('Failed to cancel meeting', err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupError('');

    if (!groupName.trim()) {
      setGroupError('Group name is required');
      return;
    }
    if (groupSelectedMembers.length === 0) {
      setGroupError('Please select at least one other member');
      return;
    }

    try {
      setGroupSubmitting(true);
      const res = await api.post('/chat/groups', {
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participantIds: groupSelectedMembers,
      });

      const newGroup = res.data.conversation;
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupDescription('');
      setGroupSelectedMembers([]);
      selectConversation(newGroup);
      fetchConversations();
    } catch (err: any) {
      setGroupError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setGroupSubmitting(false);
    }
  };

  const isGroupAdmin = Boolean(
    activeConversation?.type === 'group' &&
    ((activeConversation.admin?._id && activeConversation.admin._id === user?._id) ||
     (typeof activeConversation.admin === 'string' && activeConversation.admin === user?._id))
  );

  const openAddMembersModal = () => {
    fetchUsers();
    setAddMembersSelected([]);
    setAddMembersSearch('');
    setAddMembersError('');
    setShowAddMembersModal(true);
  };

  const handleAddMembersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || activeConversation.type !== 'group') return;
    if (addMembersSelected.length === 0) {
      setAddMembersError('Please select at least one user to add');
      return;
    }
    try {
      setAddMembersSubmitting(true);
      setAddMembersError('');
      const res = await api.post(`/chat/groups/${activeConversation._id}/members`, {
        userIds: addMembersSelected,
      });
      if (res.data.conversation) {
        setActiveConversation(res.data.conversation);
      }
      setShowAddMembersModal(false);
      setAddMembersSelected([]);
      setAddMembersSearch('');
      await fetchConversations();
    } catch (err: any) {
      setAddMembersError(err.response?.data?.error || 'Failed to add members');
    } finally {
      setAddMembersSubmitting(false);
    }
  };

  const openInviteModal = async () => {
    if (!activeConversation || activeConversation.type !== 'group') return;
    setShowInviteModal(true);
    setInviteLoading(true);
    setInviteError('');
    setCopiedInviteLink(false);
    setRevokeConfirm(false);
    try {
      const res = await api.get(`/chat/groups/${activeConversation._id}/invite`);
      setCurrentInviteCode(res.data.inviteCode);
    } catch (err: any) {
      setInviteError(err.response?.data?.error || 'Failed to fetch invite link');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!currentInviteCode) return;
    const url = `${window.location.origin}/invite/${currentInviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedInviteLink(true);
    setTimeout(() => setCopiedInviteLink(false), 2500);
  };

  const handleRevokeInviteLink = async () => {
    if (!activeConversation) return;
    try {
      setInviteLoading(true);
      setInviteError('');
      const res = await api.post(`/chat/groups/${activeConversation._id}/invite/revoke`);
      setCurrentInviteCode(res.data.inviteCode);
      setRevokeConfirm(false);
      setCopiedInviteLink(false);
    } catch (err: any) {
      setInviteError(err.response?.data?.error || 'Failed to reset invite link');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogout = () => {
    setConversations([]);
    setMeetings([]);
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ padding: '24px 16px', justifyContent: 'space-between' }}>
        {/* Top Section */}
        <div>
          {/* Logo Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px', paddingLeft: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
              <span style={{ fontSize: '1.5rem', color: '#0f172a' }}>✦</span>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '1px', color: '#fff' }}>NOVA</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Connect. Chat. In Real Time.</div>
            </div>
          </div>

          {/* Conversations Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingLeft: '10px', paddingRight: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>CONVERSATIONS</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span
                onClick={() => { setShowCreateGroupModal(true); fetchUsers(); }}
                title="Create a new group"
                style={{ fontSize: '0.72rem', color: '#38bdf8', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 7px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}
              >
                👥 Group
              </span>
              <span
                onClick={() => { setShowNewChatModal(true); fetchUsers(); }}
                title="Start a new private chat"
                style={{ fontSize: '0.72rem', color: '#60a5fa', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 7px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}
              >
                ⊕ Chat
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '15px', padding: '0 5px' }}>
            <input
              type="text"
              placeholder="Search users to chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '10px 15px', borderRadius: '8px',
                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)',
                color: 'var(--nexus-text-main)', outline: 'none', fontSize: '0.85rem'
              }}
            />
            {searchResults.length > 0 && (
              <div style={{ marginTop: '10px', background: 'rgba(15, 23, 42, 0.95)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                {searchResults.map(u => (
                  <div
                    key={u._id}
                    onClick={() => startPrivateChat(u)}
                    style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.7rem', color: '#fff' }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#fff' }}>{u.name || u.username}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conversations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '35vh', overflowY: 'auto' }}>
            {conversations.length === 0 ? (
              <div style={{ padding: '10px', color: '#64748b', fontSize: '0.8rem', textAlign: 'center' }}>No conversations yet.</div>
            ) : conversations.map(conv => {
              const isGeneral = conv._id === 'general';
              const isGroup = conv.type === 'group' && !isGeneral;
              const isSelfChat = !isGeneral && !isGroup && conv.participants.length === 1 && conv.participants[0]._id === user?._id;

              const otherUser = isGeneral || isGroup || isSelfChat ? null : conv.participants.find((p: any) => p._id !== user?._id) as any;

              if (!isGeneral && !isGroup && !isSelfChat && !otherUser) return null;

              const isOnline = isGeneral || isSelfChat ? true : isGroup ? false : onlineUsers.some(u => u.userId === otherUser?._id);

              let displayName = 'Unknown';
              let avatarChar = '?';

              if (isGeneral) {
                displayName = 'General Chat';
                avatarChar = '💬';
              } else if (isGroup) {
                displayName = conv.name || 'Group Chat';
                avatarChar = '👥';
              } else if (isSelfChat) {
                displayName = 'You';
                avatarChar = user?.name ? user.name.charAt(0).toUpperCase() : user?.username?.charAt(0).toUpperCase() || 'Y';
              } else if (otherUser) {
                displayName = otherUser.name || otherUser.username;
                avatarChar = displayName.charAt(0).toUpperCase();
              }

              return (
                <div
                  key={conv._id}
                  onClick={() => selectConversation(conv)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
                    background: activeRoom === conv._id ? 'linear-gradient(90deg, rgba(30, 58, 138, 0.4), transparent)' : 'transparent',
                    border: activeRoom === conv._id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                    borderRadius: '12px', cursor: 'pointer',
                    boxShadow: activeRoom === conv._id ? 'inset 0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isGeneral ? 'rgba(59, 130, 246, 0.2)' : isGroup ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: isGeneral || isGroup ? '1rem' : '1.1rem', color: '#fff' }}>
                        {avatarChar}
                      </div>
                      {isOnline && !isGeneral && !isGroup && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '2px solid #0f172a' }}></div>
                      )}
                      {isGeneral && (
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '2px solid #0f172a' }}></div>
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ fontWeight: activeRoom === conv._id || conv.unreadCount ? 600 : 500, color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayName}
                        </div>
                        {conv.latestMessage && (
                          <div style={{ fontSize: '0.7rem', color: conv.unreadCount ? '#3b82f6' : '#64748b', fontWeight: conv.unreadCount ? 600 : 400 }}>
                            {new Date(conv.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: conv.unreadCount ? '#e2e8f0' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.unreadCount ? 500 : 400 }}>
                          {conv.latestMessage ? (
                            <span>
                              {conv.latestMessage.senderId?._id === user?._id ? 'You: ' : ''}
                              {conv.latestMessage.content || (conv.latestMessage.attachmentType === 'image' ? '📷 Image' : '📎 Attachment')}
                            </span>
                          ) : isGroup ? `${conv.participants?.length || 0} members` : 'No messages yet'}
                        </div>

                        {conv.unreadCount !== undefined && conv.unreadCount > 0 && (
                          <div style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px', marginLeft: '6px', flexShrink: 0 }}>
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meetings Section */}
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '24px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '10px', fontWeight: 600 }}>MEETINGS</div>
          <div
            onClick={() => { setShowMeetingsModal('upcoming'); fetchMeetings(); setSidebarOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#cbd5e1', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>📅</span> <span style={{ fontSize: '0.9rem' }}>Upcoming Meetings ({meetings.length})</span>
          </div>
          <div
            onClick={() => openScheduleModal()}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', color: '#cbd5e1', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>⊕</span> <span style={{ fontSize: '0.9rem' }}>Schedule Meeting</span>
          </div>
        </div>

        {/* Bottom Profile Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div
            className="glass-card"
            onClick={() => navigate('/setup')}
            title="Edit Profile"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: user?.profilePicture ? `url(${user.profilePicture}) center/cover` : 'linear-gradient(135deg, rgba(30,58,138,0.8), rgba(139,92,246,0.8))',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                border: '1px solid rgba(255,255,255,0.2)',
                overflow: 'hidden'
              }}>
                {!user?.profilePicture && (user?.name?.charAt(0) || user?.username?.charAt(0) || '👤')}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{user?.name || user?.username}</div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></span> Online
                </div>
              </div>
            </div>
            <div style={{ color: '#64748b' }}>›</div>
          </div>
          <div
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <span>↪</span> Logout
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="main-chat">
        <ChatRoom
          roomId={activeRoom}
          roomName={activeRoomName}
          onMenuClick={() => setSidebarOpen(true)}
          onOnlineUsersChange={setOnlineUsers}
          onMessageSent={fetchConversations}
          onScheduleMeetingClick={() => openScheduleModal(activeRoom !== 'general' && !activeRoom.startsWith('meeting_') ? activeRoom : undefined)}
          onAddMembersClick={openAddMembersModal}
          onInviteLinkClick={openInviteModal}
          isAdmin={isGroupAdmin}
          isGroup={activeConversation?.type === 'group'}
        />
      </div>

      {/* Right Info Panel */}
      <div className="info-panel">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>👥</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>ROOM</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: '#fff' }}>{activeRoomName}</div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 5px #10b981' }}></span>
            {activeRoom === 'general' ? `${onlineUsers.length} people online` : 'Active conversation'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {activeConversation?.type === 'group' ? `Group with ${activeConversation.participants.length} members` : 'Real-time conversation'}
          </div>
        </div>

        {/* Group Info if active is Group */}
        {activeConversation?.type === 'group' && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
                GROUP MEMBERS ({activeConversation.participants.length})
              </div>
              {isGroupAdmin && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={openAddMembersModal}
                    title="Add members to group"
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Add
                  </button>
                  <button
                    onClick={openInviteModal}
                    title="Invite via link"
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#a78bfa',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔗 Link
                  </button>
                </div>
              )}
            </div>
            {activeConversation.description && (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '10px', fontStyle: 'italic' }}>
                {activeConversation.description}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {activeConversation.participants.map((p: any) => (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0' }}>
                  <span style={{ color: '#fff' }}>{p.name || p.username}</span>
                  {(activeConversation.admin?._id === p._id || activeConversation.admin === p._id) && (
                    <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>Admin</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#f8fafc', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            👥 PEOPLE IN THIS ROOM
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {onlineUsers.length === 0 && (
              <div style={{ color: '#64748b', fontSize: '0.8rem' }}>No one online</div>
            )}
            {onlineUsers.map(u => {
              const isSelf = user?._id === u.userId;
              return (
                <div
                  key={u.userId}
                  onClick={() => {
                    if (!isSelf) {
                      startPrivateChat({ _id: u.userId, username: u.username });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    cursor: isSelf ? 'default' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelf) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseOut={(e) => {
                    if (!isSelf) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(30,58,138,0.8), rgba(59,130,246,0.6))', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.75rem', color: '#fff', fontWeight: 600 }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#fff' }}>{u.username}</div>
                      <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Active</div>
                    </div>
                  </div>
                  {isSelf && (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>You</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Meetings Modal */}
      {showMeetingsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{showMeetingsModal === 'upcoming' ? '📅 Upcoming Meetings' : '⊕ Schedule Meeting & Google Meet'}</span>
              <span onClick={() => { setShowMeetingsModal(null); setMeetingError(''); }} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</span>
            </h3>

            {showMeetingsModal === 'upcoming' ? (
              <div>
                {copiedLink && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    ✓ Meeting link copied to clipboard!
                  </div>
                )}
                {meetingsLoading ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '30px 0' }}>
                    Loading meetings...
                  </div>
                ) : meetings.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '30px 0' }}>
                    You have no upcoming meetings scheduled.
                  </div>
                ) : (
                  <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px', marginBottom: '16px' }}>
                    {meetings.map((m) => {
                      const dateObj = new Date(m.startTime);
                      const formattedDate = dateObj.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const formattedTime = dateObj.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const hostName = m.createdBy?.name || m.createdBy?.username || 'NOVA Member';
                      const isHost = m.createdBy?._id === user?._id;

                      return (
                        <div
                          key={m._id}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginBottom: '2px' }}>
                                {m.title}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>🕒</span>
                                <span>{formattedDate} at {formattedTime}</span>
                              </div>
                              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                                Host: {hostName} {isHost && '(You)'}
                              </div>
                            </div>
                            {isHost && (
                              <button
                                onClick={() => handleDeleteMeeting(m._id)}
                                title="Cancel meeting"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.9rem',
                                  padding: '4px',
                                  opacity: 0.7,
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {m.googleMeetUrl ? (
                              <a
                                href={m.googleMeetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  flex: 1,
                                  background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '7px 12px',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  gap: '6px',
                                  textDecoration: 'none',
                                }}
                              >
                                <span>📹</span> Join Google Meet
                              </a>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveRoom(`meeting_${m._id}`);
                                  setActiveRoomName(m.title);
                                  setShowMeetingsModal(null);
                                }}
                                style={{
                                  flex: 1,
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '7px 12px',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Open Meeting Room
                              </button>
                            )}

                            <button
                              onClick={() => copyMeetingLink(m)}
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#cbd5e1',
                                borderRadius: '6px',
                                padding: '7px 10px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Copy meeting link"
                            >
                              <span>🔗</span> Link
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <button
                    onClick={() => openScheduleModal()}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    ⊕ Schedule New Meeting
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {meetingError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    {meetingError}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Meeting Title (e.g. Project Sync)"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
                  required
                />
                <input
                  type="text"
                  placeholder="Description (Optional)"
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
                />
                <input
                  type="datetime-local"
                  value={meetingDateTime}
                  onChange={(e) => setMeetingDateTime(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', colorScheme: 'dark' }}
                  required
                />

                {/* Target Group Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥</span> Post Meeting To Group / Chat:
                  </label>
                  <select
                    value={meetingSelectedConversationId}
                    onChange={(e) => setMeetingSelectedConversationId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(2, 6, 23, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" style={{ background: '#0b1120', color: '#94a3b8' }}>
                      -- Select Group to post this meeting (Optional) --
                    </option>
                    {conversations.map((conv) => {
                      const isGroup = conv.type === 'group';
                      let title = conv.name || 'Unnamed';
                      if (!isGroup) {
                        const otherParticipant = conv.participants?.find((p) => p._id !== user?._id);
                        title = otherParticipant?.name || otherParticipant?.username || 'Private Chat';
                      }
                      return (
                        <option key={conv._id} value={conv._id} style={{ background: '#0b1120', color: '#fff' }}>
                          {isGroup ? `👥 Group: ${title}` : `💬 Chat: ${title}`}
                        </option>
                      );
                    })}
                  </select>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {meetingSelectedConversationId
                      ? '✓ This meeting and Google Meet card will be posted directly into the selected group/chat.'
                      : 'Choose which group this meeting invitation should be posted into.'}
                  </span>
                </div>

                {/* Google Meet Option */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600 }}>📹 Google Meet Link</span>
                    {googleStatus.isConnected ? (
                      <span style={{ fontSize: '0.72rem', color: '#10b981' }}>✓ Google Calendar Linked</span>
                    ) : googleStatus.authUrl ? (
                      <a href={googleStatus.authUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: '#60a5fa' }}>Connect Google</a>
                    ) : null}
                  </div>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx (Optional)"
                    value={manualMeetUrl}
                    onChange={(e) => setManualMeetUrl(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="submit"
                    disabled={meetingSubmitting}
                    style={{ background: '#3b82f6', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: meetingSubmitting ? 0.7 : 1 }}
                  >
                    {meetingSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartInstantMeeting}
                    disabled={meetingSubmitting}
                    style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ⚡ Start Instant Meeting Now
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* New Private Chat Modal */}
      {showNewChatModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💬 Start Private Chat</span>
              <span onClick={() => { setShowNewChatModal(false); setUserSearchTerm(''); }} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</span>
            </h3>

            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
              Select any contact to start a 1-on-1 private conversation:
            </p>

            <input
              type="text"
              placeholder="Search contacts..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none', fontSize: '0.9rem', marginBottom: '16px'
              }}
            />

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {usersLoading ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading contacts...</div>
              ) : availableUsers.filter(u => !userSearchTerm.trim() || u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) || (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase()))).length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No contacts found</div>
              ) : (
                availableUsers
                  .filter(u => !userSearchTerm.trim() || u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) || (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())))
                  .map(contact => (
                    <div
                      key={contact._id}
                      onClick={() => startPrivateChat(contact)}
                      style={{
                        padding: '10px 14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(30,58,138,0.8), rgba(59,130,246,0.6))', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 600 }}>
                          {(contact.name || contact.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>{contact.name || contact.username}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>@{contact.username}</div>
                        </div>
                      </div>
                      <div style={{ background: '#3b82f6', color: '#fff', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 500 }}>
                        Message
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👥 Create Group Conversation</span>
              <span onClick={() => setShowCreateGroupModal(false)} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</span>
            </h3>

            {groupError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {groupError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="Group Name (e.g. Design Team)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
                required
              />
              <input
                type="text"
                placeholder="Description (Optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none' }}
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>Select Members:</label>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {availableUsers.map(u => {
                    const isSelected = groupSelectedMembers.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() => {
                          setGroupSelectedMembers(prev => isSelected ? prev.filter(id => id !== u._id) : [...prev, u._id]);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px',
                          borderRadius: '6px', background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', color: '#fff' }}>{u.name || u.username}</span>
                        <input type="checkbox" checked={isSelected} onChange={() => {}} style={{ cursor: 'pointer' }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={groupSubmitting}
                style={{ background: '#3b82f6', color: '#fff', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}
              >
                {groupSubmitting ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Members Directly to Group Modal */}
      {showAddMembersModal && activeConversation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#fff', marginBottom: '6px', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>👤+ Add Members</span>
              <span onClick={() => setShowAddMembersModal(false)} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</span>
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 16px 0' }}>
              Add registered users to <strong>{activeConversation.name}</strong>
            </p>

            {addMembersError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {addMembersError}
              </div>
            )}

            <input
              type="text"
              placeholder="Search users by username or name..."
              value={addMembersSearch}
              onChange={(e) => setAddMembersSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff',
                outline: 'none',
                fontSize: '0.88rem',
                marginBottom: '12px',
              }}
            />

            {/* Selected users chips preview */}
            {addMembersSelected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', maxHeight: '70px', overflowY: 'auto' }}>
                {addMembersSelected.map((uId) => {
                  const targetUser = availableUsers.find((u) => u._id === uId);
                  const displayName = targetUser?.name || targetUser?.username || 'User';
                  return (
                    <span
                      key={uId}
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        padding: '3px 8px',
                        borderRadius: '16px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {displayName}
                      <span
                        onClick={() => setAddMembersSelected((prev) => prev.filter((id) => id !== uId))}
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ×
                      </span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Candidate Users List */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {(() => {
                const currentMemberIds = new Set(activeConversation.participants.map((p: any) => p._id?.toString() || p.toString()));
                const candidateUsers = availableUsers.filter((u) => {
                  if (currentMemberIds.has(u._id)) return false;
                  if (!addMembersSearch.trim()) return true;
                  const query = addMembersSearch.toLowerCase();
                  return u.username.toLowerCase().includes(query) || (u.name && u.name.toLowerCase().includes(query));
                });

                if (candidateUsers.length === 0) {
                  return (
                    <div style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', padding: '20px' }}>
                      {availableUsers.length === 0 ? 'Loading users...' : 'No other users available to add'}
                    </div>
                  );
                }

                return candidateUsers.map((u) => {
                  const isSelected = addMembersSelected.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => {
                        setAddMembersSelected((prev) =>
                          isSelected ? prev.filter((id) => id !== u._id) : [...prev, u._id]
                        );
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(30,58,138,0.8), rgba(59,130,246,0.6))',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          {(u.name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>
                            {u.name || u.username}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            @{u.username}
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: '#10b981' }}
                      />
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddMembersModal(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMembersSubmit}
                disabled={addMembersSubmitting || addMembersSelected.length === 0}
                style={{
                  flex: 2,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: addMembersSubmitting || addMembersSelected.length === 0 ? 0.6 : 1,
                }}
              >
                {addMembersSubmitting
                  ? 'Adding...'
                  : `Add ${addMembersSelected.length > 0 ? `${addMembersSelected.length} ` : ''}Member${addMembersSelected.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite via Link Modal */}
      {showInviteModal && activeConversation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', borderRadius: '16px', width: '90%', maxWidth: '460px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#fff', marginBottom: '6px', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔗 Invite to Group via Link</span>
              <span onClick={() => setShowInviteModal(false)} style={{ cursor: 'pointer', color: '#64748b', fontSize: '1.2rem', lineHeight: 1 }}>✕</span>
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 16px 0' }}>
              Anyone with NOVA can follow this link to join <strong>{activeConversation.name}</strong>.
            </p>

            {copiedInviteLink && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ✓ Invite link copied to clipboard!
              </div>
            )}

            {inviteError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {inviteError}
              </div>
            )}

            {inviteLoading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', fontSize: '0.9rem' }}>
                Generating secure invitation link...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={currentInviteCode ? `${window.location.origin}/invite/${currentInviteCode}` : 'Loading...'}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(2, 6, 23, 0.85)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#60a5fa',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: '#fff',
                      border: 'none',
                      padding: '0 18px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>📋</span> Copy
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    lineHeight: 1.5,
                  }}
                >
                  💡 <strong>Tip:</strong> You can revoke this link anytime if you want to stop accepting new members from the current link.
                </div>

                {revokeConfirm ? (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 500 }}>
                      Are you sure? The previous link will become invalid immediately.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleRevokeInviteLink}
                        style={{
                          flex: 1,
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      >
                        Yes, Revoke & Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokeConfirm(false)}
                        style={{
                          flex: 1,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevokeConfirm(true)}
                    style={{
                      background: 'transparent',
                      border: '1px dashed rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>🔄</span> Revoke & Generate New Link
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
