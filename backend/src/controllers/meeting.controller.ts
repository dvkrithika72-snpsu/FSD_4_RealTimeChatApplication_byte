import { Response } from 'express';
import { Meeting } from '../models/Meeting';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import {
  isGoogleConfigured,
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  createGoogleMeetConference,
  isValidGoogleMeetUrl,
} from '../services/googleMeet.service';

export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      title,
      description,
      startTime,
      endTime,
      conversationId,
      participantIds,
      manualMeetUrl,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Meeting title is required' });
    }

    if (!startTime) {
      return res.status(400).json({ error: 'Meeting start time is required' });
    }

    const parsedStartTime = new Date(startTime);
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ error: 'Invalid meeting start date or time' });
    }

    let parsedEndTime: Date | undefined;
    if (endTime) {
      parsedEndTime = new Date(endTime);
      if (isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({ error: 'Invalid meeting end date or time' });
      }
    }

    // Determine participants
    const participantsSet = new Set<string>();
    participantsSet.add(req.userId);

    let verifiedConversationId: mongoose.Types.ObjectId | undefined;

    if (conversationId && conversationId !== 'general') {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ error: 'Invalid conversation ID' });
      }
      const conv = await Conversation.findById(conversationId);
      if (!conv || !conv.participants.some((p) => p.toString() === req.userId)) {
        return res.status(403).json({ error: 'Unauthorized to schedule meeting for this conversation' });
      }
      verifiedConversationId = conv._id as mongoose.Types.ObjectId;
      conv.participants.forEach((p) => participantsSet.add(p.toString()));
    }

    if (Array.isArray(participantIds)) {
      for (const pId of participantIds) {
        if (mongoose.Types.ObjectId.isValid(pId)) {
          participantsSet.add(pId);
        }
      }
    }

    let googleMeetUrl: string | undefined;
    let googleEventId: string | undefined;
    let isManualLink = false;

    // 1. Manual Google Meet link check
    if (manualMeetUrl && manualMeetUrl.trim()) {
      const cleanUrl = manualMeetUrl.trim();
      if (!isValidGoogleMeetUrl(cleanUrl)) {
        return res.status(400).json({
          error: 'Invalid Google Meet URL. Must be in the format: https://meet.google.com/xxx-xxxx-xxx',
        });
      }
      googleMeetUrl = cleanUrl;
      isManualLink = true;
    }
    // 2. Automated Google Meet creation if user connected Google account
    else {
      const user = await User.findById(req.userId);
      if (user?.googleCalendarTokens?.access_token) {
        try {
          const googleResult = await createGoogleMeetConference(req.userId, {
            title: title.trim(),
            description: description?.trim(),
            startTime: parsedStartTime,
            endTime: parsedEndTime,
          });
          googleMeetUrl = googleResult.googleMeetUrl;
          googleEventId = googleResult.googleEventId;
        } catch (googleErr: any) {
          console.warn('Google Meet API auto-creation error:', googleErr.message);
          return res.status(502).json({
            error: `Google Calendar/Meet creation failed: ${googleErr.message}. You can provide a manual Google Meet link or reconnect your account.`,
          });
        }
      }
    }

    const meeting = await Meeting.create({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      createdBy: req.userId,
      participants: Array.from(participantsSet),
      conversationId: verifiedConversationId,
      googleMeetUrl,
      googleEventId,
      isManualLink,
      status: 'scheduled',
    });

    const populatedMeeting = await meeting.populate([
      { path: 'createdBy', select: 'username name profilePicture' },
      { path: 'participants', select: 'username name profilePicture' },
    ]);

    let populatedChatMsg = undefined;
    if (verifiedConversationId) {
      const chatMsg = await Message.create({
        senderId: req.userId,
        roomId: verifiedConversationId.toString(),
        content: `📅 Meeting Scheduled: ${title.trim()}`,
        messageType: 'meeting',
        meetingId: meeting._id,
      });

      populatedChatMsg = await chatMsg.populate([
        { path: 'senderId', select: 'username _id name profilePicture' },
        {
          path: 'meetingId',
          populate: [
            { path: 'createdBy', select: 'username name profilePicture' },
            { path: 'participants', select: 'username name profilePicture' },
          ],
        },
      ]);

      const io = req.app.get('io');
      if (io) {
        io.to(verifiedConversationId.toString()).emit('receive_message', populatedChatMsg);
      }
    }

    res.status(201).json({ meeting: populatedMeeting, message: populatedChatMsg });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Server error while scheduling meeting' });
  }
};

export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // STRICT ACCOUNT ISOLATION: Only return meetings where current user is creator or participant
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const meetings = await Meeting.find({
      $or: [
        { createdBy: req.userId },
        { participants: req.userId },
      ],
      startTime: { $gte: cutoff },
    })
      .populate('createdBy', 'username name profilePicture')
      .populate('participants', 'username name profilePicture')
      .sort({ startTime: 1 });

    res.status(200).json({ meetings });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Server error while fetching meetings' });
  }
};

export const getMeetingById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }

    const meeting = await Meeting.findById(id)
      .populate('createdBy', 'username name profilePicture')
      .populate('participants', 'username name profilePicture');

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Strict authorization check
    const isCreator = meeting.createdBy._id.toString() === req.userId;
    const isParticipant = meeting.participants.some((p: any) => p._id.toString() === req.userId);

    if (!isCreator && !isParticipant) {
      return res.status(403).json({ error: 'Unauthorized to view this meeting' });
    }

    res.status(200).json({ meeting });
  } catch (error) {
    console.error('Get meeting by id error:', error);
    res.status(500).json({ error: 'Server error fetching meeting' });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const id = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid meeting ID' });
    }

    const meeting = await Meeting.findOneAndDelete({
      _id: id,
      createdBy: req.userId,
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found or unauthorized' });
    }

    res.status(200).json({ message: 'Meeting cancelled successfully', meetingId: id });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Server error while cancelling meeting' });
  }
};

export const getGoogleIntegrationStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId);
    const isConnected = Boolean(user?.googleCalendarTokens?.access_token);
    const isConfigured = isGoogleConfigured();
    const authUrl = isConfigured ? getGoogleAuthUrl(req.userId) : null;

    res.status(200).json({
      isConfigured,
      isConnected,
      authUrl,
    });
  } catch (error) {
    console.error('Get Google integration status error:', error);
    res.status(500).json({ error: 'Server error checking Google status' });
  }
};

export const connectGoogleAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    await handleGoogleOAuthCallback(code, req.userId);

    res.status(200).json({
      message: 'Google Calendar successfully connected for Google Meet integration',
      isConnected: true,
    });
  } catch (error: any) {
    console.error('Connect Google account error:', error);
    res.status(500).json({ error: error.message || 'Failed to authenticate with Google' });
  }
};

