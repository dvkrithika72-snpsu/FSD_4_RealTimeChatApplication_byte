// Configuration for API endpoints, Socket.IO, and OAuth
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
);

export const BACKEND_URL: string = 
  import.meta.env.VITE_SOCKET_URL || 
  (isLocalhost ? 'http://localhost:5005' : 'https://nova-backend-pn3b.onrender.com');

export const API_URL: string = 
  import.meta.env.VITE_API_URL || 
  `${BACKEND_URL}/api`;

export const GOOGLE_CLIENT_ID: string = 
  import.meta.env.VITE_GOOGLE_CLIENT_ID || 
  '659476383070-amhjfgashdci2tiskqutt67nb0cdd7vt.apps.googleusercontent.com';
