import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { Meeting } from '../models/Meeting';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const roomId = (req.query.roomId as string) || 'general';
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (roomId !== 'general') {
      if (roomId.startsWith('meeting_')) {
        const meetingId = roomId.replace('meeting_', '');
        if (!mongoose.Types.ObjectId.isValid(meetingId)) {
          return res.status(400).json({ error: 'Invalid meeting ID' });
        }
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
          return res.status(404).json({ error: 'Meeting not found' });
        }
        const isAuthorized =
          meeting.createdBy.toString() === userId ||
          meeting.participants.some((p) => p.toString() === userId);
        if (!isAuthorized) {
          return res.status(403).json({ error: 'Unauthorized to view this meeting' });
        }
      } else {
        if (!mongoose.Types.ObjectId.isValid(roomId)) {
          return res.status(400).json({ error: 'Invalid room ID' });
        }
        const conversation = await Conversation.findById(roomId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }
    }

    const messages = await Message.find({ roomId })
      .populate('senderId', 'username _id name profilePicture')
      .populate({
        path: 'meetingId',
        populate: [
          { path: 'createdBy', select: 'username name profilePicture' },
          { path: 'participants', select: 'username name profilePicture' },
        ],
      })
      .sort({ createdAt: 1 }); // Chronological order

    return res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
