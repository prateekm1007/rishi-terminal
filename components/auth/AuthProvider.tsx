'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useSupabaseAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/**
 * Client auth context backed by Supabase Auth (remediation T5).
 *
 * Replaces the next-auth SessionProvider. NOTE: the tier exposed here is
 * display-only — the server always re-reads the tier from public.users via
 * lib/auth/session.ts, so a tampered client value grants nothing.
 *
 * U3 (founder round 7): the browser client (@supabase/supabase-js, ~66 kB
 * gzip) was statically imported here — inside the ROOT layout — so it rode
 * the first-load script set of EVERY route. This provider is the only
 * client surface that needs it on non-auth pages, and it needs it only
 * AFTER hydration (session starts null + loading=true either way), so the
 * client is dynamic-imported inside the effect. The chunk loads async after
 * first paint; auth pages (sign-in/callback) keep the eager static import.
 * Pinned by test/bundleBoundary.test.ts.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelled) return;
      const supabase = createClient();

      supabase.auth.getSession().then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setLoading(false);
        },
      );
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    signOut: async () => {
      const { createClient } = await import('@/lib/supabase/client');
      await createClient().auth.signOut();
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
