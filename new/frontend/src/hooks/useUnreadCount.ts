import { useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from '@/services/notificationService';
import { onSocketEvent } from '@/lib/socket';

/** Polls unread count every 30s and updates live via socket events. */
export function useUnreadCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      setCount(data.unread_count);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);

    // Bump count on any incoming notification event
    const events = [
      'request:created',
      'request:acknowledged',
      'request:fulfilled',
      'request:canceled',
      'request:expired',
      'balance:low',
      'balance:topup',
    ];
    const unsubs = events.map((evt) =>
      onSocketEvent(evt, () => setCount((c) => c + 1))
    );

    return () => {
      clearInterval(interval);
      unsubs.forEach((fn) => fn());
    };
  }, [refresh]);

  const decrement = () => setCount((c) => Math.max(0, c - 1));
  const reset = () => setCount(0);

  return { count, refresh, decrement, reset };
}
