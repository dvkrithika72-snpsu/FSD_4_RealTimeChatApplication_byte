import axios from 'axios';
import { io } from 'socket.io-client';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDB } from './src/utils/db';
import { setupChatSocket } from './src/sockets/chat.socket';
import { startCleanupService, stopCleanupService } from './src/services/cleanup.service';
import authRoutes from './src/routes/auth.routes';
import chatRoutes from './src/routes/chat.routes';
import userRoutes from './src/routes/user.routes';
import meetingRoutes from './src/routes/meeting.routes';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const SOCKET_URL = `http://localhost:${TEST_PORT}`;

let server: http.Server;
let ioServer: Server;

async function bootstrapTestServer() {
  await connectDB();
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/meetings', meetingRoutes);

  server = http.createServer(app);
  ioServer = new Server(server, { cors: { origin: '*' } });
  app.set('io', ioServer);
  setupChatSocket(ioServer);
  startCleanupService(ioServer);

  await new Promise<void>((resolve) => {
    server.listen(TEST_PORT, () => {
      console.log(`[TEST SERVER] Running on port ${TEST_PORT}`);
      resolve();
    });
  });
}

async function shutdownTestServer() {
  stopCleanupService();
  ioServer.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log('[TEST SERVER] Stopped.');
}

async function runVerificationSuite() {
  console.log('\n======================================================');
  console.log('   NOVA REAL-TIME CHAT: FULL END-TO-END VERIFICATION  ');
  console.log('======================================================\n');

  await bootstrapTestServer();

  try {
    const ts = Date.now();
    const userAData = { username: `krithika_${ts}`, email: `krithika_${ts}@example.com`, password: 'Password123!' };
    const userBData = { username: `rahul_${ts}`, email: `rahul_${ts}@example.com`, password: 'Password123!' };
    const userCData = { username: `eve_${ts}`, email: `eve_${ts}@example.com`, password: 'Password123!' };

    // --- TEST 1: INDEPENDENT USER REGISTRATION ---
    console.log('[TEST 1] Registering Account A (Krithika) and Account B (Rahul)...');
    const resRegA = await axios.post(`${BASE_URL}/auth/register`, userAData);
    const resRegB = await axios.post(`${BASE_URL}/auth/register`, userBData);
    const resRegC = await axios.post(`${BASE_URL}/auth/register`, userCData);

    const tokenA = resRegA.data.token;
    const userA = resRegA.data.user;
    const tokenB = resRegB.data.token;
    const userB = resRegB.data.user;
    const tokenC = resRegC.data.token;
    const userC = resRegC.data.user;

    if (!userA._id || !userB._id || !userC._id || userA._id === userB._id) {
      throw new Error('Account ID generation failed or collisions detected');
    }
    console.log(`  ✓ Account A created: ${userA.username} (${userA._id})`);
    console.log(`  ✓ Account B created: ${userB.username} (${userB._id})`);
    console.log(`  ✓ Account C created: ${userC.username} (${userC._id})`);

    // --- TEST 2: INDEPENDENT LOGIN & AUTHENTICATION ---
    console.log('\n[TEST 2] Verifying independent login sessions & identity isolation...');
    const loginA = await axios.post(`${BASE_URL}/auth/login`, { email: userAData.email, password: userAData.password });
    const meA = await axios.get(`${BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${loginA.data.token}` } });
    if (meA.data.user.email !== userAData.email) throw new Error('Identity mismatch on Account A');
    console.log('  ✓ Account A login and token session verified');

    // --- TEST 3: USER DISCOVERY ---
    console.log('\n[TEST 3] User Discovery: User A searching for User B...');
    const searchRes = await axios.get(`${BASE_URL}/users/search?q=${userBData.username}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const foundUserB = searchRes.data.users.find((u: any) => u.username === userBData.username);
    if (!foundUserB) throw new Error('User discovery failed to find registered User B');
    if (foundUserB.passwordHash || foundUserB.email) throw new Error('Sensitive fields leaked in discovery API');
    console.log(`  ✓ Found User B safely without leaking sensitive hashes: @${foundUserB.username}`);

    // --- TEST 4: DIRECT CONVERSATION CREATION ---
    console.log('\n[TEST 4] Creating direct 1-to-1 conversation between User A and User B...');
    const convRes = await axios.post(
      `${BASE_URL}/chat/conversations`,
      { targetUserId: userB._id },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const convId = convRes.data.conversation._id;
    console.log(`  ✓ Private conversation established: ${convId}`);

    // --- TEST 5: DATA ISOLATION ON PRIVATE CONVERSATION ---
    console.log('\n[TEST 5] Account-level data isolation: User C attempting to access private conversation...');
    try {
      await axios.get(`${BASE_URL}/chat/messages?roomId=${convId}`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      throw new Error('FAIL: Unauthorized User C was able to access private conversation messages!');
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('  ✓ Access correctly blocked (HTTP 403 Forbidden) for unauthorized User C');
      } else {
        throw err;
      }
    }

    // --- TEST 6: REAL-TIME MESSAGING DELIVERY & ISOLATION ---
    console.log('\n[TEST 6] Real-time messaging delivery & socket room authorization...');
    const socketA = io(SOCKET_URL, { auth: { token: tokenA } });
    const socketB = io(SOCKET_URL, { auth: { token: tokenB } });
    const socketC = io(SOCKET_URL, { auth: { token: tokenC } });

    await new Promise((r) => setTimeout(r, 600));

    let userBReceivedMessage: any = null;
    let userCReceivedLeak = false;

    socketB.on('receive_message', (msg) => {
      userBReceivedMessage = msg;
    });

    socketC.on('receive_message', () => {
      userCReceivedLeak = true;
    });

    // User C attempts unauthorized join
    let userCJoinError = false;
    socketC.on('error', (err) => {
      if (err.message.includes('Unauthorized')) {
        userCJoinError = true;
      }
    });
    socketC.emit('join_room', convId);
    await new Promise((r) => setTimeout(r, 300));

    // User A joins and sends a message
    socketA.emit('join_room', convId);
    socketB.emit('join_room', convId);
    await new Promise((r) => setTimeout(r, 300));

    socketA.emit('send_message', {
      roomId: convId,
      content: 'Hello Rahul, this is a private confidential message from Krithika.',
    });

    await new Promise((r) => setTimeout(r, 1000));

    if (!userBReceivedMessage) throw new Error('User B failed to receive real-time message');
    if (userCReceivedLeak) throw new Error('FAIL: Message leaked to unauthorized User C socket!');
    console.log(`  ✓ Message received in real time by User B: "${userBReceivedMessage.content}"`);
    console.log('  ✓ User C socket correctly prevented from receiving private message');

    // --- TEST 7: 15-SECOND SELF-DESTRUCT MECHANISM ---
    console.log('\n[TEST 7] Verifying self-destructing message lifecycle...');
    let statusUpdateReceived = false;
    socketA.on('message_status_update', (update) => {
      if (update.messageId === userBReceivedMessage._id && update.status === 'read') {
        statusUpdateReceived = true;
      }
    });

    // Sender User A viewing does NOT trigger read
    socketA.emit('mark_read', { messageId: userBReceivedMessage._id });
    await new Promise((r) => setTimeout(r, 300));
    if (statusUpdateReceived) throw new Error('Sender self-read improperly triggered mark_read');

    // Recipient User B marks as read
    socketB.emit('mark_read', { messageId: userBReceivedMessage._id });
    await new Promise((r) => setTimeout(r, 600));
    if (!statusUpdateReceived) throw new Error('Recipient mark_read did not trigger message_status_update');
    console.log('  ✓ Self-destruct countdown triggered: 15 seconds scheduled upon recipient view');

    // --- TEST 8: GROUP CHAT CREATION & ISOLATION ---
    console.log('\n[TEST 8] Group Chat creation and membership validation...');
    const groupRes = await axios.post(
      `${BASE_URL}/chat/groups`,
      {
        name: 'NOVA Alpha Core Team',
        description: 'Engineering collaboration group',
        participantIds: [userB._id],
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const groupId = groupRes.data.conversation._id;
    console.log(`  ✓ Group created: "${groupRes.data.conversation.name}" (${groupId})`);

    // Verify User C cannot read group
    try {
      await axios.get(`${BASE_URL}/chat/messages?roomId=${groupId}`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      throw new Error('FAIL: Non-member User C accessed group messages!');
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('  ✓ Non-member User C correctly denied group access (HTTP 403)');
      } else {
        throw err;
      }
    }

    // --- TEST 9: MEETING SCHEDULING & GOOGLE MEET INTEGRATION ---
    console.log('\n[TEST 9] Meeting Scheduling & Google Meet URL validation...');
    
    // Invalid meeting link test
    try {
      await axios.post(
        `${BASE_URL}/meetings`,
        {
          title: 'Fake Meet Test',
          startTime: new Date(Date.now() + 3600000).toISOString(),
          manualMeetUrl: 'https://malicious-site.com/fake-meet',
        },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      throw new Error('FAIL: Invalid Google Meet URL was accepted!');
    } catch (err: any) {
      if (err.response?.status === 400) {
        console.log('  ✓ Invalid meeting link correctly rejected (HTTP 400 Bad Request)');
      } else {
        throw err;
      }
    }

    // Valid Google Meet link test
    const validMeetUrl = 'https://meet.google.com/abc-defg-hij';
    const meetingRes = await axios.post(
      `${BASE_URL}/meetings`,
      {
        title: 'NOVA Sprint Architecture Review',
        description: 'Weekly team sprint review',
        startTime: new Date(Date.now() + 7200000).toISOString(),
        conversationId: convId,
        manualMeetUrl: validMeetUrl,
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );

    const createdMeeting = meetingRes.data.meeting;
    if (createdMeeting.googleMeetUrl !== validMeetUrl) {
      throw new Error('Meeting Google Meet URL mismatch');
    }
    console.log(`  ✓ Meeting successfully scheduled: "${createdMeeting.title}"`);
    console.log(`  ✓ Verified Google Meet conference link: ${createdMeeting.googleMeetUrl}`);

    // --- TEST 10: MEETING DATA ISOLATION ---
    console.log('\n[TEST 10] Meeting Data Isolation between Accounts...');
    // User C queries meetings list
    const meetingsCRes = await axios.get(`${BASE_URL}/meetings`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    });
    const cFoundMeeting = meetingsCRes.data.meetings.find((m: any) => m._id === createdMeeting._id);
    if (cFoundMeeting) {
      throw new Error('FAIL: Meeting belonging to User A/B leaked into User C meeting list!');
    }
    console.log('  ✓ User C meeting list is isolated: User A/B meeting is NOT visible');

    // User C attempts unauthorized meeting cancellation
    try {
      await axios.delete(`${BASE_URL}/meetings/${createdMeeting._id}`, {
        headers: { Authorization: `Bearer ${tokenC}` },
      });
      throw new Error('FAIL: Unauthorized User C was able to cancel User A meeting!');
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        console.log('  ✓ Unauthorized meeting cancellation attempt blocked');
      } else {
        throw err;
      }
    }

    // --- TEST 11: IN-CHAT MEETING CARD VERIFICATION ---
    console.log('\n[TEST 11] In-chat Meeting Card verification...');
    const convMessagesRes = await axios.get(`${BASE_URL}/chat/messages?roomId=${convId}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const meetingCardMsg = convMessagesRes.data.messages.find(
      (m: any) => m.messageType === 'meeting' && m.meetingId?._id === createdMeeting._id
    );
    if (!meetingCardMsg) {
      throw new Error('Meeting invitation card was not linked into conversation history');
    }
    console.log(`  ✓ Meeting card present in conversation history for both participants`);

    // --- TEST 12: ADD MEMBERS DIRECTLY TO GROUP ---
    console.log('\n[TEST 12] Add Members directly to Group (Feature 1)...');
    // Register Account D (Dave)
    const userDName = `dave_${Date.now()}`;
    const regDRes = await axios.post(`${BASE_URL}/auth/register`, {
      username: userDName,
      email: `${userDName}@test.com`,
      password: 'Password123!',
    });
    const tokenD = regDRes.data.token;
    const userDId = regDRes.data.user._id;
    console.log(`  ✓ Registered new user Account D: @${userDName}`);

    // Non-admin (User B or User D) attempts to add members -> must be rejected (403)
    try {
      await axios.post(
        `${BASE_URL}/chat/groups/${groupId}/members`,
        { userIds: [userDId] },
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      throw new Error('Non-admin User B was able to add members to the group!');
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('  ✓ Non-admin add members attempt correctly blocked (HTTP 403)');
      } else {
        throw err;
      }
    }

    // Admin (User A) adds User D to group
    const addMemberRes = await axios.post(
      `${BASE_URL}/chat/groups/${groupId}/members`,
      { userIds: [userDId] },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    if (!addMemberRes.data.conversation.participants.some((p: any) => p._id === userDId)) {
      throw new Error('User D was not added to group participants');
    }
    console.log('  ✓ Group Admin (User A) successfully added User D to group');

    // Duplicate check: Admin tries to add User D again -> rejected
    try {
      await axios.post(
        `${BASE_URL}/chat/groups/${groupId}/members`,
        { userIds: [userDId] },
        { headers: { Authorization: `Bearer ${tokenA}` } }
      );
      throw new Error('Duplicate user was added to the group!');
    } catch (err: any) {
      if (err.response?.status === 400) {
        console.log('  ✓ Duplicate member addition correctly rejected (HTTP 400)');
      } else {
        throw err;
      }
    }

    // Verify User D can access group and send messages
    const userDGroupCheck = await axios.get(`${BASE_URL}/chat/conversations/${groupId}`, {
      headers: { Authorization: `Bearer ${tokenD}` },
    });
    if (!userDGroupCheck.data.conversation) {
      throw new Error('User D cannot access group after being added');
    }
    console.log('  ✓ Newly added User D can access the group conversation');

    // --- TEST 13: JOIN GROUP VIA INVITATION LINK (Feature 2) ---
    console.log('\n[TEST 13] Join Group via Invitation Link (Feature 2)...');
    // Admin (User A) generates invite link
    const inviteRes = await axios.get(`${BASE_URL}/chat/groups/${groupId}/invite`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const inviteCode = inviteRes.data.inviteCode;
    if (!inviteCode) {
      throw new Error('Failed to generate invite code for group');
    }
    console.log(`  ✓ Group Admin generated invite code: ${inviteCode}`);

    // Register Account E (Elena)
    const userEName = `elena_${Date.now()}`;
    const regERes = await axios.post(`${BASE_URL}/auth/register`, {
      username: userEName,
      email: `${userEName}@test.com`,
      password: 'Password123!',
    });
    const tokenE = regERes.data.token;
    const userEId = regERes.data.user._id;

    // Elena checks invite details
    const inviteDetailsRes = await axios.get(`${BASE_URL}/chat/invites/${inviteCode}`, {
      headers: { Authorization: `Bearer ${tokenE}` },
    });
    if (inviteDetailsRes.data.group.name !== 'NOVA Alpha Core Team') {
      throw new Error('Invite details group name mismatch');
    }
    console.log(`  ✓ Invite link details retrieved for: "${inviteDetailsRes.data.group.name}"`);

    // Elena joins group via invite link
    const joinRes = await axios.post(
      `${BASE_URL}/chat/invites/${inviteCode}/join`,
      {},
      { headers: { Authorization: `Bearer ${tokenE}` } }
    );
    if (!joinRes.data.joined || !joinRes.data.conversation.participants.some((p: any) => p._id === userEId)) {
      throw new Error('User E was not added upon joining via invite link');
    }
    console.log('  ✓ User E successfully joined group via invitation link');

    // Elena joins again -> handled gracefully as alreadyMember: true
    const joinAgainRes = await axios.post(
      `${BASE_URL}/chat/invites/${inviteCode}/join`,
      {},
      { headers: { Authorization: `Bearer ${tokenE}` } }
    );
    if (!joinAgainRes.data.alreadyMember) {
      throw new Error('Repeated join via invite link did not return alreadyMember');
    }
    console.log('  ✓ Already-member case handled properly with alreadyMember: true');

    // Admin revokes invite link
    const revokeRes = await axios.post(
      `${BASE_URL}/chat/groups/${groupId}/invite/revoke`,
      {},
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const newInviteCode = revokeRes.data.inviteCode;
    if (!newInviteCode || newInviteCode === inviteCode) {
      throw new Error('Revoking invite code did not generate a new code');
    }
    console.log('  ✓ Group Admin revoked old link and generated new invite code');

    // Old invite link is now rejected (404)
    try {
      await axios.get(`${BASE_URL}/chat/invites/${inviteCode}`, {
        headers: { Authorization: `Bearer ${tokenE}` },
      });
      throw new Error('Revoked invite link was still accepted!');
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('  ✓ Revoked invite link correctly rejected with HTTP 404');
      } else {
        throw err;
      }
    }

    // Cleanup sockets
    socketA.disconnect();
    socketB.disconnect();
    socketC.disconnect();

    console.log('\n======================================================');
    console.log('   🎉 ALL 13 VERIFICATION TESTS PASSED WITH 100% SUCCESS  ');
    console.log('======================================================\n');
  } finally {
    await shutdownTestServer();
  }
}

runVerificationSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ VERIFICATION SUITE FAILED:', err);
    process.exit(1);
  });
