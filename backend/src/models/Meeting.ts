import mongoose, { Document, Schema } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  createdBy: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  conversationId?: mongoose.Types.ObjectId;
  googleMeetUrl?: string;
  googleEventId?: string;
  isManualLink?: boolean;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    googleMeetUrl: {
      type: String,
      trim: true,
    },
    googleEventId: {
      type: String,
      trim: true,
    },
    isManualLink: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
  }
);

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
