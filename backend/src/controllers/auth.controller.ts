import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

const generateToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '24h' }
  );
};

const formatUserResponse = (user: any) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  name: user.name,
  profilePicture: user.profilePicture,
  status: user.status,
  profileSetupComplete: user.profileSetupComplete,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Rate limiting for password reset requests (5 requests per 15 minutes)
const forgotPasswordAttempts = new Map<string, number[]>();

const isRateLimited = (key: string, limit: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const timestamps = (forgotPasswordAttempts.get(key) || []).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) {
    return true;
  }
  timestamps.push(now);
  forgotPasswordAttempts.set(key, timestamps);
  return false;
};

const createMailTransporter = async () => {
  const isGmail = process.env.SMTP_SERVICE === 'gmail' || process.env.SMTP_HOST === 'smtp.gmail.com';
  if ((process.env.SMTP_HOST || process.env.SMTP_SERVICE) && process.env.SMTP_USER && process.env.SMTP_PASS) {
    if (isGmail) {
      return {
        transporter: nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
          },
        }),
        isTest: false,
      };
    }

    return {
      transporter: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS?.replace(/\s+/g, ''),
        },
      }),
      isTest: false,
    };
  }

  const testAccount = await nodemailer.createTestAccount();
  return {
    transporter: nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    }),
    isTest: true,
  };
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
    });

    const token = generateToken(newUser._id.toString());

    res.status(201).json({
      token,
      user: formatUserResponse(newUser),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/Username and password are required' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier },
      ],
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { username, otp } = req.body;
    
    if (!username || !otp) {
      return res.status(400).json({ error: 'Username and OTP are required' });
    }

    const user = await User.findOne({ 
      username,
      twoFactorCode: otp,
      twoFactorExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired authentication code' });
    }

    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    const token = generateToken(user._id.toString());

    res.status(200).json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: "Couldn't find your account" });
    }

    res.status(200).json({ message: 'Email exists', username: user.username });
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google authentication token is required' });
    }

    // Verify token using Google OAuth userinfo endpoint
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Invalid or expired Google token' });
    }

    const googleUser = (await googleRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    const googleId = googleUser.sub;
    const email = googleUser.email;

    if (!email || !googleId) {
      return res.status(400).json({ error: 'Google account details incomplete' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check if user already exists by googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // 2. Check if user exists by email
      user = await User.findOne({ email: normalizedEmail });

      if (user) {
        // Prevent unsafe account linking if Google email is not verified
        if (!googleUser.email_verified) {
          return res.status(400).json({ error: 'Cannot link unverified Google email to existing account' });
        }
        // Link Google ID to existing verified account
        user.googleId = googleId;
        if (!user.profilePicture && googleUser.picture) {
          user.profilePicture = googleUser.picture;
        }
        if (!user.name && googleUser.name) {
          user.name = googleUser.name;
        }
        user.profileSetupComplete = true;
        await user.save();
      } else {
        // 3. First-time Google user -> create new account
        let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
        if (!baseUsername) baseUsername = 'user';
        let candidateUsername = baseUsername;
        let suffix = 1;
        while (await User.findOne({ username: candidateUsername })) {
          candidateUsername = `${baseUsername}${suffix}`;
          suffix++;
        }

        const randomPassword = crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(randomPassword, salt);

        user = await User.create({
          username: candidateUsername,
          email: normalizedEmail,
          name: googleUser.name || candidateUsername,
          profilePicture: googleUser.picture || '',
          googleId,
          passwordHash,
          profileSetupComplete: true,
        });
      }
    } else {
      if (!user.profileSetupComplete) {
        user.profileSetupComplete = true;
        await user.save();
      }
    }

    const jwtToken = generateToken(user._id.toString());

    res.status(200).json({
      token: jwtToken,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Server error during Google login' });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await User.findById(req.userId).select('-passwordHash -resetPasswordToken -resetPasswordExpires -twoFactorCode -twoFactorExpires');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json({ user: formatUserResponse(user) });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    // Rate limiting: max 5 requests per 15 minutes per IP/email
    if (isRateLimited(`${clientIp}_${normalizedEmail}`)) {
      return res.status(429).json({ error: 'Too many password reset requests. Please try again later.' });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ 
        error: `No registered account was found with "${email}". Please verify your email address or create an account.` 
      });
    }

    // Generate cryptographically secure token and store ONLY the hash + expiry
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    // Send email using configured transporter
    let etherealUrl: string | false = false;
    let mailSent = false;
    try {
      const { transporter, isTest } = await createMailTransporter();

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"NOVA Support" <support@nova.chat>',
        to: user.email,
        subject: 'Password Reset Request',
        text: `You requested a password reset for your NOVA account. Please click the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.`,
        html: `<h2>NOVA Password Reset</h2><p>You requested a password reset for your NOVA account.</p><p><a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#3b82f6;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a></p><p>Or copy this link into your browser: <br/><a href="${resetUrl}">${resetUrl}</a></p><p>This link will expire in 1 hour.</p><p>If you did not request this, you can safely ignore this email.</p>`
      });

      mailSent = true;
      if (isTest) {
        etherealUrl = nodemailer.getTestMessageUrl(info);
      }
    } catch (mailError) {
      console.warn('Email dispatch warning (continuing with direct reset URL):', mailError);
    }

    console.log('\n======================================================');
    console.log('🔑 [PASSWORD RESET LINK GENERATED]');
    console.log(`   User Email  : ${user.email}`);
    console.log(`   Reset URL   : ${resetUrl}`);
    if (etherealUrl) {
      console.log(`   Virtual Inbox: ${etherealUrl}`);
    }
    console.log('======================================================\n');

    res.status(200).json({ 
      message: 'Password reset link generated successfully.',
      resetUrl,
      rawToken,
      mailSent,
      isMockEmail: Boolean(!process.env.SMTP_HOST || !process.env.SMTP_USER),
      ...(etherealUrl && { etherealUrl })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Hash token to look up in DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    // Security requirement: "The token becomes invalid after use."
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password successfully reset. You may now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
