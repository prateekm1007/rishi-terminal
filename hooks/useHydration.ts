'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

function subscribeNoop(): () => void {
  return () => {};
}

/**
 * True once the component has hydrated on the client.
 *
 * During hydration React renders with the SERVER snapshot, then re-renders
 * with the client snapshot — the documented useSyncExternalStore behaviour
 * for hydration-sensitive values. Replaces the legacy
 * `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`
 * flag, which the react-hooks v6 rules reject.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * Run a one-time initialization callback after hydration.
 *
 * This is the shared, documented home for the "read localStorage / URL on
 * mount" pattern (React docs: syncing with external stores on mount).
 * The callback runs exactly once, after the first client commit — lazy
 * `useState` initializers cannot be used for these reads because the
 * server render must match the first client render (hydration), and the
 * server has no localStorage/window.
 *
 * The single set-state-in-effect disable for the whole codebase lives
 * here, with this justification. Callers must not add more.
 */
export function useOnHydrate(init: () => void): void {
  const ref = useRef(init);
  // Keep the latest callback without re-running the effect (ref updates
  // belong in an effect, never during render).
  useEffect(() => {
    ref.current = init;
  });
  useEffect(() => {
    // One-time post-hydration initialization from localStorage/URL (see
    // hook docs). Lazy useState initializers cannot be used for these
    // reads — the server render must match the first client render.
    ref.current();
  }, []);
}
