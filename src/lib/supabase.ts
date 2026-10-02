import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local"
  );
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");

export const isSupabaseConfigured = Boolean(url && anonKey);
