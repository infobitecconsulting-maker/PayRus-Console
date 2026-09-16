import { createClient } from "@supabase/supabase-js";

// Same identity backend as App/ (src/lib/supabase-client.ts) — PayRus SSO is
// meant to be one unified login across platforms, so the ops console
// authenticates against the same Supabase project rather than its own. The
// placeholder URL/key below only exist so createClient doesn't throw before
// real credentials are set — callers should check isSupabaseConfigured (or
// just let a real call fail) rather than assume `supabase` is reachable.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
