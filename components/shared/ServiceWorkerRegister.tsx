'use client';

import { useEffect } from 'react';

/**
 * X3-09 (Round 15 B7): registers the app-shell service worker
 * (public/sw.js). Production builds only — `next dev`'s on-demand
 * compilation and the SW's cache-first static handling do not mix, and
 * a dev-time registration would cache half-compiled chunks.
 *
 * Registration failure is deliberately silent to the user (an offline
 * enhancement that cannot install degrades to the normal network
 * experience); the Playwright acceptance covers the success path.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* enhancement only — network experience is the baseline */
    });
  }, []);
  return null;
}
