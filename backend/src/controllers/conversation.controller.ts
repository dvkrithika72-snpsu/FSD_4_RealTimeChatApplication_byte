import { Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';
import mongoose from 'mongoose';
import crypto from 'crypto';

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.userId;
    
    // Check if self-chat exists, if not create it
    let selfChat = await Conversation.findOne({
      type: 'direct',
      participants: { $size: 1, $all: [userId] }
    });
    
    if (!selfChat) {
      selfChat = await Conversation.create({
        type: 'direct',
        participants: [userId]
      });
    }

    // Find all conversations where the current user is a participant
    const conversations = await Conversation.find({
      participants: userId
    })
      .populate('participants', 'username _id name profilePicture status')
      .populate('admin', 'username _id name');

    // Fetch the latest message and unread count for each conversation
    const conversationsWithLatestMessage = await Promise.all(
      conversations.map(async (conv) => {
        const latestMessage = await Message.findOne({ roomId: conv._id.toString() })
          .populate('senderId', 'username _id name')
          .sort({ createdAt: -1 });
        
        const unreadCount = await Message.countDocuments({
          roomId: conv._id.toString(),
          senderId: { $ne: userId },
          status: 'sent'
        });

        return {
          _id: conv._id.toString(),
          type: conv.type || 'direct',
          name: conv.name,
          description: conv.description,
          admin: conv.admin,
          inviteCode: conv.inviteCode,
          participants: conv.participants,
          latestMessage,
          updatedAt: latestMessage ? latestMessage.createdAt : conv.updatedAt,
          unreadCount
        };
      })
    );

    // Get general chat stats
    const generalLatestMessage = await Message.findOne({ roomId: 'general' })
      .populate('senderId', 'username _id name')
      .sort({ createdAt: -1 });
    
    const generalUnreadCount = await Message.countDocuments({
      roomId: 'general',
      senderId: { $ne: userId },
      status: 'sent'
    });

    const generalConversation = {
      _id: 'general',
      type: 'group' as const,
      name: 'General Chat',
      participants: [{ _id: 'general', username: 'General Chat' }],
      latestMessage: generalLatestMessage,
      updatedAt: generalLatestMessage ? generalLatestMessage.createdAt : new Date(0),
      unreadCount: generalUnreadCount
    };

    const allConversations = [...conversationsWithLatestMessage, generalConversation];
    
    // Sort all by updatedAt descending
    allConversations.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    res.status(200).json({ conversations: allConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getOrCreateConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.userId;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ error: 'Invalid target user ID' });
    }

    // Check if direct conversation already exists between these two users
    let conversation;
    
    if (userId === targetUserId) {
      // Self chat query
      conversation = await Conversation.findOne({
        type: 'direct',
        participants: { $size: 1, $all: [userId] }
      }).populate('participants', 'username _id name profilePicture status');
    } else {
      // Normal private chat query
      conversation = await Conversation.findOne({
        type: 'direct',
        participants: { $size: 2, $all: [userId, targetUserId] },
      }).populate('participants', 'username _id name profilePicture status');
    }

    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: userId === targetUserId ? [userId] : [userId, targetUserId],
      });
      conversation = await conversation.populate('participants', 'username _id name profilePicture status');
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createGroupConversation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const userId = req.userId;
    const { name, description, participantIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const participantsSet = new Set<string>();
    participantsSet.add(userId);

    if (Array.isArray(participantIds)) {
      for (const pId of participantIds) {
        if (mongoose.Types.ObjectId.isValid(pId)) {
          participantsSet.add(pId);
        }
      }
    }

    if (participantsSet.size < 2) {
      return res.status(400).json({ error: 'A group must have at least one other participant' });
    }

    const newGroup = await Conversation.create({
      type: 'group',
      name: name.trim(),
      description: description ? description.trim() : undefined,
      admin: userId,
      participants: Array.from(participantsSet),
    });

    const populatedGroup = await newGroup.populate([
      { path: 'participants', select: 'username _id name profilePicture status' },
      { path: 'admin', select: 'username _id name' },
    ]);

    // Send initial group created message
    await Message.create({
      senderId: userId,
      roomId: newGroup._id.toString(),
      content: `🎉 Group "${name.trim()}" was created`,
      messageType: 'text',
    });

    res.status(201).json({ conversation: populatedGroup });
  } catch (error) {
    console.error('Create group conversation error:', error);
    res.status(500).json({ error: 'Server error creating group' });
  }
};

export const getConversationById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const id = req.params.id as string;
    if (id === 'general') {
      return res.status(200).json({
        conversation: {
          _id: 'general',
          type: 'group',
          name: 'General Chat',
          participants: [],
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(id)
      .populate('participants', 'username _id name profilePicture status')
      .populate('admin', 'username _id name');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isMember = conversation.participants.some(
      (p: any) => p._id.toString() === req.userId
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Unauthorized to view this conversation' });
    }

    res.status(200).json({ conversation });
  } catch (error) {
    console.error('Get conversation by id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addGroupMembers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const conversationId = req.params.id as string;
    const { userIds } = req.body;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ error: 'Members can only be added to group conversations' });
    }

    // Only authorized group administrators can add members
    const isAdmin = conversation.admin?.toString() === req.userId;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only the group administrator can add members' });
    }

    // Validate that userIds exist in User collection
    const validUsers = await User.find({ _id: { $in: userIds } });
    if (validUsers.length === 0) {
      return res.status(400).json({ error: 'No valid users found to add' });
    }

    const existingParticipantIds = new Set(
      conversation.participants.map((p) => p.toString())
    );

    // Prevent duplicate members: filter out users already in the group
    const newUsersToAdd = validUsers.filter(
      (u) => !existingParticipantIds.has(u._id.toString())
    );

    if (newUsersToAdd.length === 0) {
      return res.status(400).json({ error: 'Selected users are already members of this group' });
    }

    const newIds = newUsersToAdd.map((u) => u._id as mongoose.Types.ObjectId);
    conversation.participants.push(...newIds);
    conversation.updatedAt = new Date();
    await conversation.save();

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username _id name profilePicture status')
      .populate('admin', 'username _id name');

    // Create announcement message in the group
    const adminUser = await User.findById(req.userId);
    const adminName = adminUser?.name || adminUser?.username || 'Admin';
    const addedNames = newUsersToAdd.map((u) => u.name || u.username).join(', ');

    const systemMessage = await Message.create({
      senderId: req.userId,
      roomId: conversation._id.toString(),
      content: `👤 ${adminName} added ${addedNames} to the group`,
      messageType: 'text',
    });

    const populatedMessage = await systemMessage.populate([
      { path: 'senderId', select: 'username _id name profilePicture' },
    ]);

    // Socket.io real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(conversation._id.toString()).emit('receive_message', populatedMessage);
      io.emit('conversation_updated', {
        conversationId: conversation._id.toString(),
        memberCount: conversation.participants.length,
      });
    }

    res.status(200).json({
      conversation: populatedConversation,
      addedUsers: newUsersToAdd.map((u) => ({ _id: u._id, username: u.username, name: u.name })),
    });
  } catch (error) {
    console.error('Add group members error:', error);
    res.status(500).json({ error: 'Server error adding members' });
  }
};

export const getGroupInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const conversationId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ error: 'Invite links are only supported for groups' });
    }

    // Only authorized group administrators can manage invite links
    const isAdmin = conversation.admin?.toString() === req.userId;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only the group administrator can manage invite links' });
    }

    if (!conversation.inviteCode) {
      conversation.inviteCode = crypto.randomBytes(12).toString('hex');
      await conversation.save();
    }

    res.status(200).json({
      inviteCode: conversation.inviteCode,
      groupId: conversation._id,
      groupName: conversation.name,
    });
  } catch (error) {
    console.error('Get group invite link error:', error);
    res.status(500).json({ error: 'Server error retrieving invite link' });
  }
};

export const revokeGroupInviteLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const conversationId = req.params.id as string;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ error: 'Invite links are only supported for groups' });
    }

    const isAdmin = conversation.admin?.toString() === req.userId;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only the group administrator can revoke invite links' });
    }

    // Generate a new secure, unpredictable code replacing the old one
    conversation.inviteCode = crypto.randomBytes(12).toString('hex');
    await conversation.save();

    res.status(200).json({
      message: 'Invite link revoked and new link generated successfully',
      inviteCode: conversation.inviteCode,
    });
  } catch (error) {
    console.error('Revoke group invite link error:', error);
    res.status(500).json({ error: 'Server error revoking invite link' });
  }
};

export const getInviteDetails = async (req: AuthRequest, res: Response) => {
  try {
    const code = req.params.code as string;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid invitation code' });
    }

    const conversation = await Conversation.findOne({
      type: 'group',
      inviteCode: code.trim(),
    })
      .populate('admin', 'username name profilePicture')
      .populate('participants', 'username name profilePicture');

    if (!conversation) {
      return res.status(404).json({
        error: 'This invitation link is invalid or has been revoked by the group administrator',
      });
    }

    const isMember = Boolean(
      req.userId &&
        conversation.participants.some(
          (p: any) => p._id.toString() === req.userId
        )
    );

    res.status(200).json({
      group: {
        _id: conversation._id,
        name: conversation.name,
        description: conversation.description,
        memberCount: conversation.participants.length,
        admin: conversation.admin,
        isMember,
      },
    });
  } catch (error) {
    console.error('Get invite details error:', error);
    res.status(500).json({ error: 'Server error checking invitation' });
  }
};

export const joinGroupByInvite = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required to join group' });
    }

    const code = req.params.code as string;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid invitation code' });
    }

    const conversation = await Conversation.findOne({
      type: 'group',
      inviteCode: code.trim(),
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'This invitation link is invalid, expired, or has been revoked by the group administrator',
      });
    }

    const isAlreadyMember = conversation.participants.some(
      (p) => p.toString() === req.userId
    );

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'username _id name profilePicture status')
      .populate('admin', 'username _id name');

    if (isAlreadyMember) {
      return res.status(200).json({
        alreadyMember: true,
        conversation: populated,
        message: 'You are already a member of this group',
      });
    }

    conversation.participants.push(new mongoose.Types.ObjectId(req.userId));
    conversation.updatedAt = new Date();
    await conversation.save();

    const joiningUser = await User.findById(req.userId);
    const userName = joiningUser?.name || joiningUser?.username || 'New Member';

    // Create announcement message
    const systemMessage = await Message.create({
      senderId: req.userId,
      roomId: conversation._id.toString(),
      content: `👋 ${userName} joined using an invite link`,
      messageType: 'text',
    });

    const populatedMessage = await systemMessage.populate([
      { path: 'senderId', select: 'username _id name profilePicture' },
    ]);

    // Socket.io real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.to(conversation._id.toString()).emit('receive_message', populatedMessage);
      io.emit('conversation_updated', {
        conversationId: conversation._id.toString(),
        memberCount: conversation.participants.length,
      });
    }

    const updatedPopulated = await Conversation.findById(conversation._id)
      .populate('participants', 'username _id name profilePicture status')
      .populate('admin', 'username _id name');

    res.status(200).json({
      joined: true,
      conversation: updatedPopulated,
      message: 'Successfully joined group',
    });
  } catch (error) {
    console.error('Join group by invite error:', error);
    res.status(500).json({ error: 'Server error joining group' });
  }
};
