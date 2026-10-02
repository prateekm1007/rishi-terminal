'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface SessionState {
  email: string | null;
  userId: string | null;
  loading: boolean;
  /** True when the caller is signed in. */
  authenticated: boolean;
  refresh: () => Promise<void>;
}

/**
 * Client hook for the SERVER's view of the caller (GET /api/auth/me).
 *
 * Commit M3/M5 (free access): this is the session hook — authentication
 * state ONLY. The product has a single access state (free) for everyone,
 * so there is no tier to read and no client field could ever gate a
 * feature: the value originates from the server session, and a tampered
 * localStorage value grants nothing. Authorization for every surface is
 * decided server-side per request.
 */
export function useSession(): SessionState {
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) throw new Error('me failed');
      const data = await res.json();
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
    } catch {
      setEmail(null);
      setUserId(null);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  return { email, userId, loading, authenticated: !!userId, refresh };
}
