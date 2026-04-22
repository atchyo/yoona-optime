import { useState } from "react";
import type { ReactElement } from "react";
import type {
  CareProfile,
  FamilyMember,
  Medication,
  MedicationSchedule,
  TemporaryMedication,
} from "../types";

interface ProfilesPageProps {
  careProfiles: CareProfile[];
  currentProfileId: string;
  familyMembers: FamilyMember[];
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => void;
  schedules: MedicationSchedule[];
  temporaryMedications: TemporaryMedication[];
  onProfileChange: (profileId: string) => void;
}

export function ProfilesPage({
  careProfiles,
  currentProfileId,
  familyMembers,
  medications,
  onDeleteMedication,
  schedules,
  temporaryMedications,
  onProfileChange,
}: ProfilesPageProps): ReactElement {
  return (
    <section className="page-grid">
      {careProfiles.map((profile) => (
        <ProfileCard
          key={profile.id}
          familyMembers={familyMembers}
          medications={medications.filter((medication) => medication.careProfileId === profile.id)}
          onDeleteMedication={onDeleteMedication}
          onProfileChange={onProfileChange}
          profile={profile}
          schedules={schedules}
          selected={currentProfileId === profile.id}
          temporaryCount={temporaryMedications.filter((medication) => medication.careProfileId === profile.id).length}
        />
      ))}
    </section>
  );
}

function ProfileCard({
  familyMembers,
  medications,
  onDeleteMedication,
  onProfileChange,
  profile,
  schedules,
  selected,
  temporaryCount,
}: {
  familyMembers: FamilyMember[];
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => void;
  onProfileChange: (profileId: string) => void;
  profile: CareProfile;
  schedules: MedicationSchedule[];
  selected: boolean;
  temporaryCount: number;
}): ReactElement {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const confirmedCount = medications.filter((medication) => medication.status === "confirmed").length;
  const reviewCount = medications.filter((medication) => medication.status === "needs_review").length + temporaryCount;
  const profileLabel = profileRoleLabel(profile, familyMembers);

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
        <ul className="tag-list">
          {medications.slice(0, 4).map((medication) => (
            <li key={medication.id}>{medication.productName}</li>
          ))}
        </ul>
        <div className="profile-actions">
          <button
            className={selected ? "primary-button" : "ghost-button"}
            onClick={() => onProfileChange(profile.id)}
            type="button"
          >
            {selected ? "확인 중" : "이 프로필 보기"}
          </button>
          <button
            className="ghost-button"
            onClick={() => setIsReportOpen(true)}
            type="button"
          >
            레포트 출력
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
              onDeleteMedication={onDeleteMedication}
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
  onDeleteMedication,
  onClose,
  profile,
  profileLabel,
  schedules,
}: {
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => void;
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
              <div>
                <strong>{medication.productName}</strong>
                <span>{medication.ingredients.map(formatIngredient).join(", ") || "성분 미등록"}</span>
              </div>
              <dl>
                <div>
                  <dt>복용기간</dt>
                  <dd>{periodText(medication)}</dd>
                </div>
                <div>
                  <dt>주기</dt>
                  <dd>{scheduleText(medication, schedules)}</dd>
                </div>
              </dl>
              <button className="danger-button report-delete-button" onClick={() => onDeleteMedication(medication.id)} type="button">
                약 삭제
              </button>
            </article>
          ))
        ) : (
          <p className="muted">아직 등록된 복용약이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function profileRoleLabel(profile: CareProfile, familyMembers: FamilyMember[]): string {
  if (profile.type === "pet") return "반려동물";

  const member = familyMembers.find((item) => item.userId === profile.ownerUserId);
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

function formatIngredient(ingredient: Medication["ingredients"][number]): string {
  return ingredient.amount ? `${ingredient.name} ${ingredient.amount}` : ingredient.name;
}

function periodText(medication: Medication): string {
  const start = medication.startedAt || "시작일 미등록";
  return medication.reviewAt
    ? `복용 시작 ${start} · 검토일 ${medication.reviewAt}`
    : `${start}부터 복용 기록`;
}

function scheduleText(medication: Medication, schedules: MedicationSchedule[]): string {
  const medicationSchedules = schedules.filter((schedule) => schedule.medicationId === medication.id);
  if (medicationSchedules.length) {
    return medicationSchedules
      .map((schedule) => `${schedule.timeOfDay} ${schedule.label}`)
      .join(", ");
  }

  return medication.instructions || medication.dosage || "복용 주기 미등록";
}

function petAgeSummary(profile: CareProfile): string {
  const details = profile.petDetails;
  if (!details) return "반려동물";
  return [details.age, details.birthDate && `생일 ${details.birthDate}`].filter(Boolean).join(" · ") || "반려동물";
}
