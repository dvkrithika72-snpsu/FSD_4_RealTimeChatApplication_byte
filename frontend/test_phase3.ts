import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING PHASE 3 TESTS ---');

  try {
    const user1 = { username: 'test_u1_' + Date.now(), password: 'pwd' };
    const user2 = { username: 'test_u2_' + Date.now(), password: 'pwd' };

    // Register & Login User 1
    await axios.post(`${API_URL}/auth/register`, user1);
    const res1 = await axios.post(`${API_URL}/auth/login`, user1);
    const token1 = res1.data.token;

    // Register & Login User 2
    await axios.post(`${API_URL}/auth/register`, user2);
    const res2 = await axios.post(`${API_URL}/auth/login`, user2);
    const token2 = res2.data.token;

    console.log('✅ Users registered & logged in');

    // Socket connections
    const socket1 = io('http://localhost:5000', { auth: { token: token1 } });
    const socket2 = io('http://localhost:5000', { auth: { token: token2 } });
    
    // Invalid connection
    const socketInvalid = io('http://localhost:5000', { auth: { token: 'invalid' } });

    await new Promise(resolve => setTimeout(resolve, 500));

    if (socketInvalid.connected) {
      throw new Error('Invalid socket should not connect');
    }
    console.log('✅ Unauthenticated socket rejected');
    
    if (!socket1.connected || !socket2.connected) {
      throw new Error('Sockets failed to connect');
    }
    console.log('✅ Authenticated sockets connected');

    socket2.on('receive_message', (msg) => {
      console.log('✅ User 2 received real-time message:', msg.content);
      
      // Test Mark Read
      socket2.emit('mark_read', { messageId: msg._id });
    });

    socket1.on('message_status_update', (update) => {
      console.log('✅ User 1 received read status update for message:', update.messageId);
      
      // Cleanup
      socket1.disconnect();
      socket2.disconnect();
      console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
      process.exit(0);
    });

    socket1.on('error', (err) => {
      console.log('Socket 1 Error:', err.message);
    });

    // Send valid message
    socket1.emit('send_message', { roomId: 'general', content: 'Hello World!' });

    // Send empty message
    socket1.emit('send_message', { roomId: 'general', content: '' });

  } catch (error: any) {
    console.error('Test failed:', error?.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
