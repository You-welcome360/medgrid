import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken, BASE_URL } from '@/api/client';

export function useSocket(events: Record<string, (data: any) => void>) {
  const socketRef = useRef<Socket | null>(null);
  
  // Use a stringified list of keys to prevent infinite re-subscription loops
  const eventKeys = Object.keys(events).join(',');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let socketUrl = 'http://localhost:4000';
    try {
      socketUrl = new URL(BASE_URL).origin;
    } catch {
      // fallback
    }

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      Object.entries(events).forEach(([event]) => {
        socket.off(event);
      });
      socket.disconnect();
    };
  }, [eventKeys]); // re-run only when event names change

  return socketRef.current;
}
