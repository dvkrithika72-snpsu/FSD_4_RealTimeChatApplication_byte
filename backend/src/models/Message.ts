import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  roomId: string;
  content: string;
  messageType?: 'text' | 'meeting' | 'file';
  meetingId?: mongoose.Types.ObjectId;
  status: 'sent' | 'read';
  readAt: Date | null;
  scheduledDeletionAt: Date | null;
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: String, required: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'meeting', 'file'], default: 'text' },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null },
    status: { type: String, enum: ['sent', 'read'], default: 'sent' },
    readAt: { type: Date, default: null },
    scheduledDeletionAt: { type: Date, default: null },
    attachmentUrl: { type: String },
    attachmentType: { type: String },
    attachmentName: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model<IMessage>('Message', messageSchema);
