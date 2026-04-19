export type UserRole = "guest" | "user" | "admin";
export type ThemeMode = "light" | "dark";

export type FamilyRole = "owner" | "manager" | "member";
export type DrugSource =
  | "mfds_permit"
  | "mfds_easy"
  | "rxnorm"
  | "dailymed"
  | "openfda"
  | "manual";
export type MedicationStatus = "confirmed" | "temporary" | "needs_review";
export type ScanStatus =
  | "uploaded"
  | "ocr_done"
  | "matched"
  | "manual_needed"
  | "confirmed";
export type ReminderType = "daily" | "weekly" | "cycle" | "duration_review";
export type ProfileType = "self" | "parent" | "child" | "pet";
export type SafetyLevel = "적정" | "주의" | "고위험" | "검토필요";

export interface DemoUser {
  id: string;
  name: string;
  role: Exclude<UserRole, "guest">;
  familyRole: FamilyRole;
  email: string;
}

export interface FamilyWorkspace {
  id: string;
  name: string;
  ownerUserId: string;
}

export interface FamilyMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: FamilyRole;
  displayName: string;
  email: string;
}

export interface CareProfile {
  id: string;
  workspaceId: string;
  ownerUserId?: string;
  name: string;
  type: ProfileType;
  ageGroup: "20" | "40" | "60";
  notes?: string;
  petDetails?: PetCareDetails;
}

export interface PetCareDetails {
  birthDate?: string;
  age?: string;
  weightKg?: string;
  allergies?: string;
  mainFood?: string;
  forbiddenFoods?: string;
}

export interface DrugIngredient {
  name: string;
  amount?: string;
}

export interface DrugDatabaseMatch {
  id: string;
  source: DrugSource;
  productName: string;
  manufacturer?: string;
  ingredients: DrugIngredient[];
  dosageForm?: string;
  efficacy?: string;
  usage?: string;
  warnings: string[];
  interactions: string[];
  confidence: number;
}

export interface Medication {
  id: string;
  careProfileId: string;
  status: MedicationStatus;
  productName: string;
  nickname?: string;
  source: DrugSource;
  ingredients: DrugIngredient[];
  dosage?: string;
  instructions?: string;
  warnings: string[];
  interactions: string[];
  startedAt: string;
  reviewAt?: string;
}

export interface TemporaryMedication {
  id: string;
  careProfileId: string;
  rawName: string;
  rawText: string;
  note?: string;
  createdAt: string;
}

export interface MedicationPhoto {
  id: string;
  scanId: string;
  fileName: string;
  dataUrl?: string;
  storagePath?: string;
  sizeBytes: number;
  deletedAt?: string;
}

export interface OcrScan {
  id: string;
  workspaceId: string;
  careProfileId: string;
  status: ScanStatus;
  rawText: string;
  extractedNames: string[];
  confidence: number;
  photo?: MedicationPhoto;
  matches: DrugDatabaseMatch[];
  createdAt: string;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  type: ReminderType;
  label: string;
  timeOfDay: string;
  daysOfWeek?: string[];
  nextDueAt: string;
  reviewAt?: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduleId: string;
  takenAt: string;
  note?: string;
}

export interface InteractionRule {
  id: string;
  pair: [string, string];
  level: "주의" | "위험";
  message: string;
}

export interface SafetyFinding {
  id: string;
  level: SafetyLevel;
  title: string;
  message: string;
  medicationIds: string[];
}

export interface RuleChatResponse {
  answer: string;
  findings: SafetyFinding[];
  disclaimer: string;
}
