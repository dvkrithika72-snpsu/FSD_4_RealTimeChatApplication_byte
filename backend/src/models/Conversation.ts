import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  admin?: mongoose.Types.ObjectId;
  inviteCode?: string;
  participants: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
