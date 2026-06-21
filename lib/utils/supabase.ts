import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../api/config";

// Setup browser-side Supabase client for Realtime subscription channels.
// If variables are missing, a warning is logged, and dummy strings are used
// to prevent compilation/runtime crashes.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("⚠️ Supabase URL or Anon Key is missing from environment variables.");
}

export const supabaseClient = createClient(
  SUPABASE_URL || "https://placeholder-supabase-url.supabase.co",
  SUPABASE_ANON_KEY || "placeholder-anon-key"
);
