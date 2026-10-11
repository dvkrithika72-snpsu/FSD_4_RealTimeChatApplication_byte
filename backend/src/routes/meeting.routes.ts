import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  createMeeting,
  getMeetings,
  deleteMeeting,
  getMeetingById,
  getGoogleIntegrationStatus,
  connectGoogleAccount,
} from '../controllers/meeting.controller';

const router = Router();

router.use(authenticateToken);
router.get('/google/status', getGoogleIntegrationStatus);
router.post('/google/connect', connectGoogleAccount);
router.post('/', createMeeting);
router.get('/', getMeetings);
router.get('/:id', getMeetingById);
router.delete('/:id', deleteMeeting);

export default router;
