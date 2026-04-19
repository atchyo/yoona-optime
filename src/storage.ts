import type { DemoUser, ThemeMode } from "./types";

export const storageKeys = {
  theme: "optime.theme",
  demoUser: "optime.demoUser",
  currentProfile: "optime.currentProfile",
} as const;

export function loadTheme(): ThemeMode {
  const stored = window.localStorage.getItem(storageKeys.theme);
  return stored === "dark" ? "dark" : "light";
}

export function saveTheme(theme: ThemeMode): void {
  window.localStorage.setItem(storageKeys.theme, theme);
}

export function loadUser(): DemoUser | null {
  const stored = window.localStorage.getItem(storageKeys.demoUser);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as DemoUser;
  } catch {
    window.localStorage.removeItem(storageKeys.demoUser);
    return null;
  }
}

export function saveUser(user: DemoUser): void {
  window.localStorage.setItem(storageKeys.demoUser, JSON.stringify(user));
}

export function clearUser(): void {
  window.localStorage.removeItem(storageKeys.demoUser);
}

export function loadCurrentProfileId(defaultId: string): string {
  return window.localStorage.getItem(storageKeys.currentProfile) || defaultId;
}

export function saveCurrentProfileId(profileId: string): void {
  window.localStorage.setItem(storageKeys.currentProfile, profileId);
}
