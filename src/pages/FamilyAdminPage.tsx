import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type {
  CareProfile,
  DemoUser,
  FamilyInvitation,
  FamilyMember,
  FamilyRole,
  FamilyWorkspace,
  Medication,
  OcrScan,
  TemporaryMedication,
} from "../types";

interface FamilyAdminPageProps {
  careProfiles: CareProfile[];
  familyInvitations: FamilyInvitation[];
  familyMembers: FamilyMember[];
  medications: Medication[];
  onAddMember: (member: Pick<FamilyMember, "displayName" | "email" | "role">) => Promise<void> | void;
  onAddCareProfile: (profile: CareProfile) => Promise<void> | void;
  onDeleteCareProfile: (profileId: string) => Promise<void> | void;
  onDeleteMember: (memberId: string) => Promise<void> | void;
  onRevokeInvitation: (invitationId: string) => Promise<void> | void;
  onUpdateCareProfile: (profileId: string, patch: Partial<CareProfile>) => Promise<void> | void;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => Promise<void> | void;
  scans: OcrScan[];
  temporaryMedications: TemporaryMedication[];
  user: DemoUser;
  workspace: FamilyWorkspace;
}

export function FamilyAdminPage({
  careProfiles,
  familyInvitations,
  familyMembers,
  medications,
  onAddMember,
  onAddCareProfile,
  onDeleteCareProfile,
  onDeleteMember,
  onRevokeInvitation,
  onUpdateCareProfile,
  onUpdateMember,
  scans,
  temporaryMedications,
  user,
  workspace,
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
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    displayName: "",
    email: "",
    role: "member" as FamilyRole,
  });
  const [memberSaveNote, setMemberSaveNote] = useState("");
  const [deletingMemberId, setDeletingMemberId] = useState("");
  const [revokingInvitationId, setRevokingInvitationId] = useState("");
  const connectedMemberCount = familyMembers.filter((member) => Boolean(member.userId)).length;
  const pendingInvitationCount = familyInvitations.filter((invitation) => invitation.status === "pending").length;
  const isPersonalOnlyWorkspace = connectedMemberCount <= 1;

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

  async function saveMember(member: FamilyMember): Promise<void> {
    setMemberSaveNote("");
    try {
      await onUpdateMember(member.id, {
        displayName: member.displayName,
        email: member.email,
        role: member.role,
        accessibleProfileIds: normalizedAccessibleProfileIds(member, careProfiles),
      });
      setSavedMemberId(member.id);
      setMemberSaveNote(
        member.userId
          ? `${member.displayName} 저장 완료`
          : `${member.displayName} 저장 완료. 초대 대기 이메일도 함께 업데이트했습니다.`,
      );
    } catch (error) {
      setMemberSaveNote(error instanceof Error ? error.message : "가족 구성원 저장 중 문제가 발생했습니다.");
    }
  }

  async function deleteFamilyMember(member: FamilyMember): Promise<void> {
    if (member.role === "owner") {
      setMemberSaveNote("가족대표는 삭제할 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      `${member.displayName} 구성원을 삭제할까요?\n연결된 관리대상과 등록된 약 기록도 함께 삭제됩니다.`,
    );
    if (!confirmed) return;

    setMemberSaveNote("");
    setDeletingMemberId(member.id);
    try {
      await onDeleteMember(member.id);
      setMemberSaveNote(`${member.displayName} 삭제 완료`);
    } catch (error) {
      setMemberSaveNote(error instanceof Error ? error.message : "가족 구성원 삭제 중 문제가 발생했습니다.");
    } finally {
      setDeletingMemberId("");
    }
  }

  async function revokeInvitation(invitation: FamilyInvitation): Promise<void> {
    const confirmed = window.confirm(`${invitation.displayName}님 초대를 취소할까요?`);
    if (!confirmed) return;

    setRevokingInvitationId(invitation.id);
    setMemberSaveNote("");
    try {
      await onRevokeInvitation(invitation.id);
      setMemberSaveNote(`${invitation.displayName} 초대 취소 완료`);
    } catch (error) {
      setMemberSaveNote(error instanceof Error ? error.message : "초대 취소 중 문제가 발생했습니다.");
    } finally {
      setRevokingInvitationId("");
    }
  }

  function updateMemberForm(field: keyof typeof memberForm, value: string): void {
    setMemberSaveNote("");
    setMemberForm((current) => ({
      ...current,
      [field]: field === "role" ? (value as FamilyRole) : value,
    }));
  }

  async function addFamilyMember(): Promise<void> {
    const displayName = memberForm.displayName.trim();
    const email = memberForm.email.trim().toLocaleLowerCase("ko-KR");

    if (!displayName) {
      setMemberSaveNote("이름을 입력해 주세요.");
      return;
    }

    if (!email) {
      setMemberSaveNote("로그인에 사용할 이메일을 입력해 주세요.");
      return;
    }

    if (familyMembers.some((member) => member.email.trim().toLocaleLowerCase("ko-KR") === email)) {
      setMemberSaveNote("이미 등록된 이메일입니다.");
      return;
    }

    if (
      familyInvitations.some(
        (invitation) =>
          invitation.status === "pending" &&
          invitation.email.trim().toLocaleLowerCase("ko-KR") === email,
      )
    ) {
      setMemberSaveNote("이미 초대 대기 중인 이메일입니다.");
      return;
    }

    try {
      await onAddMember({
        displayName,
        email,
        role: memberForm.role === "owner" ? "member" : memberForm.role,
      });
      setMemberForm({ displayName: "", email: "", role: "member" });
      setMemberSaveNote(`${displayName}님 관리대상과 가족공간 초대를 만들었습니다. 상대가 수락하면 계정이 연결됩니다.`);
      setIsMemberFormOpen(false);
    } catch (error) {
      setMemberSaveNote(error instanceof Error ? error.message : "가족 구성원 추가 중 문제가 발생했습니다.");
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
          <p className="eyebrow">가족공간</p>
          <h2>{workspace.name}</h2>
          <p className="muted">
            현재 역할: {roleLabel(user.familyRole)}. 대표자는 가족 전체의 약 정보를 확인하고 이름, 이메일, 권한을 수정할 수 있습니다.
          </p>
        </div>
        <div className="stat-grid">
          <div className="stat-card"><span>확정 약</span><strong>{medications.length}</strong></div>
          <div className="stat-card"><span>임시약</span><strong>{temporaryMedications.length}</strong></div>
          <div className="stat-card"><span>OCR 기록</span><strong>{scans.length}</strong></div>
        </div>
      </section>

      <section className="card">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">초대와 권한</p>
            <h2>가족 구성원 관리</h2>
            <p className="muted">
              초대 즉시 관리대상이 만들어지고, 상대가 직접 수락해야 가족공간 계정으로 연결됩니다.
              상대의 개인공간 기록은 그대로 유지되고, 복사 여부는 수락할 때 선택합니다.
            </p>
          </div>
          <button
            className={isMemberFormOpen ? "ghost-button pet-toggle-button is-open" : "ghost-button pet-toggle-button"}
            onClick={() => setIsMemberFormOpen((current) => !current)}
            type="button"
          >
            {isMemberFormOpen ? "초대 접기" : "가족 초대"}
          </button>
        </div>
        <div className={isPersonalOnlyWorkspace ? "family-share-status needs-action" : "family-share-status"}>
          <div>
            <strong>{isPersonalOnlyWorkspace ? "아직 개인공간에 가깝습니다" : "가족공간 공유 중"}</strong>
            <p>
              {isPersonalOnlyWorkspace
                ? "가족 초대를 만들고 상대가 직접 수락해야 같은 가족공간의 약 기록을 함께 봅니다. 상대의 기존 개인공간 기록은 자동으로 합쳐지지 않습니다."
                : "연결된 가족 계정이 같은 가족공간을 보고 있습니다. 가족구성원 권한은 아래에서 조정할 수 있습니다."}
            </p>
          </div>
          <div className="family-share-metrics" aria-label="가족공간 연결 상태">
            <span>연결 {connectedMemberCount}명</span>
            <span>초대 대기 {pendingInvitationCount}건</span>
          </div>
        </div>
        {isMemberFormOpen && (
          <div className="collapsible-panel member-invite-panel">
            <div className="member-edit-fields">
              <label>
                이름
                <input
                  onChange={(event) => updateMemberForm("displayName", event.target.value)}
                  placeholder="예) 공윤아"
                  value={memberForm.displayName}
                />
              </label>
              <label>
                로그인 이메일
                <input
                  onChange={(event) => updateMemberForm("email", event.target.value)}
                  placeholder="가족이 로그인할 이메일"
                  type="email"
                  value={memberForm.email}
                />
              </label>
              <label>
                권한
                <select
                  onChange={(event) => updateMemberForm("role", event.target.value)}
                  value={memberForm.role}
                >
                  <option value="member">가족구성원</option>
                  <option value="manager">가족관리자</option>
                </select>
              </label>
            </div>
            <div className="form-action-row">
              <button className="primary-button" onClick={addFamilyMember} type="button">
                초대 만들기
              </button>
            </div>
          </div>
        )}
        {memberSaveNote && <span className="save-note saved-pop">{memberSaveNote}</span>}
        {familyInvitations.filter((invitation) => invitation.status === "pending").length > 0 && (
          <div className="pending-invite-list" aria-label="대기 중인 가족 초대">
            {familyInvitations
              .filter((invitation) => invitation.status === "pending")
              .map((invitation) => (
                <article className="pending-invite-card" key={invitation.id}>
                  <div>
                    <strong>{invitation.displayName}</strong>
                    <span>{invitation.email}</span>
                    <small>상대가 수락하기 전까지 개인공간과 분리됩니다.</small>
                  </div>
                  <div>
                    <span>{roleLabel(invitation.role)}</span>
                    <button
                      className="danger-button table-action"
                      disabled={revokingInvitationId === invitation.id}
                      onClick={() => void revokeInvitation(invitation)}
                      type="button"
                    >
                      {revokingInvitationId === invitation.id ? "취소 중" : "초대 취소"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
        <div className="member-edit-list">
          {draftMembers.map((member) => (
            <article className="member-edit-card" key={member.id}>
              <div className="member-edit-head">
                <div>
                  <strong>{member.displayName}</strong>
                  <span>{roleLabel(member.role)}</span>
                </div>
                <span className={memberConnectionClass(member)}>{memberConnectionLabel(member)}</span>
                <div className="member-row-actions">
                  <button
                    className={savedMemberId === member.id ? "primary-button table-action is-saved" : "primary-button table-action"}
                    onClick={() => saveMember(member)}
                    type="button"
                  >
                    저장
                  </button>
                  {member.role !== "owner" && (
                    <button
                      className="danger-button table-action"
                      disabled={deletingMemberId === member.id}
                      onClick={() => deleteFamilyMember(member)}
                      type="button"
                    >
                      {deletingMemberId === member.id ? "삭제 중" : "삭제"}
                    </button>
                  )}
                </div>
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
                    disabled={!canEditMemberEmail(member)}
                    onChange={(event) =>
                      updateDraftMember(member.id, { email: event.target.value })
                    }
                    title={
                      canEditMemberEmail(member)
                        ? "초대 전 로그인 이메일을 수정할 수 있습니다."
                        : "이미 연결된 계정의 로그인 이메일은 변경할 수 없습니다."
                    }
                    type="email"
                    value={member.email}
                  />
                  {!canEditMemberEmail(member) && (
                    <small className="field-hint">
                      로그인 이메일 변경은 삭제 후 새 초대로 진행합니다.
                    </small>
                  )}
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
                    <option value="owner">가족대표</option>
                    <option value="manager">가족관리자</option>
                    <option value="member">가족구성원</option>
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

function memberConnectionLabel(member: FamilyMember): string {
  if (member.role === "owner") return "대표 계정";
  return member.userId ? "계정 연결됨" : "초대 대기";
}

function memberConnectionClass(member: FamilyMember): string {
  if (member.role === "owner") return "member-status-badge owner";
  return member.userId ? "member-status-badge connected" : "member-status-badge pending";
}

function canEditMemberEmail(member: FamilyMember): boolean {
  return member.role !== "owner" && !member.userId;
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
  return profiles
    .filter((profile) => profile.ownerUserId === member.userId || profile.id === member.careProfileId)
    .map((profile) => profile.id);
}

function normalizedAccessibleProfileIds(member: FamilyMember, profiles: CareProfile[]): string[] {
  if (member.role === "owner" || member.role === "manager") {
    return profiles.map((profile) => profile.id);
  }

  return Array.from(new Set([...(member.accessibleProfileIds || []), ...ownProfileIdsForMember(member, profiles)]));
}
