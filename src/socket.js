import { io } from 'socket.io-client';

// Use the same origin as the page (para same domain at port)
const SOCKET_URL = window.location.origin; // 'https://creamyxo.onrender.com' sa production

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ['websocket', 'polling'],
  // Important for HTTPS
  secure: true,
  rejectUnauthorized: false
});

export default socket;