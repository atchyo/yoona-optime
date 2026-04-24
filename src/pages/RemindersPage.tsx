import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { isPastReviewDate } from "../services/safety";
import type { CareProfile, Medication, MedicationLog, MedicationSchedule } from "../types";

interface RemindersPageProps {
  currentProfile: CareProfile;
  logs: MedicationLog[];
  medications: Medication[];
  schedules: MedicationSchedule[];
  onDeleteSchedule: (scheduleId: string) => Promise<void> | void;
  onMarkTaken: (schedule: MedicationSchedule) => Promise<void> | void;
  onSaveSchedule: (schedule: MedicationSchedule) => Promise<void> | void;
}

interface ScheduleDraft {
  label: string;
  timeOfDay: string;
}

export function RemindersPage({
  currentProfile,
  logs,
  medications,
  onDeleteSchedule,
  onMarkTaken,
  onSaveSchedule,
  schedules,
}: RemindersPageProps): ReactElement {
  const profileMeds = useMemo(
    () => medications.filter((medication) => medication.careProfileId === currentProfile.id),
    [currentProfile.id, medications],
  );
  const scheduleByMedicationId = useMemo(() => {
    const map = new Map<string, MedicationSchedule>();
    schedules.forEach((schedule) => {
      if (!map.has(schedule.medicationId)) map.set(schedule.medicationId, schedule);
    });
    return map;
  }, [schedules]);
  const [drafts, setDrafts] = useState<Record<string, ScheduleDraft>>({});
  const [pendingScheduleId, setPendingScheduleId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const reviewMeds = profileMeds.filter((medication) => isPastReviewDate(medication));
  const profileLogs = logs
    .filter((log) => profileMeds.some((medication) => medication.id === log.medicationId))
    .slice(0, 6);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, ScheduleDraft> = {};
      profileMeds.forEach((medication) => {
        const schedule = scheduleByMedicationId.get(medication.id);
        next[medication.id] = {
          label: current[medication.id]?.label ?? schedule?.label ?? defaultScheduleLabel(medication),
          timeOfDay: current[medication.id]?.timeOfDay ?? schedule?.timeOfDay ?? "08:00",
        };
      });
      return next;
    });
  }, [profileMeds, scheduleByMedicationId]);

  function updateDraft(medicationId: string, patch: Partial<ScheduleDraft>): void {
    setStatusMessage("");
    setDrafts((current) => ({
      ...current,
      [medicationId]: {
        label: current[medicationId]?.label || "매일 복용",
        timeOfDay: current[medicationId]?.timeOfDay || "08:00",
        ...patch,
      },
    }));
  }

  async function saveSchedule(medication: Medication): Promise<void> {
    const draft = drafts[medication.id] || {
      label: defaultScheduleLabel(medication),
      timeOfDay: "08:00",
    };
    const existing = scheduleByMedicationId.get(medication.id);
    const schedule: MedicationSchedule = {
      id: existing?.id || "",
      medicationId: medication.id,
      type: "daily",
      label: draft.label.trim() || "매일 복용",
      timeOfDay: normalizeTime(draft.timeOfDay),
      nextDueAt: nextDueAtForTime(draft.timeOfDay),
      reviewAt: medication.reviewAt,
    };

    setPendingScheduleId(medication.id);
    try {
      await onSaveSchedule(schedule);
      setStatusMessage(`${medication.productName} 알림 저장 완료`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "복약 알림 저장 중 문제가 발생했습니다.");
    } finally {
      setPendingScheduleId("");
    }
  }

  async function deleteSchedule(medication: Medication): Promise<void> {
    const existing = scheduleByMedicationId.get(medication.id);
    if (!existing) {
      setStatusMessage("저장된 알림이 없습니다.");
      return;
    }

    setPendingScheduleId(medication.id);
    try {
      await onDeleteSchedule(existing.id);
      setStatusMessage(`${medication.productName} 알림 삭제 완료`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "복약 알림 삭제 중 문제가 발생했습니다.");
    } finally {
      setPendingScheduleId("");
    }
  }

  async function markTaken(medication: Medication): Promise<void> {
    const schedule =
      scheduleByMedicationId.get(medication.id) ||
      buildDraftSchedule(medication, drafts[medication.id]);

    setPendingScheduleId(medication.id);
    try {
      await onMarkTaken(schedule);
      setStatusMessage(`${medication.productName} 복용 완료 기록`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "복용 완료 기록 중 문제가 발생했습니다.");
    } finally {
      setPendingScheduleId("");
    }
  }

  return (
    <div className="reminder-page">
      <section className="card reminder-main-card">
        <div className="row-heading">
          <div>
            <p className="eyebrow">Medication Alerts</p>
            <h2>{currentProfile.name}님 복약 알림</h2>
            <p className="muted">복용 시간을 저장하고 완료 기록을 남길 수 있습니다.</p>
          </div>
          <span className="owner-badge">등록 약 {profileMeds.length}건</span>
        </div>
        {statusMessage && <p className="form-note">{statusMessage}</p>}

        <div className="reminder-table" role="table" aria-label="복약 알림 목록">
          <div className="reminder-table-head" role="row">
            <span role="columnheader">시간</span>
            <span role="columnheader">약 정보</span>
            <span role="columnheader">알림 문구</span>
            <span role="columnheader">관리</span>
          </div>
          {profileMeds.map((medication) => {
            const draft = drafts[medication.id] || {
              label: defaultScheduleLabel(medication),
              timeOfDay: "08:00",
            };
            const existing = scheduleByMedicationId.get(medication.id);
            const isPending = pendingScheduleId === medication.id;

            return (
              <div className="reminder-table-row editable-reminder-row" key={medication.id} role="row">
                <input
                  aria-label={`${medication.productName} 복용 시간`}
                  onChange={(event) => updateDraft(medication.id, { timeOfDay: event.target.value })}
                  type="time"
                  value={draft.timeOfDay}
                />
                <div>
                  <strong>{medication.productName}</strong>
                  <span>{medication.dosage || medication.ingredients[0]?.amount || "용량 미등록"}</span>
                </div>
                <input
                  aria-label={`${medication.productName} 알림 문구`}
                  onChange={(event) => updateDraft(medication.id, { label: event.target.value })}
                  placeholder="예) 아침 식후"
                  value={draft.label}
                />
                <div className="reminder-actions">
                  <button
                    className="primary-button"
                    disabled={isPending}
                    onClick={() => void saveSchedule(medication)}
                    type="button"
                  >
                    {existing ? "저장" : "알림 추가"}
                  </button>
                  <button
                    className="ghost-button"
                    disabled={isPending}
                    onClick={() => void markTaken(medication)}
                    type="button"
                  >
                    복용 완료
                  </button>
                  <button
                    className="danger-button"
                    disabled={!existing || isPending}
                    onClick={() => void deleteSchedule(medication)}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
          {!profileMeds.length && (
            <div className="empty-panel">등록된 복용약이 없습니다. 약 관리에서 먼저 약을 등록해 주세요.</div>
          )}
        </div>
      </section>

      <aside className="reminder-side">
        <section className="card compact-card">
          <p className="eyebrow">Recent Logs</p>
          <h2>최근 복용 기록</h2>
          <ul className="timeline-list">
            {profileLogs.map((log) => {
              const medication = medications.find((item) => item.id === log.medicationId);
              return (
                <li key={log.id}>
                  {medication?.productName || "삭제된 약"} · {formatTakenAt(log.takenAt)}
                </li>
              );
            })}
          </ul>
          {!profileLogs.length && <p className="muted">아직 복용 완료 기록이 없습니다.</p>}
        </section>

        <section className="card compact-card">
          <p className="eyebrow">Duration Review</p>
          <h2>장기복용 검토</h2>
          <ul className="finding-list">
            {reviewMeds.map((medication) => (
              <li className="warning-box" key={medication.id}>
                <strong>{medication.productName}</strong>
                <span>{medication.reviewAt} 이후 복용 지속 여부를 검토하세요.</span>
              </li>
            ))}
          </ul>
          {!reviewMeds.length && <p className="muted">현재 검토일이 지난 약은 없습니다.</p>}
        </section>
      </aside>
    </div>
  );
}

function buildDraftSchedule(
  medication: Medication,
  draft?: ScheduleDraft,
): MedicationSchedule {
  const timeOfDay = normalizeTime(draft?.timeOfDay || "08:00");
  return {
    id: `derived-${medication.id}`,
    medicationId: medication.id,
    type: "daily",
    label: draft?.label || defaultScheduleLabel(medication),
    timeOfDay,
    nextDueAt: nextDueAtForTime(timeOfDay),
    reviewAt: medication.reviewAt,
  };
}

function defaultScheduleLabel(medication: Medication): string {
  return medication.instructions || medication.dosage || "매일 복용";
}

function normalizeTime(value: string): string {
  const [hours = "08", minutes = "00"] = String(value || "08:00").split(":");
  return `${hours.padStart(2, "0").slice(0, 2)}:${minutes.padStart(2, "0").slice(0, 2)}`;
}

function nextDueAtForTime(timeOfDay: string): string {
  const [hours, minutes] = normalizeTime(timeOfDay).split(":").map((part) => Number(part));
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (next.getTime() < Date.now()) {
    next.setDate(next.getDate() + 1);
  }
  return next.toISOString();
}

function formatTakenAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
