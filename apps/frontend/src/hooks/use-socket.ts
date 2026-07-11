import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken, BASE_URL } from '@/api/client';

export function useSocket(
  events: Record<string, (...args: unknown[]) => void>
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(newSocket);

    Object.entries(eventsRef.current).forEach(([event, handler]) => {
      newSocket.on(event, handler);
    });

    return () => {
      Object.entries(eventsRef.current).forEach(([event]) => {
        newSocket.off(event);
      });
      newSocket.disconnect();
      setSocket(null);
    };
  }, [eventKeys]);

  return socket;
}
