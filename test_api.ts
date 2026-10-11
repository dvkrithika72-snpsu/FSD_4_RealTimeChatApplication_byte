import axios from 'axios';

const BASE_URL = 'http://localhost:5005/api';
const AUTH_URL = `${BASE_URL}/auth`;
const USER_URL = `${BASE_URL}/users`;

const uniqueSuffix = Date.now();
const testUser = {
  username: `nova_${uniqueSuffix}`,
  email: `nova_${uniqueSuffix}@example.com`,
  password: 'Password123!',
};

let token = '';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE VERIFICATION SUITE ---');

  try {
    // 1. Registration
    console.log('\n[Test 1] Registration with Email');
    const regRes = await axios.post(`${AUTH_URL}/register`, testUser);
    console.log('✅ Registration successful:', regRes.data.user.email);
    token = regRes.data.token;

    // 2. Duplicate Registration
    console.log('\n[Test 2] Duplicate Registration Prevention');
    try {
      await axios.post(`${AUTH_URL}/register`, testUser);
      console.error('❌ Failed: duplicate should be rejected');
    } catch (err: any) {
      console.log('✅ Duplicate correctly rejected:', err.response?.status, err.response?.data?.error);
    }

    // 3. Login with Email
    console.log('\n[Test 3] Login with Email');
    const loginEmailRes = await axios.post(`${AUTH_URL}/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    console.log('✅ Email login successful:', loginEmailRes.data.user.email);

    // 4. Login with Username
    console.log('\n[Test 4] Login with Username');
    const loginUserRes = await axios.post(`${AUTH_URL}/login`, {
      username: testUser.username,
      password: testUser.password,
    });
    console.log('✅ Username login successful:', loginUserRes.data.user.username);

    // 5. Invalid Password
    console.log('\n[Test 5] Invalid Password Rejection');
    try {
      await axios.post(`${AUTH_URL}/login`, {
        email: testUser.email,
        password: 'wrong_password',
      });
      console.error('❌ Failed: invalid password should be rejected');
    } catch (err: any) {
      console.log('✅ Invalid password correctly rejected:', err.response?.status);
    }

    // 6. GET /api/auth/me
    console.log('\n[Test 6] GET /auth/me');
    const meRes = await axios.get(`${AUTH_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ /auth/me verified:', meRes.data.user.username, 'profileSetupComplete:', meRes.data.user.profileSetupComplete);

    // 7. GET /api/users/profile
    console.log('\n[Test 7] GET /users/profile');
    const profileRes = await axios.get(`${USER_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ /users/profile verified:', profileRes.data.user.username);

    // 8. PUT /api/users/profile
    console.log('\n[Test 8] PUT /users/profile update');
    const updateRes = await axios.put(
      `${USER_URL}/profile`,
      {
        name: 'Nova Updated Name',
        status: 'Exploring NOVA',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Profile updated:', updateRes.data.user.name, 'profileSetupComplete:', updateRes.data.user.profileSetupComplete);

    // 9. Forgot Password request
    console.log('\n[Test 9] POST /auth/forgot-password');
    const forgotRes = await axios.post(`${AUTH_URL}/forgot-password`, {
      email: testUser.email,
    });
    console.log('✅ Forgot password request received:', forgotRes.data.message);

    // 10. Schedule Meeting
    console.log('\n[Test 10] POST /api/meetings (Schedule Meeting)');
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const meetingRes = await axios.post(
      `${BASE_URL}/meetings`,
      {
        title: 'Project Sync & Kickoff',
        startTime: futureTime,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Meeting scheduled successfully:', meetingRes.data.meeting.title);

    // 11. Fetch Upcoming Meetings
    console.log('\n[Test 11] GET /api/meetings (Upcoming Meetings)');
    const getMeetingsRes = await axios.get(`${BASE_URL}/meetings`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Upcoming meetings retrieved:', getMeetingsRes.data.meetings.length);
    const found = getMeetingsRes.data.meetings.some((m: any) => m.title === 'Project Sync & Kickoff');
    if (!found) {
      throw new Error('Scheduled meeting was not found in upcoming meetings!');
    }
    console.log('✅ Scheduled meeting correctly appears in upcoming meetings list!');

    // 12. Cancel Meeting
    console.log('\n[Test 12] DELETE /api/meetings/:id (Cancel Meeting)');
    const delRes = await axios.delete(`${BASE_URL}/meetings/${meetingRes.data.meeting._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Meeting cancelled successfully:', delRes.data.message);

    console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

runTests();
