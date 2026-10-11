import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from '../config';

export const socket: Socket = io(getBackendUrl(), {
  autoConnect: false,
});
