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
  const mobileReminderItems = profileMeds.slice(0, 4);
  const nextReminderMedication = mobileReminderItems[2] || mobileReminderItems[0];
  const nextReminderSchedule = nextReminderMedication
    ? scheduleByMedicationId.get(nextReminderMedication.id)
    : undefined;
  const nextReminderTime = nextReminderSchedule?.timeOfDay || "12:00";
  const nextReminderName = nextReminderMedication ? compactMedicationName(nextReminderMedication.productName) : "등록된 약 없음";

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

  async function saveAllSchedules(): Promise<void> {
    setStatusMessage("");
    for (const medication of profileMeds) {
      await saveSchedule(medication);
    }
  }

  return (
    <>
      <div className="mobile-reminder-reference" aria-label="모바일 복약 알림">
        <section className="mobile-reminder-today card">
          <div>
            <h2>오늘 알림</h2>
            <strong>
              다음 알림: {nextReminderTime} {nextReminderName}
            </strong>
          </div>
          <label className="toggle-switch mobile-reminder-master">
            <input defaultChecked type="checkbox" />
            <span />
          </label>
          <p>전체 알림 사용</p>
        </section>

        <section className="mobile-reminder-preview">
          <div className="mobile-reminder-clock">
            <strong>{nextReminderTime}</strong>
            <span>오늘</span>
          </div>
          <div className="mobile-reminder-toast">
            <div>
              <span>Opti-Me</span>
              <strong>복약 시간이에요!</strong>
              <p>
                {nextReminderMedication
                  ? `${nextReminderName} ${nextReminderMedication.dosage || "1회분"}을 복용하세요.`
                  : "약 관리에서 알림을 설정해 주세요."}
              </p>
            </div>
            <button type="button">확인</button>
          </div>
        </section>

        <section className="mobile-reminder-list card">
          <h2>알림 목록</h2>
          <div className="mobile-reminder-items">
            {mobileReminderItems.map((medication, index) => {
              const schedule = scheduleByMedicationId.get(medication.id);
              return (
                <article className="mobile-reminder-item" key={medication.id}>
                  <strong>{schedule?.timeOfDay || fallbackTime(index)}</strong>
                  <div>
                    <b>{compactMedicationName(medication.productName)}</b>
                    <span>{currentProfile.name} · 푸시 알림</span>
                  </div>
                  <label className="toggle-switch">
                    <input defaultChecked={Boolean(schedule)} type="checkbox" />
                    <span />
                  </label>
                </article>
              );
            })}
            {!mobileReminderItems.length && <p className="empty-panel">알림을 만들 약이 없습니다.</p>}
          </div>
        </section>
      </div>

      <div className="reminder-page">
      <section className="card reminder-main-card">
        <div className="row-heading">
          <div>
            <h2>복약 알림</h2>
            <p className="muted">약 복용 시간을 설정하고 알림을 관리할 수 있습니다.</p>
          </div>
          <label className="toggle-switch desktop-reminder-master">
            <input defaultChecked type="checkbox" />
            <span />
          </label>
        </div>
        {statusMessage && <p className="form-note">{statusMessage}</p>}

        <div className="reminder-table" role="table" aria-label="복약 알림 목록">
          <div className="reminder-table-head" role="row">
            <span role="columnheader">시간</span>
            <span role="columnheader">약 정보</span>
            <span role="columnheader">복용 대상</span>
            <span role="columnheader">반복</span>
            <span role="columnheader">알림 방식</span>
            <span role="columnheader">상태</span>
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
                  className="reminder-time-input"
                  onChange={(event) => updateDraft(medication.id, { timeOfDay: event.target.value })}
                  type="time"
                  value={draft.timeOfDay}
                />
                <div>
                  <strong>{medication.productName}</strong>
                  <span>{medication.dosage || medication.ingredients[0]?.amount || "용량 미등록"}</span>
                </div>
                <span>{currentProfile.name}</span>
                <span>매일</span>
                <input
                  aria-label={`${medication.productName} 알림 문구`}
                  className="reminder-label-input"
                  onChange={(event) => updateDraft(medication.id, { label: event.target.value })}
                  placeholder="푸시 알림"
                  value={draft.label}
                />
                <label className="toggle-switch reminder-row-toggle">
                  <input
                    checked={Boolean(existing)}
                    disabled={isPending}
                    onChange={(event) => {
                      if (event.target.checked) {
                        void saveSchedule(medication);
                      } else {
                        void deleteSchedule(medication);
                      }
                    }}
                    type="checkbox"
                  />
                  <span />
                </label>
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
          <p className="eyebrow">Alert Settings</p>
          <h2>알림 설정</h2>
          <label>
            알림 사전
            <select defaultValue="10">
              <option value="0">정시 알림</option>
              <option value="10">10분 전</option>
              <option value="30">30분 전</option>
            </select>
          </label>
          <div className="reminder-check-list">
            <label><input defaultChecked type="checkbox" /> 푸시 알림</label>
            <label><input defaultChecked type="checkbox" /> 이메일</label>
            <label><input type="checkbox" /> SMS</label>
          </div>
          <label>
            조용 시간
            <div className="quiet-time-row">
              <input defaultValue="22:00" type="time" />
              <input defaultValue="07:00" type="time" />
            </div>
          </label>
          <p className="muted">이 시간에는 알림을 보내지 않습니다.</p>
          <button className="primary-button wide" onClick={() => void saveAllSchedules()} type="button">저장</button>
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

        <section className="card compact-card recent-log-card">
          <p className="eyebrow">Recent Logs</p>
          <h2>최근 기록</h2>
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
      </aside>
      </div>
    </>
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

function fallbackTime(index: number): string {
  return ["08:00", "09:00", "12:00", "18:00", "21:00"][index] || "08:00";
}

function compactMedicationName(productName: string): string {
  const normalized = productName.trim();
  if (normalized.includes("타이레놀")) return "타이레놀";
  if (normalized.includes("오메가3") || normalized.toLocaleLowerCase("ko-KR").includes("omega-3")) return "오메가3";
  if (normalized.includes("비타민D")) return "비타민D";
  if (normalized.includes("종합비타민")) return "종합비타민";
  if (normalized.includes("마그네슘")) return "마그네슘";
  const withoutParentheses = normalized.replace(/\([^)]*\)/g, "").trim();
  return withoutParentheses.length > 12 ? `${withoutParentheses.slice(0, 12)}...` : withoutParentheses;
}
