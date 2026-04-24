import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type {
  CareProfile,
  DemoUser,
  FamilyMember,
  FamilyRole,
  FamilyWorkspace,
  Medication,
  OcrScan,
  TemporaryMedication,
} from "../types";

interface FamilyAdminPageProps {
  careProfiles: CareProfile[];
  familyMembers: FamilyMember[];
  medications: Medication[];
  onAddCareProfile: (profile: CareProfile) => Promise<void> | void;
  onDeleteCareProfile: (profileId: string) => Promise<void> | void;
  onUpdateCareProfile: (profileId: string, patch: Partial<CareProfile>) => Promise<void> | void;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => Promise<void> | void;
  scans: OcrScan[];
  temporaryMedications: TemporaryMedication[];
  user: DemoUser;
  workspace: FamilyWorkspace;
  onSyncDrugCatalog: () => Promise<Array<{ source: string; fetchedCount: number; upsertedCount: number }>> | Array<{ source: string; fetchedCount: number; upsertedCount: number }>;
}

export function FamilyAdminPage({
  careProfiles,
  familyMembers,
  medications,
  onAddCareProfile,
  onDeleteCareProfile,
  onUpdateCareProfile,
  onUpdateMember,
  scans,
  temporaryMedications,
  user,
  workspace,
  onSyncDrugCatalog,
}: FamilyAdminPageProps): ReactElement {
  const [draftMembers, setDraftMembers] = useState<FamilyMember[]>(familyMembers);
  const [savedMemberId, setSavedMemberId] = useState("");
  const [petDrafts, setPetDrafts] = useState<CareProfile[]>(() =>
    careProfiles.filter((profile) => profile.type === "pet"),
  );
  const [savedPetId, setSavedPetId] = useState("");
  const [isPetFormOpen, setIsPetFormOpen] = useState(false);
  const [editingPetId, setEditingPetId] = useState("");
  const [petForm, setPetForm] = useState({
    name: "",
    birthDate: "",
    age: "",
    weightKg: "",
    allergies: "",
    mainFood: "",
    forbiddenFoods: "",
  });
  const [petSaveNote, setPetSaveNote] = useState("");
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [catalogSyncNote, setCatalogSyncNote] = useState("");

  useEffect(() => {
    setDraftMembers(familyMembers);
  }, [familyMembers]);

  useEffect(() => {
    setPetDrafts(careProfiles.filter((profile) => profile.type === "pet"));
  }, [careProfiles]);

  function updateDraftMember(memberId: string, patch: Partial<FamilyMember>): void {
    setSavedMemberId("");
    setDraftMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, ...patch } : member)),
    );
  }

  async function syncDrugCatalog(): Promise<void> {
    setCatalogSyncNote("");
    setIsSyncingCatalog(true);
    try {
      const summaries = await onSyncDrugCatalog();
      const line = summaries
        .map((summary) => `${sourceSyncLabel(summary.source)} ${summary.upsertedCount}건`)
        .join(" · ");
      setCatalogSyncNote(line ? `검색 인덱스 보강 완료: ${line}` : "검색 인덱스 보강 완료");
    } catch (error) {
      setCatalogSyncNote(error instanceof Error ? error.message : "검색 인덱스 보강 중 문제가 발생했습니다.");
    } finally {
      setIsSyncingCatalog(false);
    }
  }

  async function saveMember(member: FamilyMember): Promise<void> {
    try {
      await onUpdateMember(member.id, {
        displayName: member.displayName,
        email: member.email,
        role: member.role,
        accessibleProfileIds: normalizedAccessibleProfileIds(member, careProfiles),
      });
      setSavedMemberId(member.id);
    } catch (error) {
      setPetSaveNote(error instanceof Error ? error.message : "가족 구성원 저장 중 문제가 발생했습니다.");
    }
  }

  function toggleProfileAccess(member: FamilyMember, profileId: string): void {
    const ownProfileIds = ownProfileIdsForMember(member, careProfiles);
    const nextIds = member.accessibleProfileIds.includes(profileId)
      ? member.accessibleProfileIds.filter((id) => id !== profileId)
      : [...member.accessibleProfileIds, profileId];

    updateDraftMember(member.id, {
      accessibleProfileIds: Array.from(new Set([...nextIds, ...ownProfileIds])),
    });
  }

  function updatePetForm(field: keyof typeof petForm, value: string): void {
    setPetSaveNote("");
    setPetForm((current) => ({ ...current, [field]: value }));
  }

  async function addPetProfile(): Promise<void> {
    const name = petForm.name.trim();
    if (!name) {
      setPetSaveNote("이름을 입력해 주세요.");
      return;
    }

    const notes = [
      petForm.age && `나이 ${petForm.age}`,
      petForm.weightKg && `몸무게 ${petForm.weightKg}kg`,
      petForm.allergies && `알러지 ${petForm.allergies}`,
      petForm.mainFood && `주요 사료 ${petForm.mainFood}`,
      petForm.forbiddenFoods && `금지 음식 ${petForm.forbiddenFoods}`,
    ]
      .filter(Boolean)
      .join(" · ");

    if (hasDuplicatePetName(name)) {
      setPetSaveNote("이미 등록된 이름입니다. 구분할 수 있게 이름을 바꿔 주세요.");
      return;
    }

    try {
      await onAddCareProfile({
        id: `profile-pet-${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        name,
        type: "pet",
        ageGroup: "20",
        notes: notes || "반려동물 영양제와 약은 수의사 확인이 필요합니다.",
        petDetails: {
          birthDate: petForm.birthDate || undefined,
          age: petForm.age || undefined,
          weightKg: petForm.weightKg || undefined,
          allergies: petForm.allergies || undefined,
          mainFood: petForm.mainFood || undefined,
          forbiddenFoods: petForm.forbiddenFoods || undefined,
        },
      });
      setPetForm({
        name: "",
        birthDate: "",
        age: "",
        weightKg: "",
        allergies: "",
        mainFood: "",
        forbiddenFoods: "",
      });
      setPetSaveNote(`${name} 등록 완료`);
      setIsPetFormOpen(false);
    } catch (error) {
      setPetSaveNote(error instanceof Error ? error.message : "반려동물 등록 중 문제가 발생했습니다.");
    }
  }

  function updatePetDraft(profileId: string, patch: Partial<CareProfile>): void {
    setSavedPetId("");
    setPetSaveNote("");
    setPetDrafts((current) =>
      current.map((profile) => (profile.id === profileId ? { ...profile, ...patch } : profile)),
    );
  }

  function updatePetDetail(
    profile: CareProfile,
    field: keyof NonNullable<CareProfile["petDetails"]>,
    value: string,
  ): void {
    updatePetDraft(profile.id, {
      petDetails: {
        ...profile.petDetails,
        [field]: value,
      },
    });
  }

  async function savePetProfile(profile: CareProfile): Promise<void> {
    const name = profile.name.trim();
    if (!name) {
      setPetSaveNote("반려동물 이름을 입력해 주세요.");
      return;
    }

    if (hasDuplicatePetName(name, profile.id)) {
      setPetSaveNote("이미 등록된 이름입니다. 구분할 수 있게 이름을 바꿔 주세요.");
      return;
    }

    const details = profile.petDetails || {};
    const notes = [
      details.age && `나이 ${details.age}`,
      details.weightKg && `몸무게 ${details.weightKg}kg`,
      details.allergies && `알러지 ${details.allergies}`,
      details.mainFood && `주요 사료 ${details.mainFood}`,
      details.forbiddenFoods && `금지 음식 ${details.forbiddenFoods}`,
    ]
      .filter(Boolean)
      .join(" · ");

    try {
      await onUpdateCareProfile(profile.id, {
        ...profile,
        name,
        notes: notes || "반려동물 영양제와 약은 수의사 확인이 필요합니다.",
      });
      setSavedPetId(profile.id);
      setEditingPetId("");
    } catch (error) {
      setPetSaveNote(error instanceof Error ? error.message : "반려동물 정보를 저장하지 못했습니다.");
    }
  }

  async function deletePetProfile(profile: CareProfile): Promise<void> {
    const shouldDelete = window.confirm(
      `${profile.name} 프로필을 삭제할까요? 등록된 약, 임시약, OCR 기록도 함께 정리됩니다.`,
    );
    if (!shouldDelete) return;
    try {
      await onDeleteCareProfile(profile.id);
      if (editingPetId === profile.id) setEditingPetId("");
      setPetSaveNote(`${profile.name} 삭제 완료`);
    } catch (error) {
      setPetSaveNote(error instanceof Error ? error.message : "반려동물 삭제 중 문제가 발생했습니다.");
    }
  }

  function hasDuplicatePetName(name: string, excludeProfileId?: string): boolean {
    const normalizedName = name.trim().toLocaleLowerCase("ko-KR");
    return careProfiles.some(
      (profile) =>
        profile.type === "pet" &&
        profile.id !== excludeProfileId &&
        profile.name.trim().toLocaleLowerCase("ko-KR") === normalizedName,
    );
  }

  return (
    <div className="admin-layout">
      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Family Workspace</p>
          <h2>{workspace.name}</h2>
          <p className="muted">
            현재 역할: {user.familyRole}. 대표자는 가족 전체의 약 정보를 확인하고 이름, 이메일, 권한을 수정할 수 있습니다.
          </p>
        </div>
        <div className="stat-grid">
          <div className="stat-card"><span>확정 약</span><strong>{medications.length}</strong></div>
          <div className="stat-card"><span>임시약</span><strong>{temporaryMedications.length}</strong></div>
          <div className="stat-card"><span>OCR 기록</span><strong>{scans.length}</strong></div>
        </div>
        {(user.familyRole === "owner" || user.familyRole === "manager") && (
          <div className="catalog-sync-panel">
            <div>
              <strong>검색 인덱스 보강</strong>
              <p className="muted">
                공식 DB 일부를 짧게 보강합니다. 전체 적재는 별도 관리 작업으로 분리합니다.
              </p>
            </div>
            <div className="catalog-sync-actions">
              <button
                className="primary-button"
                disabled={isSyncingCatalog}
                onClick={() => void syncDrugCatalog()}
                type="button"
              >
                {isSyncingCatalog ? "보강 중..." : "인덱스 보강"}
              </button>
              {catalogSyncNote && <span className="save-note">{catalogSyncNote}</span>}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Members</p>
          <h2>가족 구성원 관리</h2>
        </div>
        <div className="member-edit-list">
          {draftMembers.map((member) => (
            <article className="member-edit-card" key={member.id}>
              <div className="member-edit-head">
                <div>
                  <strong>{member.displayName}</strong>
                  <span>{roleLabel(member.role)}</span>
                </div>
                <button
                  className={savedMemberId === member.id ? "primary-button table-action is-saved" : "primary-button table-action"}
                  onClick={() => saveMember(member)}
                  type="button"
                >
                  저장
                </button>
              </div>
              <div className="member-edit-fields">
                <label>
                  이름
                  <input
                    aria-label={`${member.displayName} 이름`}
                    onChange={(event) =>
                      updateDraftMember(member.id, { displayName: event.target.value })
                    }
                    value={member.displayName}
                  />
                </label>
                <label>
                  이메일
                  <input
                    aria-label={`${member.displayName} 이메일`}
                    onChange={(event) =>
                      updateDraftMember(member.id, { email: event.target.value })
                    }
                    type="email"
                    value={member.email}
                  />
                </label>
                <label>
                  권한
                  <select
                    aria-label={`${member.displayName} 권한`}
                    disabled={member.role === "owner"}
                    onChange={(event) =>
                      updateDraftMember(member.id, { role: event.target.value as FamilyRole })
                    }
                    value={member.role}
                  >
                    <option value="owner">owner</option>
                    <option value="manager">manager</option>
                    <option value="member">member</option>
                  </select>
                </label>
              </div>
              <div className="member-access-block">
                <strong>다른 가족 정보 보기 권한</strong>
                {member.role === "owner" || member.role === "manager" ? (
                  <p className="muted">이 역할은 가족 전체 프로필을 기본으로 볼 수 있습니다.</p>
                ) : (
                  <div className="access-chip-list">
                    {careProfiles.map((profile) => {
                      const ownProfileIds = ownProfileIdsForMember(member, careProfiles);
                      const isOwnProfile = ownProfileIds.includes(profile.id);
                      const checked = normalizedAccessibleProfileIds(member, careProfiles).includes(profile.id);
                      return (
                        <label className={checked ? "access-chip is-selected" : "access-chip"} key={`${member.id}-${profile.id}`}>
                          <input
                            checked={checked}
                            disabled={isOwnProfile}
                            onChange={() => toggleProfileAccess(member, profile.id)}
                            type="checkbox"
                          />
                          <span>{profile.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Pets</p>
            <h2>반려동물 관리</h2>
            <p className="muted">
              반려동물은 계정 로그인이 아니라 가족 대표가 관리 대상 프로필로 직접 등록합니다.
            </p>
          </div>
          <button
            className={isPetFormOpen ? "ghost-button pet-toggle-button is-open" : "ghost-button pet-toggle-button"}
            onClick={() => setIsPetFormOpen((current) => !current)}
            type="button"
          >
            {isPetFormOpen ? "등록 접기" : "반려동물 등록"}
          </button>
        </div>

        {isPetFormOpen && (
          <div className="collapsible-panel">
            <div className="pet-form-grid">
              <label>
                이름
                <input
                  onChange={(event) => updatePetForm("name", event.target.value)}
                  placeholder="예) 흰둥이"
                  value={petForm.name}
                />
              </label>
              <label>
                생년월일
                <input
                  onChange={(event) => updatePetForm("birthDate", event.target.value)}
                  type="date"
                  value={petForm.birthDate}
                />
              </label>
              <label>
                나이
                <input
                  onChange={(event) => updatePetForm("age", event.target.value)}
                  placeholder="예) 5살"
                  value={petForm.age}
                />
              </label>
              <label>
                몸무게 kg
                <input
                  inputMode="decimal"
                  onChange={(event) => updatePetForm("weightKg", event.target.value)}
                  placeholder="예) 4.8"
                  value={petForm.weightKg}
                />
              </label>
              <label>
                알러지
                <input
                  onChange={(event) => updatePetForm("allergies", event.target.value)}
                  placeholder="예) 닭고기, 곡물"
                  value={petForm.allergies}
                />
              </label>
              <label>
                주로 먹는 사료
                <input
                  onChange={(event) => updatePetForm("mainFood", event.target.value)}
                  placeholder="예) 저알러지 사료"
                  value={petForm.mainFood}
                />
              </label>
              <label className="pet-form-wide">
                금지 음식
                <input
                  onChange={(event) => updatePetForm("forbiddenFoods", event.target.value)}
                  placeholder="예) 초콜릿, 포도, 양파"
                  value={petForm.forbiddenFoods}
                />
              </label>
            </div>

            <div className="form-action-row">
              <button className="primary-button" onClick={addPetProfile} type="button">
                등록 저장
              </button>
            </div>
          </div>
        )}
        {petSaveNote && <span className="save-note saved-pop">{petSaveNote}</span>}

        <div className="pet-list">
          {petDrafts.map((profile) => (
              <article className="pet-summary editable-pet" key={profile.id}>
                <div className="pet-summary-head">
                  <div>
                    <strong>{profile.name || "이름 없음"}</strong>
                    <span>{petSummaryLine(profile)}</span>
                  </div>
                  <div className="pet-row-actions">
                    <button
                      className={editingPetId === profile.id ? "ghost-button pet-toggle-button is-open" : "ghost-button pet-toggle-button"}
                      onClick={() =>
                        setEditingPetId((current) => (current === profile.id ? "" : profile.id))
                      }
                      type="button"
                    >
                      {editingPetId === profile.id ? "수정 접기" : "수정"}
                    </button>
                    <button className="danger-button" onClick={() => deletePetProfile(profile)} type="button">
                      삭제
                    </button>
                  </div>
                </div>
                {editingPetId === profile.id && (
                  <div className="collapsible-panel">
                    <div className="pet-form-grid compact-pet-form">
                      <label>
                        이름
                        <input
                          onChange={(event) => updatePetDraft(profile.id, { name: event.target.value })}
                          value={profile.name}
                        />
                      </label>
                      <label>
                        생년월일
                        <input
                          onChange={(event) => updatePetDetail(profile, "birthDate", event.target.value)}
                          type="date"
                          value={profile.petDetails?.birthDate || ""}
                        />
                      </label>
                      <label>
                        나이
                        <input
                          onChange={(event) => updatePetDetail(profile, "age", event.target.value)}
                          value={profile.petDetails?.age || ""}
                        />
                      </label>
                      <label>
                        몸무게 kg
                        <input
                          inputMode="decimal"
                          onChange={(event) => updatePetDetail(profile, "weightKg", event.target.value)}
                          value={profile.petDetails?.weightKg || ""}
                        />
                      </label>
                      <label>
                        알러지
                        <input
                          onChange={(event) => updatePetDetail(profile, "allergies", event.target.value)}
                          value={profile.petDetails?.allergies || ""}
                        />
                      </label>
                      <label>
                        주로 먹는 사료
                        <input
                          onChange={(event) => updatePetDetail(profile, "mainFood", event.target.value)}
                          value={profile.petDetails?.mainFood || ""}
                        />
                      </label>
                      <label className="pet-form-wide">
                        금지 음식
                        <input
                          onChange={(event) => updatePetDetail(profile, "forbiddenFoods", event.target.value)}
                          value={profile.petDetails?.forbiddenFoods || ""}
                        />
                      </label>
                    </div>
                    <button
                      className={savedPetId === profile.id ? "primary-button pet-save-button is-saved" : "primary-button pet-save-button"}
                      onClick={() => savePetProfile(profile)}
                      type="button"
                    >
                      정보 저장
                    </button>
                  </div>
                )}
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

function roleLabel(role: FamilyRole): string {
  if (role === "owner") return "가족대표";
  if (role === "manager") return "가족관리자";
  return "가족구성원";
}

function sourceSyncLabel(source: string): string {
  if (source === "mfds_permit") return "허가정보";
  if (source === "mfds_easy") return "e약은요";
  if (source === "mfds_health") return "건강기능식품";
  return source;
}

function petSummaryLine(profile: CareProfile): string {
  const details = profile.petDetails || {};
  return [
    details.age,
    details.weightKg && `${details.weightKg}kg`,
    details.allergies && `알러지 ${details.allergies}`,
  ]
    .filter(Boolean)
    .join(" · ") || "등록된 상세 정보 없음";
}

function ownProfileIdsForMember(member: FamilyMember, profiles: CareProfile[]): string[] {
  return profiles.filter((profile) => profile.ownerUserId === member.userId).map((profile) => profile.id);
}

function normalizedAccessibleProfileIds(member: FamilyMember, profiles: CareProfile[]): string[] {
  if (member.role === "owner" || member.role === "manager") {
    return profiles.map((profile) => profile.id);
  }

  return Array.from(new Set([...(member.accessibleProfileIds || []), ...ownProfileIdsForMember(member, profiles)]));
}
