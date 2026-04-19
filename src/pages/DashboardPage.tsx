import type { ReactElement } from "react";
import { buildSafetyFindings, isPastReviewDate } from "../services/safety";
import type { CareProfile, Medication, MedicationSchedule, OcrScan } from "../types";

interface DashboardPageProps {
  currentProfile: CareProfile;
  medications: Medication[];
  schedules: MedicationSchedule[];
  scans: OcrScan[];
  onNavigateScan: () => void;
}

export function DashboardPage({
  currentProfile,
  medications,
  schedules,
  scans,
  onNavigateScan,
}: DashboardPageProps): ReactElement {
  const profileMeds = medications.filter((medication) => medication.careProfileId === currentProfile.id);
  const findings = buildSafetyFindings(profileMeds, currentProfile);
  const reviewMeds = profileMeds.filter((medication) => isPastReviewDate(medication));
  const todaySchedules = schedules.filter((schedule) =>
    profileMeds.some((medication) => medication.id === schedule.medicationId),
  );

  return (
    <div className="dashboard-layout">
      <section className="workspace-column">
        <div className="hero-panel card">
          <p className="eyebrow">오늘의 관리 대상</p>
          <h2>{currentProfile.name}님의 복용 상태</h2>
          <p className="muted">
            약 사진 등록, 공식 DB 후보 확인, 복용 주기와 장기복용 검토를 한 흐름으로 관리합니다.
          </p>
          <button className="primary-button" onClick={onNavigateScan} type="button">
            약 사진 등록
          </button>
        </div>

        <section className="card">
          <div className="section-heading">
            <p className="eyebrow">Current Medications</p>
            <h2>현재 복용약</h2>
          </div>
          <div className="med-list">
            {profileMeds.map((medication) => (
              <article className="med-item" key={medication.id}>
                <div>
                  <strong>{medication.productName}</strong>
                  <p>{medication.ingredients.map((ingredient) => `${ingredient.name} ${ingredient.amount || ""}`).join(", ")}</p>
                </div>
                <span className={`status-pill ${medication.status}`}>{statusLabel(medication.status)}</span>
              </article>
            ))}
          </div>
        </section>
      </section>

      <aside className="support-column">
        <section className="card compact-card">
          <p className="eyebrow">Today</p>
          <h2>앱내 리마인더</h2>
          <ol className="timeline-list">
            {todaySchedules.map((schedule) => (
              <li key={schedule.id}>
                <strong>{schedule.timeOfDay}</strong> {schedule.label}
              </li>
            ))}
          </ol>
        </section>

        <section className="card compact-card">
          <p className="eyebrow">Safety</p>
          <h2>주의 조합</h2>
          <ul className="finding-list">
            {findings.length ? (
              findings.map((finding) => (
                <li className={finding.level === "고위험" ? "danger-box" : "warning-box"} key={finding.id}>
                  <strong>{finding.title}</strong>
                  <span>{finding.message}</span>
                </li>
              ))
            ) : (
              <li className="safe-box">현재 등록 약 기준으로 중대한 충돌은 표시되지 않았습니다.</li>
            )}
          </ul>
        </section>

        <section className="card compact-card">
          <p className="eyebrow">Review</p>
          <h2>검토 필요</h2>
          <p className="muted">
            장기복용 검토 {reviewMeds.length}건 · 최근 OCR 등록 {scans.length}건
          </p>
        </section>
      </aside>
    </div>
  );
}

function statusLabel(status: Medication["status"]): string {
  if (status === "confirmed") return "확정";
  if (status === "temporary") return "임시";
  return "검토필요";
}
