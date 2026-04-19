export const appConfig = {
  basePath: "/yoona-app",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

export const isSupabaseConfigured = Boolean(
  appConfig.supabaseUrl && appConfig.supabaseAnonKey,
);
