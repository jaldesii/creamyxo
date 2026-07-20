import { io } from 'socket.io-client';

// Use the same origin as the page
const SOCKET_URL = window.location.origin;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
  forceNew: true,
  upgrade: true,
  rememberUpgrade: true,
  withCredentials: true
});

export default socket;