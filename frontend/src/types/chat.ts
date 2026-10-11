import type { User } from '../context/AuthContext';

export interface IMeeting {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  createdBy: User;
  participants: User[];
  conversationId?: string;
  googleMeetUrl?: string;
  googleEventId?: string;
  isManualLink?: boolean;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface IMessage {
  _id: string;
  senderId: User;
  roomId: string;
  content: string;
  messageType?: 'text' | 'meeting' | 'file';
  meetingId?: IMeeting | null;
  status: 'sent' | 'read';
  readAt: string | null;
  scheduledDeletionAt?: string | null;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface IConversation {
  _id: string;
  type?: 'direct' | 'group';
  name?: string;
  description?: string;
  admin?: User;
  inviteCode?: string;
  participants: User[];
  latestMessage?: IMessage;
  updatedAt: string;
  unreadCount?: number;
}

