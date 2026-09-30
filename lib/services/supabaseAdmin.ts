// SUPABASE_ADMIN_V1
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global { var __rishiAdminSupabase: SupabaseClient | undefined; }

export function getAdminSupabase(): SupabaseClient {
  if (globalThis.__rishiAdminSupabase) return globalThis.__rishiAdminSupabase;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase URL or service-role key environment variables");
  }

  globalThis.__rishiAdminSupabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return globalThis.__rishiAdminSupabase;
}