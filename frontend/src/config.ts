// Runtime dynamic configuration for API, Socket.IO, and OAuth
export const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5005';
    }
  }
  return 'https://nova-backend-pn3b.onrender.com';
};

export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
    }
  }
  return 'https://nova-backend-pn3b.onrender.com/api';
};

export const BACKEND_URL = getBackendUrl();
export const API_URL = getApiUrl();

export const GOOGLE_CLIENT_ID = 
  import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  '659476383070-amhjfgashdci2tiskqutt67nb0cdd7vt.apps.googleusercontent.com';
