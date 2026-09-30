'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WisdomTier } from '@/lib/premium';

export interface TierState {
  tier: WisdomTier;
  email: string | null;
  userId: string | null;
  tierExpiresAt: string | null;
  loading: boolean;
  /** True when the caller is signed in. */
  authenticated: boolean;
  refresh: () => Promise<void>;
}

/**
 * Client hook for the SERVER's view of the caller (GET /api/auth/me).
 *
 * This is the ONLY sanctioned way for UI components to learn the tier after
 * remediation T6. The value originates from public.users read on the server;
 * a tampered localStorage value grants nothing.
 */
export function useTier(): TierState {
  const [tier, setTier] = useState<WisdomTier>('seeker');
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tierExpiresAt, setTierExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!res.ok) throw new Error('me failed');
      const data = await res.json();
      setTier(data.tier ?? 'seeker');
      setEmail(data.user?.email ?? null);
      setUserId(data.user?.id ?? null);
      setTierExpiresAt(data.tierExpiresAt ?? null);
    } catch {
      setTier('seeker');
      setEmail(null);
      setUserId(null);
      setTierExpiresAt(null);
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

  return { tier, email, userId, tierExpiresAt, loading, authenticated: !!userId, refresh };
}
