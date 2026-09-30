import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (anon key, cookie-based sessions).
 * Use in 'use client' components for auth state and RLS-protected reads.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
