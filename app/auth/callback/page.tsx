'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/auth/safeRedirect';

/**
 * OAuth / magic-link exchange handler.
 *
 * Supabase redirects back here with the session in the URL fragment
 * (implicit/PKCE flow). exchangeCodeForSession persists it into cookies.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        // R7: land the user where they were heading — but only if the
        // value survives safeNextPath (same-origin relative path only).
        const next = safeNextPath(new URLSearchParams(window.location.search).get('next'));
        router.replace(next);
        router.refresh();
      })
      .catch(e => setError(String(e)));
  }, [router]);

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8',
    }}>
      {error ? (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#FCA5A5', marginBottom: 12 }}>Sign-in failed: {error}</p>
          <a href="/auth/signin" style={{ color: '#D4AF37' }}>← Back to sign in</a>
        </div>
      ) : (
        <p>Signing you in…</p>
      )}
    </main>
  );
}
