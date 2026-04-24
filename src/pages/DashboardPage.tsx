import type { ReactElement } from "react";
import { buildSafetyFindings, isPastReviewDate } from "../services/safety";
import type { CareProfile, FamilyMember, Medication, MedicationSchedule, OcrScan } from "../types";

interface DashboardPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  familyMembers: FamilyMember[];
  medications: Medication[];
  schedules: MedicationSchedule[];
  scans: OcrScan[];
  onNavigateScan: () => void;
  onNavigateProfiles: () => void;
  onNavigateReminders: () => void;
  onNavigateChat: () => void;
}

export function DashboardPage({
  careProfiles,
  currentProfile,
  medications,
  schedules,
  scans,
  onNavigateScan,
  onNavigateProfiles,
  onNavigateReminders,
  onNavigateChat,
}: DashboardPageProps): ReactElement {
  const profileMeds = medications.filter((medication) => medication.careProfileId === currentProfile.id);
  const findings = careProfiles.flatMap((profile) =>
    buildSafetyFindings(
      medications.filter((medication) => medication.careProfileId === profile.id),
      profile,
    ).map((finding) => ({ ...finding, profile })),
  );
  const reviewMeds = medications.filter((medication) => isPastReviewDate(medication));
  const todaySchedules = schedules
    .map((schedule) => {
      const medication = medications.find((item) => item.id === schedule.medicationId);
      const profile = careProfiles.find((item) => item.id === medication?.careProfileId);
      return medication && profile ? { schedule, medication, profile } : undefined;
    })
    .filter(Boolean)
    .slice(0, 6) as Array<{ schedule: MedicationSchedule; medication: Medication; profile: CareProfile }>;
  const familyProfiles = careProfiles.filter((profile) => profile.type !== "pet");
  const petProfiles = careProfiles.filter((profile) => profile.type === "pet");

  return (
    <div className="dashboard-home">
      <section className="summary-grid">
        <SummaryCard label="복용 중인 약" value={`${medications.length}개`} action="전체 보기" onClick={onNavigateProfiles} />
        <SummaryCard label="오늘 복용 예정" value={`${todaySchedules.length}개`} action="일정 보기" onClick={onNavigateReminders} />
        <SummaryCard label="주의 상호작용" value={`${findings.length}건`} action="확인하기" tone="danger" onClick={onNavigateProfiles} />
        <SummaryCard label="이번 주 리포트" value={`${Math.max(1, familyProfiles.length)}개`} action="출력하기" onClick={onNavigateProfiles} />
      </section>

      <section className="dashboard-main-grid">
        <article className="card schedule-card">
          <div className="section-heading row-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>오늘의 복용 일정</h2>
            </div>
            <button className="text-button" onClick={onNavigateReminders} type="button">전체 일정 보기</button>
          </div>
          <div className="schedule-list">
            {todaySchedules.length ? (
              todaySchedules.map(({ schedule, medication, profile }) => (
                <div className="schedule-row" key={schedule.id}>
                  <time>{schedule.timeOfDay}</time>
                  <div className="medicine-icon" aria-hidden="true">{medicineInitial(medication.productName)}</div>
                  <div>
                    <strong>{medication.productName}</strong>
                    <span>{schedule.label} · {medication.dosage || "등록 용량 확인"}</span>
                  </div>
                  <span className="owner-badge">{profile.name}</span>
                </div>
              ))
            ) : (
              <p className="muted">오늘 등록된 복용 일정이 없습니다.</p>
            )}
          </div>
          <div className="quick-action-row">
            <button className="primary-button" onClick={onNavigateScan} type="button">약 사진 등록</button>
            <button className="ghost-button" onClick={onNavigateScan} type="button">약명 검색</button>
          </div>
        </article>

        <article className="card interaction-card">
          <div className="section-heading row-heading">
            <div>
              <p className="eyebrow">Safety</p>
              <h2>주의가 필요한 상호작용</h2>
            </div>
            <strong>{findings.length}건</strong>
          </div>
          {findings.length ? (
            <div className="interaction-alert">
              <strong>{findings[0].profile.name} · {findings[0].title}</strong>
              <p>{findings[0].message}</p>
              <button className="ghost-button" onClick={onNavigateProfiles} type="button">자세히 보기</button>
            </div>
          ) : (
            <div className="safe-box">현재 등록 약 기준으로 중대한 충돌은 표시되지 않았습니다.</div>
          )}
        </article>

        <article className="card family-overview-card">
          <div className="section-heading row-heading">
            <div>
              <p className="eyebrow">Family</p>
              <h2>가족 현황</h2>
            </div>
            <span className="muted">전체 {familyProfiles.length}명</span>
          </div>
          <div className="avatar-row">
            {familyProfiles.slice(0, 5).map((profile) => (
              <div className="avatar-person" key={profile.id}>
                <span>{profile.name.slice(0, 1)}</span>
                <strong>{profile.name}</strong>
              </div>
            ))}
            <button className="avatar-add" type="button" onClick={onNavigateProfiles}>+</button>
          </div>
        </article>

        <article className="card pet-overview-card">
          <div className="section-heading row-heading">
            <div>
              <p className="eyebrow">Pets</p>
              <h2>반려동물 현황</h2>
            </div>
            <span className="muted">{petProfiles.length}마리</span>
          </div>
          {petProfiles.length ? (
            petProfiles.map((profile) => (
              <div className="pet-row" key={profile.id}>
                <span className="pet-face" aria-hidden="true">P</span>
                <div>
                  <strong>{profile.name}</strong>
                  <p>{profile.petDetails?.age || profile.notes || "건강 기록 관리 중"}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="muted">등록된 반려동물이 없습니다.</p>
          )}
        </article>
      </section>

      <section className="dashboard-lower-grid">
        <article className="card compact-card">
          <div className="section-heading row-heading">
            <div>
              <p className="eyebrow">Current</p>
              <h2>{currentProfile.name} 복용약</h2>
            </div>
            <button className="text-button" onClick={onNavigateProfiles} type="button">전체 보기</button>
          </div>
          <div className="mini-record-list">
            {profileMeds.slice(0, 5).map((medication) => (
              <div key={medication.id}>
                <span>{medication.productName}</span>
                <strong>{statusLabel(medication.status)}</strong>
              </div>
            ))}
            {!profileMeds.length && <p className="muted">등록된 복용약이 없습니다.</p>}
          </div>
        </article>

        <article className="card compact-card assistant-preview">
          <div className="section-heading">
            <p className="eyebrow">Guide</p>
            <h2>상담 준비</h2>
          </div>
          <div className="chat-bubble user">감기약을 먹어도 되는지 확인하고 싶어요.</div>
          <div className="chat-bubble">
            등록 약 기준으로 성분 중복과 주의사항을 먼저 확인합니다. 위험하거나 애매하면 약사 또는 의사 상담을 권합니다.
          </div>
          <button className="primary-button" onClick={onNavigateChat} type="button">상담 안내 열기</button>
        </article>

        <article className="card compact-card">
          <div className="section-heading row-heading">
            <div>
              <p className="eyebrow">Reports</p>
              <h2>복약 지도 리포트</h2>
            </div>
            <button className="text-button" onClick={onNavigateProfiles} type="button">전체 보기</button>
          </div>
          <div className="mini-record-list">
            {familyProfiles.slice(0, 3).map((profile) => (
              <div key={profile.id}>
                <span>{profile.name} 복약 리포트</span>
                <strong>보기</strong>
              </div>
            ))}
          </div>
          <button className="primary-button wide" onClick={onNavigateProfiles} type="button">새 리포트 생성</button>
        </article>
      </section>

      <p className="dashboard-footnote">
        장기복용 검토 {reviewMeds.length}건 · 최근 OCR 등록 {scans.length}건
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  action,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  action: string;
  tone?: "danger";
  onClick: () => void;
}): ReactElement {
  return (
    <button className={tone === "danger" ? "summary-card danger-summary" : "summary-card"} onClick={onClick} type="button">
      <span className="summary-icon" aria-hidden="true">{label.slice(0, 1)}</span>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{action}</small>
    </button>
  );
}

function statusLabel(status: Medication["status"]): string {
  if (status === "confirmed") return "확정";
  if (status === "temporary") return "임시";
  return "검토필요";
}

function medicineInitial(name: string): string {
  return name.trim().slice(0, 1) || "M";
}
