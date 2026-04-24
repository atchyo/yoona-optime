import { supabase } from "./supabaseClient";
import type {
  CareProfile,
  DemoUser,
  DrugDatabaseMatch,
  FamilyMember,
  FamilyRole,
  FamilyWorkspace,
  Medication,
  MedicationPhoto,
  OcrScan,
  TemporaryMedication,
} from "../types";

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface WorkspaceRow {
  id: string;
  name: string;
  owner_user_id: string;
}

interface FamilyMemberRow {
  id: string;
  workspace_id: string;
  user_id: string | null;
  role: FamilyRole;
  display_name: string;
  email: string | null;
  accessible_profile_ids: string[] | null;
  care_profile_id: string | null;
}

interface CareProfileRow {
  id: string;
  workspace_id: string;
  owner_user_id: string | null;
  name: string;
  type: CareProfile["type"];
  age_group: CareProfile["ageGroup"];
  notes: string | null;
  pet_details: CareProfile["petDetails"] | null;
}

interface MedicationRow {
  id: string;
  workspace_id: string;
  care_profile_id: string;
  status: Medication["status"];
  product_name: string;
  nickname: string | null;
  source: Medication["source"];
  ingredients: Medication["ingredients"] | null;
  dosage: string | null;
  instructions: string | null;
  warnings: string[] | null;
  interactions: string[] | null;
  started_at: string;
  review_at: string | null;
}

interface TemporaryMedicationRow {
  id: string;
  workspace_id: string;
  care_profile_id: string;
  raw_name: string;
  raw_text: string;
  note: string | null;
  created_at: string;
}

interface OcrScanRow {
  id: string;
  workspace_id: string;
  care_profile_id: string;
  status: OcrScan["status"];
  raw_text: string;
  extracted_names: string[] | null;
  confidence: number | string | null;
  created_at: string;
}

interface MedicationPhotoRow {
  id: string;
  scan_id: string;
  file_name: string;
  storage_path: string;
  size_bytes: number;
  deleted_at: string | null;
}

interface DrugMatchRow {
  id: string;
  scan_id: string;
  source: DrugDatabaseMatch["source"];
  product_name: string;
  manufacturer: string | null;
  ingredients: DrugDatabaseMatch["ingredients"] | null;
  dosage_form: string | null;
  efficacy: string | null;
  usage: string | null;
  warnings: string[] | null;
  interactions: string[] | null;
  confidence: number | string | null;
}

export interface RemoteAppData {
  workspace: FamilyWorkspace;
  familyMembers: FamilyMember[];
  careProfiles: CareProfile[];
  medications: Medication[];
  temporaryMedications: TemporaryMedication[];
  scans: OcrScan[];
  resolvedUser: DemoUser;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase가 설정되지 않았습니다.");
  }

  return supabase;
}

async function requireAuthenticatedUser(): Promise<{ id: string; email: string }> {
  const client = requireSupabase();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  }

  return {
    id: user.id,
    email: user.email || "",
  };
}

function mapWorkspace(row: WorkspaceRow): FamilyWorkspace {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
  };
}

function mapFamilyMember(row: FamilyMemberRow): FamilyMember {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id || "",
    role: row.role,
    displayName: row.display_name,
    email: row.email || "",
    accessibleProfileIds: row.accessible_profile_ids || [],
    careProfileId: row.care_profile_id || undefined,
  };
}

function mapCareProfile(row: CareProfileRow): CareProfile {
  const petDetails =
    row.type === "pet" && row.pet_details && typeof row.pet_details === "object"
      ? row.pet_details
      : undefined;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    ownerUserId: row.owner_user_id || undefined,
    name: row.name,
    type: row.type,
    ageGroup: row.age_group,
    notes: row.notes || undefined,
    petDetails,
  };
}

function mapMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    careProfileId: row.care_profile_id,
    status: row.status,
    productName: row.product_name,
    nickname: row.nickname || undefined,
    source: row.source,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    dosage: row.dosage || undefined,
    instructions: row.instructions || undefined,
    warnings: row.warnings || [],
    interactions: row.interactions || [],
    startedAt: row.started_at,
    reviewAt: row.review_at || undefined,
  };
}

function mapTemporaryMedication(row: TemporaryMedicationRow): TemporaryMedication {
  return {
    id: row.id,
    careProfileId: row.care_profile_id,
    rawName: row.raw_name,
    rawText: row.raw_text,
    note: row.note || undefined,
    createdAt: row.created_at,
  };
}

function mapPhoto(row: MedicationPhotoRow): MedicationPhoto {
  return {
    id: row.id,
    scanId: row.scan_id,
    fileName: row.file_name,
    dataUrl: row.storage_path.startsWith("data:") ? row.storage_path : undefined,
    storagePath: row.storage_path.startsWith("data:") ? undefined : row.storage_path,
    sizeBytes: row.size_bytes,
    deletedAt: row.deleted_at || undefined,
  };
}

function mapDrugMatch(row: DrugMatchRow): DrugDatabaseMatch {
  return {
    id: row.id,
    source: row.source,
    productName: row.product_name,
    manufacturer: row.manufacturer || undefined,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    dosageForm: row.dosage_form || undefined,
    efficacy: row.efficacy || undefined,
    usage: row.usage || undefined,
    warnings: row.warnings || [],
    interactions: row.interactions || [],
    confidence: Number(row.confidence || 0),
  };
}

function mapScan(
  row: OcrScanRow,
  photosByScanId: Map<string, MedicationPhoto>,
  matchesByScanId: Map<string, DrugDatabaseMatch[]>,
): OcrScan {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    careProfileId: row.care_profile_id,
    status: row.status,
    rawText: row.raw_text,
    extractedNames: row.extracted_names || [],
    confidence: Number(row.confidence || 0),
    createdAt: row.created_at,
    photo: photosByScanId.get(row.id),
    matches: matchesByScanId.get(row.id) || [],
  };
}

export async function loadRemoteAppData(baseUser: DemoUser): Promise<RemoteAppData> {
  const client = requireSupabase();
  const authUser = await requireAuthenticatedUser();

  const { data: workspaceId, error: bootstrapError } = await client.rpc("ensure_personal_workspace");
  if (bootstrapError || !workspaceId) {
    throw new Error(bootstrapError?.message || "가족 워크스페이스를 준비하지 못했습니다.");
  }

  const [
    workspaceResponse,
    memberResponse,
    profileResponse,
    medicationResponse,
    temporaryMedicationResponse,
    scanResponse,
    userProfileResponse,
  ] = await Promise.all([
    client.from("family_workspaces").select("id, name, owner_user_id").eq("id", workspaceId).single<WorkspaceRow>(),
    client
      .from("family_members")
      .select("id, workspace_id, user_id, role, display_name, email, accessible_profile_ids, care_profile_id")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<FamilyMemberRow[]>(),
    client
      .from("care_profiles")
      .select("id, workspace_id, owner_user_id, name, type, age_group, notes, pet_details")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true })
      .returns<CareProfileRow[]>(),
    client
      .from("medications")
      .select(
        "id, workspace_id, care_profile_id, status, product_name, nickname, source, ingredients, dosage, instructions, warnings, interactions, started_at, review_at",
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .returns<MedicationRow[]>(),
    client
      .from("temporary_medications")
      .select("id, workspace_id, care_profile_id, raw_name, raw_text, note, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .returns<TemporaryMedicationRow[]>(),
    client
      .from("ocr_scans")
      .select("id, workspace_id, care_profile_id, status, raw_text, extracted_names, confidence, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .returns<OcrScanRow[]>(),
    client.from("profiles").select("id, display_name, avatar_url").eq("id", authUser.id).single<ProfileRow>(),
  ]);

  if (workspaceResponse.error) throw new Error(workspaceResponse.error.message);
  if (memberResponse.error) throw new Error(memberResponse.error.message);
  if (profileResponse.error) throw new Error(profileResponse.error.message);
  if (medicationResponse.error) throw new Error(medicationResponse.error.message);
  if (temporaryMedicationResponse.error) throw new Error(temporaryMedicationResponse.error.message);
  if (scanResponse.error) throw new Error(scanResponse.error.message);
  if (userProfileResponse.error) throw new Error(userProfileResponse.error.message);

  const familyMembers = (memberResponse.data || []).map(mapFamilyMember);
  const careProfiles = (profileResponse.data || []).map(mapCareProfile);
  const medications = (medicationResponse.data || []).map(mapMedication);
  const temporaryMedications = (temporaryMedicationResponse.data || []).map(mapTemporaryMedication);
  const scans = scanResponse.data || [];

  const scanIds = scans.map((scan) => scan.id);
  let photosByScanId = new Map<string, MedicationPhoto>();
  let matchesByScanId = new Map<string, DrugDatabaseMatch[]>();

  if (scanIds.length) {
    const [photoResponse, matchResponse] = await Promise.all([
      client
        .from("medication_photos")
        .select("id, scan_id, file_name, storage_path, size_bytes, deleted_at")
        .in("scan_id", scanIds)
        .is("deleted_at", null)
        .returns<MedicationPhotoRow[]>(),
      client
        .from("drug_database_matches")
        .select("id, scan_id, source, product_name, manufacturer, ingredients, dosage_form, efficacy, usage, warnings, interactions, confidence")
        .in("scan_id", scanIds)
        .returns<DrugMatchRow[]>(),
    ]);

    if (photoResponse.error) throw new Error(photoResponse.error.message);
    if (matchResponse.error) throw new Error(matchResponse.error.message);

    photosByScanId = new Map(
      (photoResponse.data || []).map((row) => [row.scan_id, mapPhoto(row)]),
    );
    matchesByScanId = (matchResponse.data || []).reduce((acc, row) => {
      const next = acc.get(row.scan_id) || [];
      next.push(mapDrugMatch(row));
      acc.set(row.scan_id, next);
      return acc;
    }, new Map<string, DrugDatabaseMatch[]>());
  }

  const resolvedUserProfile = userProfileResponse.data;
  const currentMember = familyMembers.find((member) => member.userId === authUser.id);
  const resolvedUser: DemoUser = {
    ...baseUser,
    name: resolvedUserProfile.display_name || currentMember?.displayName || baseUser.name,
    email: authUser.email || currentMember?.email || baseUser.email,
    familyRole: currentMember?.role || baseUser.familyRole,
  };

  return {
    workspace: mapWorkspace(workspaceResponse.data),
    familyMembers,
    careProfiles,
    medications,
    temporaryMedications,
    scans: scans.map((scan) => mapScan(scan, photosByScanId, matchesByScanId)),
    resolvedUser,
  };
}

function buildScanPayload(scan: OcrScan) {
  return {
    workspace_id: scan.workspaceId,
    care_profile_id: scan.careProfileId,
    status: scan.status,
    raw_text: scan.rawText,
    extracted_names: scan.extractedNames,
    confidence: scan.confidence,
  };
}

async function createScanArtifacts(scanId: string, scan: OcrScan): Promise<void> {
  const client = requireSupabase();

  if (scan.photo?.dataUrl || scan.photo?.storagePath) {
    const { error } = await client.from("medication_photos").insert({
      scan_id: scanId,
      file_name: scan.photo.fileName,
      storage_path: scan.photo.dataUrl || scan.photo.storagePath || `scan://${scanId}/${scan.photo.fileName}`,
      size_bytes: scan.photo.sizeBytes,
    });

    if (error) throw new Error(error.message);
  }

  if (scan.matches.length) {
    const { error } = await client.from("drug_database_matches").insert(
      scan.matches.map((match) => ({
        scan_id: scanId,
        source: match.source,
        product_name: match.productName,
        manufacturer: match.manufacturer || null,
        ingredients: match.ingredients,
        dosage_form: match.dosageForm || null,
        efficacy: match.efficacy || null,
        usage: match.usage || null,
        warnings: match.warnings,
        interactions: match.interactions,
        confidence: match.confidence,
      })),
    );

    if (error) throw new Error(error.message);
  }
}

async function insertScan(scan: OcrScan): Promise<OcrScan> {
  const client = requireSupabase();
  const authUser = await requireAuthenticatedUser();

  const { data, error } = await client
    .from("ocr_scans")
    .insert({
      ...buildScanPayload(scan),
      created_by: authUser.id,
    })
    .select("id, workspace_id, care_profile_id, status, raw_text, extracted_names, confidence, created_at")
    .single<OcrScanRow>();

  if (error || !data) {
    throw new Error(error?.message || "OCR 기록을 저장하지 못했습니다.");
  }

  await createScanArtifacts(data.id, scan);

  return {
    ...scan,
    id: data.id,
    createdAt: data.created_at,
    photo: scan.photo ? { ...scan.photo, scanId: data.id } : undefined,
  };
}

export async function saveConfirmedMedication(
  medication: Medication,
  scan: OcrScan,
): Promise<{ medication: Medication; scan: OcrScan }> {
  const client = requireSupabase();
  const authUser = await requireAuthenticatedUser();
  const savedScan = await insertScan(scan);

  const { data, error } = await client
    .from("medications")
    .insert({
      workspace_id: scan.workspaceId,
      care_profile_id: medication.careProfileId,
      status: medication.status,
      product_name: medication.productName,
      nickname: medication.nickname || null,
      source: medication.source,
      ingredients: medication.ingredients,
      dosage: medication.dosage || null,
      instructions: medication.instructions || null,
      warnings: medication.warnings,
      interactions: medication.interactions,
      started_at: medication.startedAt,
      review_at: medication.reviewAt || null,
      created_by: authUser.id,
    })
    .select(
      "id, workspace_id, care_profile_id, status, product_name, nickname, source, ingredients, dosage, instructions, warnings, interactions, started_at, review_at",
    )
    .single<MedicationRow>();

  if (error || !data) {
    throw new Error(error?.message || "약 정보를 저장하지 못했습니다.");
  }

  return {
    medication: mapMedication(data),
    scan: savedScan,
  };
}

export async function saveTemporaryMedication(
  medication: TemporaryMedication,
  scan: OcrScan,
): Promise<{ medication: TemporaryMedication; scan: OcrScan }> {
  const client = requireSupabase();
  const authUser = await requireAuthenticatedUser();
  const savedScan = await insertScan(scan);

  const { data, error } = await client
    .from("temporary_medications")
    .insert({
      workspace_id: scan.workspaceId,
      care_profile_id: medication.careProfileId,
      raw_name: medication.rawName,
      raw_text: medication.rawText,
      note: medication.note || null,
      created_by: authUser.id,
    })
    .select("id, workspace_id, care_profile_id, raw_name, raw_text, note, created_at")
    .single<TemporaryMedicationRow>();

  if (error || !data) {
    throw new Error(error?.message || "임시약을 저장하지 못했습니다.");
  }

  return {
    medication: mapTemporaryMedication(data),
    scan: savedScan,
  };
}

export async function deleteRemoteMedication(medicationId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("medications").delete().eq("id", medicationId);
  if (error) throw new Error(error.message);
}

export async function updateRemoteFamilyMember(
  memberId: string,
  patch: Partial<FamilyMember>,
): Promise<FamilyMember> {
  if (!isUuid(memberId)) {
    throw new Error("가족 데이터가 원격 정보와 맞지 않습니다. 새로고침 후 다시 시도해 주세요.");
  }

  const client = requireSupabase();
  const { data, error } = await client
    .rpc("update_family_member", {
      member_id: memberId,
      next_display_name: patch.displayName ?? null,
      next_email: patch.email ?? null,
      next_role: patch.role ?? null,
      next_accessible_profile_ids: patch.accessibleProfileIds ?? null,
    })
    .single<FamilyMemberRow>();

  if (error || !data) {
    throw new Error(error?.message || "가족 구성원 정보를 저장하지 못했습니다.");
  }

  return mapFamilyMember(data);
}

export async function deleteRemoteFamilyMember(memberId: string): Promise<void> {
  if (!isUuid(memberId)) {
    throw new Error("가족 데이터가 원격 정보와 맞지 않습니다. 새로고침 후 다시 시도해 주세요.");
  }

  const client = requireSupabase();
  const { error } = await client.rpc("delete_family_member", { member_id: memberId });
  if (error) throw new Error(error.message);
}

export async function createRemoteFamilyMember(args: {
  workspaceId: string;
  displayName: string;
  email: string;
  role: FamilyRole;
}): Promise<FamilyMember> {
  const client = requireSupabase();
  const { data, error } = await client
    .rpc("create_family_invite", {
      target_workspace: args.workspaceId,
      invite_name: args.displayName,
      invite_email: args.email,
      invite_role: args.role,
    })
    .single<FamilyMemberRow>();

  if (error || !data) {
    throw new Error(error?.message || "가족 구성원을 추가하지 못했습니다.");
  }

  return mapFamilyMember(data);
}

export async function createRemoteCareProfile(profile: CareProfile): Promise<CareProfile> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("care_profiles")
    .insert({
      workspace_id: profile.workspaceId,
      owner_user_id: profile.ownerUserId || null,
      name: profile.name,
      type: profile.type,
      age_group: profile.ageGroup,
      notes: profile.notes || null,
      pet_details: profile.petDetails || {},
    })
    .select("id, workspace_id, owner_user_id, name, type, age_group, notes, pet_details")
    .single<CareProfileRow>();

  if (error || !data) {
    throw new Error(error?.message || "관리 대상을 추가하지 못했습니다.");
  }

  return mapCareProfile(data);
}

export async function updateRemoteCareProfile(
  profileId: string,
  patch: Partial<CareProfile>,
): Promise<CareProfile> {
  const client = requireSupabase();
  const nextPatch: Record<string, unknown> = {};

  if (patch.ownerUserId !== undefined) nextPatch.owner_user_id = patch.ownerUserId || null;
  if (patch.name !== undefined) nextPatch.name = patch.name;
  if (patch.type !== undefined) nextPatch.type = patch.type;
  if (patch.ageGroup !== undefined) nextPatch.age_group = patch.ageGroup;
  if (patch.notes !== undefined) nextPatch.notes = patch.notes || null;
  if (patch.petDetails !== undefined) nextPatch.pet_details = patch.petDetails || {};

  const { data, error } = await client
    .from("care_profiles")
    .update(nextPatch)
    .eq("id", profileId)
    .select("id, workspace_id, owner_user_id, name, type, age_group, notes, pet_details")
    .single<CareProfileRow>();

  if (error || !data) {
    throw new Error(error?.message || "관리 대상 정보를 저장하지 못했습니다.");
  }

  return mapCareProfile(data);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function deleteRemoteCareProfile(profileId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("care_profiles").delete().eq("id", profileId);
  if (error) throw new Error(error.message);
}
