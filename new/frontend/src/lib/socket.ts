import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

let socket: Socket | null = null;

export function connectSocket(): Socket | null {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('medgrid_token');

  // Don't connect if no token is available
  if (!token) {
    console.warn('[Socket] No token found, skipping connection');
    return null;
  }

  console.log('[Socket] Connecting with token:', token.substring(0, 20) + '...');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err: Error) => {
    console.error('[Socket] Connection error:', err.message);
    // If auth fails, clear the socket so it doesn't retry automatically
    if (err.message.includes('token') || err.message.includes('auth')) {
      disconnectSocket();
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

/** Subscribe to a socket event. Returns an unsubscribe function. */
export function onSocketEvent<T = unknown>(
  event: string,
  callback: (data: T) => void
): () => void {
  const s = socket ?? connectSocket();
  if (!s) {
    // No socket available, return a no-op unsubscribe
    return () => {};
  }
  s.on(event, callback);
  return () => s.off(event, callback);
}
