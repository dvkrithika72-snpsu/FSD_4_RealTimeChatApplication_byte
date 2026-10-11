import { Router } from 'express';
import { getMessages } from '../controllers/chat.controller';
import {
  getConversations,
  getOrCreateConversation,
  createGroupConversation,
  getConversationById,
  addGroupMembers,
  getGroupInviteLink,
  revokeGroupInviteLink,
  getInviteDetails,
  joinGroupByInvite,
} from '../controllers/conversation.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/messages', authenticateToken, getMessages);
router.get('/conversations', authenticateToken, getConversations);
router.get('/conversations/:id', authenticateToken, getConversationById);
router.post('/conversations', authenticateToken, getOrCreateConversation);
router.post('/groups', authenticateToken, createGroupConversation);
router.post('/groups/:id/members', authenticateToken, addGroupMembers);
router.get('/groups/:id/invite', authenticateToken, getGroupInviteLink);
router.post('/groups/:id/invite/revoke', authenticateToken, revokeGroupInviteLink);
router.get('/invites/:code', authenticateToken, getInviteDetails);
router.post('/invites/:code/join', authenticateToken, joinGroupByInvite);

export default router;
