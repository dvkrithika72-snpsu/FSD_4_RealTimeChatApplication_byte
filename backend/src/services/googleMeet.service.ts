import { google } from 'googleapis';
import { User } from '../models/User';

const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const isGoogleConfigured = (): boolean => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return Boolean(
    clientId &&
    clientSecret &&
    !clientId.includes('your_google_client_id') &&
    !clientSecret.includes('your_google_client_secret')
  );
};

export const getGoogleAuthUrl = (userId: string): string | null => {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state: userId,
  });
};

export const handleGoogleOAuthCallback = async (code: string, userId: string) => {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google OAuth credentials not configured on server');
  }

  const { tokens } = await oauth2Client.getToken(code);
  
  await User.findByIdAndUpdate(userId, {
    $set: {
      googleCalendarTokens: {
        access_token: tokens.access_token || undefined,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
      },
    },
  });

  return tokens;
};

export const createGoogleMeetConference = async (
  userId: string,
  details: {
    title: string;
    description?: string;
    startTime: Date;
    endTime?: Date;
  }
): Promise<{ googleMeetUrl: string; googleEventId: string }> => {
  const user = await User.findById(userId);
  if (!user || !user.googleCalendarTokens?.access_token) {
    throw new Error('Google account not connected or authorization expired');
  }

  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) {
    throw new Error('Google OAuth credentials not configured on server');
  }

  oauth2Client.setCredentials({
    access_token: user.googleCalendarTokens.access_token,
    refresh_token: user.googleCalendarTokens.refresh_token,
    expiry_date: user.googleCalendarTokens.expiry_date,
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const startIso = details.startTime.toISOString();
  const endIso = details.endTime
    ? details.endTime.toISOString()
    : new Date(details.startTime.getTime() + 60 * 60 * 1000).toISOString();

  const requestId = `nova-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: details.title,
      description: details.description || `NOVA Chat Meeting - scheduled by @${user.username}`,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    },
  });

  const event = response.data;
  const hangoutLink = event.hangoutLink;

  if (!hangoutLink) {
    throw new Error('Google Calendar event created, but Google Meet link was not returned by Google');
  }

  return {
    googleMeetUrl: hangoutLink,
    googleEventId: event.id || '',
  };
};

export const isValidGoogleMeetUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  // Validates standard Google Meet URLs: https://meet.google.com/abc-defg-hij
  const meetRegex = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?.*)?$/i;
  return meetRegex.test(trimmed);
};
