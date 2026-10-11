import { Router } from 'express';
import { register, login, me, forgotPassword, resetPassword, verifyOTP, googleLogin, checkEmail } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/check-email', checkEmail);
router.post('/verify-otp', verifyOTP);
router.post('/google', googleLogin);
router.get('/me', authenticateToken, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
