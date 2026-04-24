import { createClient } from "@supabase/supabase-js";
import { appConfig, isSupabaseConfigured } from "../config";

export const supabase = isSupabaseConfigured
  ? createClient(appConfig.supabaseUrl!, appConfig.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signInWithProvider(provider: "google" | "kakao"): Promise<void> {
  if (!supabase) {
    throw new Error("로그인 설정이 준비되지 않았습니다. Supabase URL과 publishable key를 확인해 주세요.");
  }

  const redirectTo = `${window.location.origin}${appConfig.basePath || ""}/`;
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
