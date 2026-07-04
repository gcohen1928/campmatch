import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is optional. Without NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY the app
 * runs entirely on the bundled seed dataset and the camp portal operates in
 * demo mode (browser-local persistence). Once the env vars are set and
 * supabase/migrations/0001_init.sql is applied, auth, claims and camp-managed
 * listings go live with zero code changes.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (!client) client = createClient(url!, anonKey!);
  return client;
}
