import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { setupChatSocket } from './sockets/chat.socket';
import { startCleanupService } from './services/cleanup.service';
import { connectDB } from './utils/db';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import userRoutes from './routes/user.routes';
import uploadRoutes from './routes/upload.routes';
import meetingRoutes from './routes/meeting.routes';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/meetings', meetingRoutes);

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/', (req, res) => {
  res.send('Backend Server is running for Phase 2');
});

const startServer = async () => {
  await connectDB();
  
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST']
    }
  });

  app.set('io', io);

  setupChatSocket(io);
  startCleanupService(io);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
