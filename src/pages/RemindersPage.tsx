import type { ReactElement } from "react";
import { isPastReviewDate } from "../services/safety";
import type { CareProfile, Medication, MedicationSchedule } from "../types";

interface RemindersPageProps {
  currentProfile: CareProfile;
  medications: Medication[];
  schedules: MedicationSchedule[];
  onMarkTaken: (scheduleId: string) => void;
}

export function RemindersPage({
  currentProfile,
  medications,
  schedules,
  onMarkTaken,
}: RemindersPageProps): ReactElement {
  const profileMeds = medications.filter((medication) => medication.careProfileId === currentProfile.id);

  return (
    <div className="dashboard-layout">
      <section className="workspace-column">
        <section className="card">
          <div className="section-heading">
            <p className="eyebrow">In-app Reminders</p>
            <h2>{currentProfile.name}님의 복용 리마인더</h2>
          </div>
          <div className="med-list">
            {schedules
              .filter((schedule) => profileMeds.some((medication) => medication.id === schedule.medicationId))
              .map((schedule) => {
                const medication = profileMeds.find((item) => item.id === schedule.medicationId);
                return (
                  <article className="med-item" key={schedule.id}>
                    <div>
                      <strong>{schedule.timeOfDay} · {schedule.label}</strong>
                      <p>{medication?.productName}</p>
                    </div>
                    <button className="primary-button" onClick={() => onMarkTaken(schedule.id)} type="button">
                      복용 완료
                    </button>
                  </article>
                );
              })}
          </div>
        </section>
      </section>
      <aside className="support-column">
        <section className="card compact-card">
          <p className="eyebrow">Duration Review</p>
          <h2>장기복용 검토</h2>
          <ul className="finding-list">
            {profileMeds.filter((medication) => isPastReviewDate(medication)).map((medication) => (
              <li className="warning-box" key={medication.id}>
                <strong>{medication.productName}</strong>
                <span>{medication.reviewAt} 이후 복용 지속 여부를 검토하세요.</span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
