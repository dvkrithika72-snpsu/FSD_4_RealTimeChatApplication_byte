import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  name?: string;
  email: string;
  passwordHash: string;
  profilePicture?: string;
  status?: string;
  profileSetupComplete: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  twoFactorCode?: string;
  twoFactorExpires?: Date;
  googleId?: string;
  googleCalendarTokens?: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'Available',
    },
    profileSetupComplete: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    googleCalendarTokens: {
      access_token: String,
      refresh_token: String,
      expiry_date: Number,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    twoFactorCode: String,
    twoFactorExpires: Date,
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', userSchema);
