import { useState } from "react";
import type { ReactElement } from "react";
import type {
  CareProfile,
  DemoUser,
  FamilyMember,
  Medication,
  MedicationSchedule,
  TemporaryMedication,
} from "../types";
import {
  ingredientSummary,
  medicationGuidanceText,
  medicationPeriodText,
  medicationScheduleText,
  medicationStatusLabel,
  sourceLabel,
} from "../utils/medicationDisplay";

interface ProfilesPageProps {
  careProfiles: CareProfile[];
  currentProfileId: string;
  familyMembers: FamilyMember[];
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => Promise<void> | void;
  schedules: MedicationSchedule[];
  temporaryMedications: TemporaryMedication[];
  user: DemoUser;
}

export function ProfilesPage({
  careProfiles,
  currentProfileId,
  familyMembers,
  medications,
  onDeleteMedication,
  schedules,
  temporaryMedications,
  user,
}: ProfilesPageProps): ReactElement {
  return (
    <section className="page-grid">
      {careProfiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          familyMembers={familyMembers}
          medications={medications.filter((medication) => medication.careProfileId === profile.id)}
          onDeleteMedication={onDeleteMedication}
          profile={profile}
          schedules={schedules}
          selected={currentProfileId === profile.id}
          temporaryCount={temporaryMedications.filter((medication) => medication.careProfileId === profile.id).length}
          user={user}
        />
      ))}
    </section>
  );
}

function ProfileCard({
  familyMembers,
  medications,
  onDeleteMedication,
  profile,
  schedules,
  selected,
  temporaryCount,
  user,
}: {
  familyMembers: FamilyMember[];
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => Promise<void> | void;
  profile: CareProfile;
  schedules: MedicationSchedule[];
  selected: boolean;
  temporaryCount: number;
  user: DemoUser;
}): ReactElement {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [deletingMedicationId, setDeletingMedicationId] = useState("");
  const confirmedCount = medications.filter((medication) => medication.status === "confirmed").length;
  const reviewCount = medications.filter((medication) => medication.status === "needs_review").length + temporaryCount;
  const profileLabel = profileRoleLabel(profile, familyMembers);
  const canDeleteMedication = canManageProfile(profile, familyMembers, user);

  async function requestDeleteMedication(medication: Medication): Promise<void> {
    const shouldDelete = window.confirm(`${medication.productName}을(를) ${profile.name}님의 복용약에서 삭제할까요?`);
    if (!shouldDelete) return;

    setDeletingMedicationId(medication.id);
    try {
      await onDeleteMedication(medication.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "약 삭제 중 문제가 발생했습니다.");
    } finally {
      setDeletingMedicationId("");
    }
  }

  return (
    <>
      <article className="card profile-card">
        <div>
          <p className="eyebrow">{profileLabel}</p>
          <h2>{profile.name}</h2>
          <p className="muted">{profileSummary(profile, medications, temporaryCount)}</p>
        </div>
        <div className="profile-stats">
          <span>확정약 {confirmedCount}</span>
          <span>검토 {reviewCount}</span>
        </div>
        <ul className="medication-mini-list">
          {medications.slice(0, 4).map((medication) => (
            <li key={medication.id}>
              <span>
                <strong>{medication.productName}</strong>
                <small>{sourceLabel(medication.source)} · {medicationStatusLabel(medication)}</small>
              </span>
              {canDeleteMedication && (
                <button
                  className="text-danger-button"
                  disabled={deletingMedicationId === medication.id}
                  onClick={() => void requestDeleteMedication(medication)}
                  type="button"
                >
                  {deletingMedicationId === medication.id ? "삭제 중" : "삭제"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="profile-actions">
          {selected && <span className="profile-active-badge">현재 보고 있음</span>}
          <button
            className="ghost-button"
            onClick={() => setIsReportOpen(true)}
            type="button"
          >
            레포트 보기
          </button>
        </div>
      </article>
      {isReportOpen && (
        <div className="report-modal-backdrop" role="presentation">
          <section
            aria-label={`${profile.name} 케어 레포트`}
            aria-modal="true"
            className="report-modal-panel"
            role="dialog"
          >
            <CareReport
              medications={medications}
              canDeleteMedication={canDeleteMedication}
              onDeleteMedication={requestDeleteMedication}
              onClose={() => setIsReportOpen(false)}
              profile={profile}
              profileLabel={profileLabel}
              schedules={schedules}
            />
          </section>
        </div>
      )}
    </>
  );
}

function CareReport({
  medications,
  canDeleteMedication,
  onDeleteMedication,
  onClose,
  profile,
  profileLabel,
  schedules,
}: {
  medications: Medication[];
  canDeleteMedication: boolean;
  onDeleteMedication: (medication: Medication) => Promise<void> | void;
  onClose: () => void;
  profile: CareProfile;
  profileLabel: string;
  schedules: MedicationSchedule[];
}): ReactElement {
  return (
    <div className="profile-report">
      <div className="report-head">
        <div>
          <p className="eyebrow">Care Report</p>
          <h3>{profile.name} 복용 정보</h3>
        </div>
        <div className="report-actions">
          <button className="ghost-button modal-close-button" onClick={onClose} type="button">
            닫기
          </button>
          <button className="primary-button modal-print-button" onClick={() => window.print()} type="button">
            인쇄
          </button>
        </div>
      </div>
      <dl className="report-summary-list">
        <div>
          <dt>구분</dt>
          <dd>{profileLabel}</dd>
        </div>
        <div>
          <dt>연령대</dt>
          <dd>{profile.type === "pet" ? petAgeSummary(profile) : `${profile.ageGroup}대`}</dd>
        </div>
        <div>
          <dt>관리 메모</dt>
          <dd>{profile.notes || "등록된 메모가 없습니다."}</dd>
        </div>
      </dl>
      <div className="report-med-list">
        {medications.length ? (
          medications.map((medication) => (
            <article className="report-med-row" key={medication.id}>
              <div className="report-med-main">
                <span className="report-med-source">{sourceLabel(medication.source)} · {medicationStatusLabel(medication)}</span>
                <strong>{medication.productName}</strong>
                <span>{ingredientSummary(medication.ingredients)}</span>
              </div>
              <dl>
                <div>
                  <dt>복용기간</dt>
                  <dd>{medicationPeriodText(medication)}</dd>
                </div>
                <div>
                  <dt>주기</dt>
                  <dd>{medicationScheduleText(medication, schedules)}</dd>
                </div>
                <div>
                  <dt>지도내용</dt>
                  <dd>{medicationGuidanceText(medication)}</dd>
                </div>
              </dl>
              {canDeleteMedication && (
                <button className="danger-button report-delete-button" onClick={() => void onDeleteMedication(medication)} type="button">
                  약 삭제
                </button>
              )}
            </article>
          ))
        ) : (
          <p className="muted">아직 등록된 복용약이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function canManageProfile(
  profile: CareProfile,
  familyMembers: FamilyMember[],
  user: DemoUser,
): boolean {
  if (user.role === "admin" || user.familyRole === "owner" || user.familyRole === "manager") {
    return true;
  }

  const member = familyMembers.find((item) => item.userId === user.id);
  return profile.ownerUserId === user.id || profile.id === member?.careProfileId;
}

function profileRoleLabel(profile: CareProfile, familyMembers: FamilyMember[]): string {
  if (profile.type === "pet") return "반려동물";

  const member = familyMembers.find(
    (item) => item.userId === profile.ownerUserId || item.careProfileId === profile.id,
  );
  if (member?.role === "owner") return "가족대표";
  if (member?.role === "manager") return "가족관리자";
  return "가족구성원";
}

function profileSummary(
  profile: CareProfile,
  medications: Medication[],
  temporaryCount: number,
): string {
  const needsReview = medications.filter((medication) => medication.status === "needs_review");
  if (needsReview.length || temporaryCount) {
    return `검토 필요한 항목 ${needsReview.length + temporaryCount}건이 있습니다.`;
  }

  if (profile.type === "pet" && profile.petDetails) {
    const details = [
      profile.petDetails.age && `나이 ${profile.petDetails.age}`,
      profile.petDetails.weightKg && `몸무게 ${profile.petDetails.weightKg}kg`,
      profile.petDetails.allergies && `알러지 ${profile.petDetails.allergies}`,
      profile.petDetails.mainFood && `주요 사료 ${profile.petDetails.mainFood}`,
      profile.petDetails.forbiddenFoods && `금지 음식 ${profile.petDetails.forbiddenFoods}`,
    ]
      .filter(Boolean)
      .join(" · ");
    if (details) return details;
  }

  if (medications.length) {
    return `현재 등록 약 ${medications.length}건을 기준으로 관리 중입니다.`;
  }

  return profile.notes || "아직 등록된 약 정보가 없습니다.";
}

function petAgeSummary(profile: CareProfile): string {
  const details = profile.petDetails;
  if (!details) return "반려동물";
  return [details.age, details.birthDate && `생일 ${details.birthDate}`].filter(Boolean).join(" · ") || "반려동물";
}
