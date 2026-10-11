import express from 'express';
import { searchUsers, updateProfile, getProfile } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

router.get('/profile', authenticateToken, getProfile);
router.get('/search', authenticateToken, searchUsers);
router.put('/profile', authenticateToken, updateProfile);

export default router;
