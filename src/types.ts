export type UserRole = "guest" | "user" | "admin";

export type ThemeMode = "light" | "dark";

export type ProfileType = "self" | "parent" | "pet";

export type SafetyLevel = "적정" | "주의" | "고위험";

export interface DemoUser {
  id: string;
  name: string;
  role: Exclude<UserRole, "guest">;
}

export interface Profile {
  id: string;
  name: string;
  type: ProfileType;
  ageGroup: "20" | "40" | "60";
  meds: string[];
}

export interface InteractionRule {
  id: string;
  pair: [string, string];
  level: "주의" | "위험";
  message: string;
}

export interface AnalysisResult {
  ingredients: string[];
  safetyLevel: SafetyLevel;
  findings: InteractionRule[];
  timeline: string[];
}
