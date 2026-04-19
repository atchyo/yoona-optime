import { createClient } from "@supabase/supabase-js";
import { appConfig, isSupabaseConfigured } from "../config";

export const supabase = isSupabaseConfigured
  ? createClient(appConfig.supabaseUrl!, appConfig.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export async function signInWithProvider(provider: "google" | "kakao"): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Use demo login or add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const redirectTo = `${window.location.origin}/yoona-app/`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  if (error) throw error;
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
