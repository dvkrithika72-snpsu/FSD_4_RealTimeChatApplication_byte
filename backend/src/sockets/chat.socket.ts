import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { Conversation } from '../models/Conversation';
import { Meeting } from '../models/Meeting';
import mongoose from 'mongoose';

interface AuthSocket extends Socket {
  userId?: string;
  username?: string;
}

const roomUsers = new Map<string, Map<string, { username: string, socketIds: Set<string> }>>();

const getRoomUsers = (roomId: string) => {
  const users = roomUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.entries()).map(([userId, data]) => ({
    userId,
    username: data.username,
  }));
};

const addUserToRoom = (roomId: string, userId: string, username: string, socketId: string) => {
  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map());
  }
  const users = roomUsers.get(roomId)!;
  if (!users.has(userId)) {
    users.set(userId, { username, socketIds: new Set() });
  }
  users.get(userId)!.socketIds.add(socketId);
};

const removeUserFromRoom = (roomId: string, userId: string, socketId: string) => {
  const users = roomUsers.get(roomId);
  if (!users) return false;
  const user = users.get(userId);
  if (!user) return false;
  
  user.socketIds.delete(socketId);
  if (user.socketIds.size === 0) {
    users.delete(userId);
    if (users.size === 0) {
      roomUsers.delete(roomId);
    }
    return true;
  }
  return false;
};

export const setupChatSocket = (io: Server) => {
  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret'
      ) as { userId: string };
      
      const user = await User.findById(decoded.userId).select('username');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = decoded.userId;
      socket.username = user.username;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);

    const joinRoom = async (roomId: string) => {
      if (roomId !== 'general') {
        try {
          if (roomId.startsWith('meeting_')) {
            const meetingId = roomId.replace('meeting_', '');
            if (!mongoose.Types.ObjectId.isValid(meetingId)) {
              return socket.emit('error', { message: 'Invalid meeting id' });
            }
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
              return socket.emit('error', { message: 'Meeting not found' });
            }
            const isAuthorized =
              meeting.createdBy.toString() === socket.userId ||
              meeting.participants.some((p) => p.toString() === socket.userId);
            if (!isAuthorized) {
              return socket.emit('error', { message: 'Unauthorized to join this meeting room' });
            }
          } else {
            if (!mongoose.Types.ObjectId.isValid(roomId)) {
              return socket.emit('error', { message: 'Invalid room id' });
            }
            const conversation = await Conversation.findById(roomId);
            if (!conversation || !conversation.participants.some(p => p.toString() === socket.userId)) {
              return socket.emit('error', { message: 'Unauthorized to join this conversation' });
            }
          }
        } catch (e) {
          return socket.emit('error', { message: 'Invalid room id' });
        }
      }

      socket.join(roomId);
      if (socket.userId && socket.username) {
        addUserToRoom(roomId, socket.userId, socket.username, socket.id);
        io.to(roomId).emit('online_users', getRoomUsers(roomId));
      }
    };

    socket.on('join_room', (roomId: string) => {
      joinRoom(roomId);
    });

    joinRoom('general');
    
    // Join all existing conversation rooms for this user
    if (socket.userId) {
      Conversation.find({ participants: socket.userId }).then(conversations => {
        conversations.forEach(conv => {
          socket.join(conv._id.toString());
        });
      }).catch(err => console.error('Error joining user conversations:', err));
    }

    socket.on('send_message', async (data: {
      roomId: string;
      content: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
      messageType?: 'text' | 'meeting' | 'file';
      meetingId?: string;
    }) => {
      try {
        if ((!data.content || data.content.trim() === '') && !data.attachmentUrl && !data.meetingId) {
          return socket.emit('error', { message: 'Message content cannot be empty' });
        }
        if (data.content && data.content.length > 2000) {
          return socket.emit('error', { message: 'Message is too long' });
        }
        
        const roomId = data.roomId || 'general';

        if (roomId !== 'general') {
          if (roomId.startsWith('meeting_')) {
            const meetingId = roomId.replace('meeting_', '');
            if (!mongoose.Types.ObjectId.isValid(meetingId)) {
              return socket.emit('error', { message: 'Invalid meeting id' });
            }
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
              return socket.emit('error', { message: 'Meeting not found' });
            }
            const isAuthorized =
              meeting.createdBy.toString() === socket.userId ||
              meeting.participants.some((p) => p.toString() === socket.userId);
            if (!isAuthorized) {
              return socket.emit('error', { message: 'Unauthorized to participate in this meeting' });
            }
          } else {
            if (!mongoose.Types.ObjectId.isValid(roomId)) {
              return socket.emit('error', { message: 'Invalid room id' });
            }
            const conversation = await Conversation.findById(roomId);
            if (!conversation || !conversation.participants.some(p => p.toString() === socket.userId)) {
              return socket.emit('error', { message: 'Unauthorized to send message to this conversation' });
            }
            
            // Update conversation timestamp
            conversation.updatedAt = new Date();
            await conversation.save();
          }
        }

        const newMessage = await Message.create({
          senderId: socket.userId,
          roomId,
          content: data.content,
          attachmentUrl: data.attachmentUrl,
          attachmentType: data.attachmentType,
          attachmentName: data.attachmentName,
          messageType: data.messageType || (data.attachmentUrl ? 'file' : data.meetingId ? 'meeting' : 'text'),
          meetingId: data.meetingId ? new mongoose.Types.ObjectId(data.meetingId) : undefined,
        });

        const populatedMessage = await newMessage.populate([
          { path: 'senderId', select: 'username _id name profilePicture' },
          {
            path: 'meetingId',
            populate: [
              { path: 'createdBy', select: 'username name profilePicture' },
              { path: 'participants', select: 'username name profilePicture' },
            ],
          },
        ]);

        io.to(roomId).emit('receive_message', populatedMessage);
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data: { roomId: string }) => {
      const roomId = data.roomId || 'general';
      socket.to(roomId).emit('user_typing', { userId: socket.userId, username: socket.username });
    });

    socket.on('mark_read', async (data: { messageId: string }) => {
      try {
        const message = await Message.findById(data.messageId);
        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        // SENDER-CHECK: Only recipients (not sender) mark as read
        if (message.senderId.toString() === socket.userId) {
          return;
        }

        // Room authorization check
        if (message.roomId !== 'general' && !message.roomId.startsWith('meeting_')) {
          const conv = await Conversation.findById(message.roomId);
          if (!conv || !conv.participants.some((p) => p.toString() === socket.userId)) {
            return socket.emit('error', { message: 'Unauthorized' });
          }
        }

        if (message.status !== 'read') {
          message.status = 'read';
          message.readAt = new Date();
          
          // Self-destruct countdown: 15 seconds after recipient reads it
          const deletionTime = new Date(message.readAt.getTime() + 15 * 1000);
          message.scheduledDeletionAt = deletionTime;
          
          await message.save();

          io.to(message.roomId).emit('message_status_update', {
            messageId: message._id,
            status: 'read',
            readAt: message.readAt,
            scheduledDeletionAt: message.scheduledDeletionAt
          });
        }
      } catch (err) {
        console.error('Error marking message as read:', err);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.username}`);
      if (socket.userId) {
        for (const [roomId, users] of roomUsers.entries()) {
          const fullyDisconnected = removeUserFromRoom(roomId, socket.userId, socket.id);
          if (fullyDisconnected) {
            io.to(roomId).emit('online_users', getRoomUsers(roomId));
          }
        }
      }
    });
  });
};
