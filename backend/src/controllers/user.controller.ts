import { Response } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth.middleware';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.userId).select('-passwordHash -resetPasswordToken -resetPasswordExpires -twoFactorCode -twoFactorExpires');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    const currentUserId = req.userId;

    const filter = (!query || query.trim() === '')
      ? { _id: { $ne: currentUserId } }
      : {
          _id: { $ne: currentUserId },
          $or: [
            { username: { $regex: query.trim(), $options: 'i' } },
            { name: { $regex: query.trim(), $options: 'i' } }
          ]
        };

    // Search by username or name, exclude current user
    const users = await User.find(filter)
      .select('_id username name profilePicture status')
      .limit(50);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name, username, profilePicture, status } = req.body;

    // Check if username is being changed and is already taken
    if (username && username.trim()) {
      const trimmedUsername = username.trim();
      const existingUser = await User.findOne({ username: trimmedUsername, _id: { $ne: req.userId } });
      if (existingUser) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          ...(name !== undefined && { name: name.trim() }),
          ...(username !== undefined && { username: username.trim() }),
          ...(profilePicture !== undefined && { profilePicture }),
          ...(status !== undefined && { status: status.trim() }),
          profileSetupComplete: true,
        },
      },
      { new: true }
    ).select('-passwordHash -resetPasswordToken -resetPasswordExpires -twoFactorCode -twoFactorExpires');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error during profile update' });
  }
};
