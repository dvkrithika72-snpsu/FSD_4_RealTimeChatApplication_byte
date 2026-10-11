import { Server } from 'socket.io';
import { Message } from '../models/Message';

let cleanupInterval: NodeJS.Timeout | null = null;

export const startCleanupService = (io: Server) => {
  if (cleanupInterval) return;

  // Run cleanup every 2 seconds
  cleanupInterval = setInterval(async () => {
    try {
      const now = new Date();
      
      // Find messages whose scheduled deletion time has passed
      const messagesToDelete = await Message.find({
        scheduledDeletionAt: { $lte: now }
      });

      if (messagesToDelete.length > 0) {
        for (const msg of messagesToDelete) {
          // Emit deletion event to the specific room
          io.to(msg.roomId).emit('message_deleted', {
            messageId: msg._id,
            roomId: msg.roomId
          });
          
          // Delete from MongoDB
          await Message.deleteOne({ _id: msg._id });
        }
      }
    } catch (error) {
      console.error('Error in cleanup service:', error);
    }
  }, 2000);

  console.log('Message cleanup service started');
};

export const stopCleanupService = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Message cleanup service stopped');
  }
};
