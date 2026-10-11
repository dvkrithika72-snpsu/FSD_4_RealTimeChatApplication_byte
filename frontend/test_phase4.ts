import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:5000/api';

async function runTest() {
  console.log('--- STARTING PHASE 4 TESTS ---');

  try {
    const user1 = { username: 'test_u1_' + Date.now(), password: 'pwd' };
    const user2 = { username: 'test_u2_' + Date.now(), password: 'pwd' };

    await axios.post(`${API_URL}/auth/register`, user1);
    const res1 = await axios.post(`${API_URL}/auth/login`, user1);
    const token1 = res1.data.token;

    await axios.post(`${API_URL}/auth/register`, user2);
    const res2 = await axios.post(`${API_URL}/auth/login`, user2);
    const token2 = res2.data.token;

    const socket1 = io('http://localhost:5000', { auth: { token: token1 } });
    const socket2 = io('http://localhost:5000', { auth: { token: token2 } });

    await new Promise(resolve => setTimeout(resolve, 500));

    let unreadMessageId = '';
    let readMessageId = '';

    socket2.on('receive_message', (msg) => {
      if (msg.content === 'Unread Message') {
        console.log('✅ User 2 received unread message');
        unreadMessageId = msg._id;
      } else if (msg.content === 'Read Message') {
        console.log('✅ User 2 received read message, marking as read...');
        readMessageId = msg._id;
        socket2.emit('mark_read', { messageId: msg._id });
      }
    });

    socket1.on('message_status_update', (update) => {
      console.log('✅ User 1 received read status update with scheduled deletion time:', update.scheduledDeletionAt);
    });

    let deletedMessageReceived = false;
    socket2.on('message_deleted', (data) => {
      if (data.messageId === readMessageId) {
        console.log('✅ User 2 received message_deleted for read message!');
        deletedMessageReceived = true;
      }
    });

    // Send the messages
    socket1.emit('send_message', { roomId: 'general', content: 'Unread Message' });
    setTimeout(() => {
      socket1.emit('send_message', { roomId: 'general', content: 'Read Message' });
    }, 500);

    console.log('⏳ Waiting 16 seconds for deletion to occur...');
    
    // We wait 18 seconds to give the 15-second timer + 2-second interval time to process
    let timeWaited = 0;
    const interval = setInterval(() => {
      timeWaited += 1;
      process.stdout.write(`\rWaited ${timeWaited}s / 18s`);
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, 18000));
    clearInterval(interval);
    console.log('\n');

    if (!deletedMessageReceived) {
      throw new Error('❌ Failed to receive message_deleted event for the read message');
    }

    // Now query the REST API to check the database
    const historyRes = await axios.get(`${API_URL}/chat/messages?roomId=general`, {
      headers: { Authorization: `Bearer ${token1}` }
    });
    
    const messages = historyRes.data.messages;
    const hasUnread = messages.find((m: any) => m._id === unreadMessageId);
    const hasRead = messages.find((m: any) => m._id === readMessageId);

    if (hasRead) {
      throw new Error('❌ Read message still exists in database!');
    } else {
      console.log('✅ Read message successfully deleted from MongoDB');
    }

    if (!hasUnread) {
      throw new Error('❌ Unread message was incorrectly deleted from database!');
    } else {
      console.log('✅ Unread message safely remains in MongoDB');
    }

    // Cleanup
    socket1.disconnect();
    socket2.disconnect();
    console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
    process.exit(0);

  } catch (error: any) {
    console.error('\nTest failed:', error?.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
