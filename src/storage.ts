import type {
  CareProfile,
  DemoUser,
  FamilyMember,
  Medication,
  OcrScan,
  TemporaryMedication,
  ThemeMode,
} from "./types";

export const storageKeys = {
  theme: "optime.theme",
  demoUser: "optime.demoUser",
  currentProfile: "optime.currentProfile",
  medications: "optime.medications",
  temporaryMedications: "optime.temporaryMedications",
  scans: "optime.ocrScans",
  familyMembers: "optime.familyMembers",
  careProfiles: "optime.careProfiles",
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

export function loadJson<T>(key: string, fallback: T): T {
  const stored = window.localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadMedications(fallback: Medication[]): Medication[] {
  return loadJson(storageKeys.medications, fallback);
}

export function saveMedications(medications: Medication[]): void {
  saveJson(storageKeys.medications, medications);
}

export function loadTemporaryMedications(fallback: TemporaryMedication[]): TemporaryMedication[] {
  return loadJson(storageKeys.temporaryMedications, fallback);
}

export function saveTemporaryMedications(medications: TemporaryMedication[]): void {
  saveJson(storageKeys.temporaryMedications, medications);
}

export function loadScans(fallback: OcrScan[]): OcrScan[] {
  return loadJson(storageKeys.scans, fallback);
}

export function saveScans(scans: OcrScan[]): void {
  saveJson(storageKeys.scans, scans);
}

export function loadFamilyMembers(fallback: FamilyMember[]): FamilyMember[] {
  return loadJson(storageKeys.familyMembers, fallback);
}

export function saveFamilyMembers(members: FamilyMember[]): void {
  saveJson(storageKeys.familyMembers, members);
}

export function loadCareProfiles(fallback: CareProfile[]): CareProfile[] {
  return loadJson(storageKeys.careProfiles, fallback);
}

export function saveCareProfiles(profiles: CareProfile[]): void {
  saveJson(storageKeys.careProfiles, profiles);
}
