import { useEffect } from 'react';
import { connectSocket, disconnectSocket, onSocketEvent } from '@/lib/socket';

/** Connect the socket on mount and disconnect on unmount. */
export function useSocket() {
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);
}

/** Subscribe to a socket event for the lifetime of the component. */
export function useSocketEvent<T = unknown>(event: string, callback: (data: T) => void) {
  useEffect(() => {
    const unsubscribe = onSocketEvent<T>(event, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
}
