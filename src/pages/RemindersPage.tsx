import type { ReactElement } from "react";
import {
  CoreBadge,
  CoreCard,
  CoreListRow,
  CoreMenuPage,
  CoreToggle,
} from "../components/CoreMenuScaffold";
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

const reminderRows = [
  { time: "08:00", medicine: "고혈압약", target: "본인", repeat: "매일", channel: "푸시 알림", enabled: true },
  { time: "09:00", medicine: "비타민D 1000IU", target: "본인", repeat: "매일", channel: "푸시 알림", enabled: true },
  { time: "12:00", medicine: "오메가3", target: "본인", repeat: "매일", channel: "앱 알림", enabled: true },
  { time: "18:00", medicine: "종합비타민", target: "어머니", repeat: "평일", channel: "보호자 알림", enabled: true },
  { time: "21:00", medicine: "마그네슘", target: "아버지", repeat: "매일", channel: "앱 알림", enabled: false },
];

export function RemindersPage({
  currentProfile,
  medications,
  schedules,
}: RemindersPageProps): ReactElement {
  return (
    <CoreMenuPage
      action={<button className="core-primary-button" type="button">새 알림 추가</button>}
      description={`${currentProfile.name}님 기준 복약 시간, 반복 주기, 알림 채널을 관리합니다.`}
      eyebrow="Medication Reminder"
      summary={[
        { icon: "bell", label: "오늘 알림", value: `${schedules.length || 5}개`, helper: "예정된 복용", tone: "primary" },
        { icon: "clock", label: "다음 알림", value: "12:00", helper: "오메가3", tone: "neutral" },
        { icon: "check", label: "활성 알림", value: "4개", helper: "푸시 사용", tone: "success" },
        { icon: "warning", label: "검토 필요", value: "1건", helper: "시간 미확인", tone: "danger" },
      ]}
      title="복약 알림"
    >
      <div className="core-two-column">
        <CoreCard title="시간대별 알림" meta="Dashboard v2 schedule row 밀도를 유지한 reminder scaffold입니다.">
          <div className="core-table-head" aria-hidden="true">
            <span />
            <span>시간 / 약</span>
            <span>대상</span>
            <span>반복</span>
            <span>채널</span>
            <span>상태</span>
            <span>사용</span>
          </div>
          {reminderRows.map((row) => (
            <CoreListRow
              action={<CoreToggle checked={row.enabled} />}
              eyebrow={row.time}
              fields={[row.target, row.repeat, row.channel]}
              icon="bell"
              key={`${row.time}-${row.medicine}`}
              meta={row.enabled ? "알림 사용 중" : "일시 중지"}
              status={<CoreBadge tone={row.enabled ? "success" : "neutral"}>{row.enabled ? "ON" : "OFF"}</CoreBadge>}
              title={row.medicine}
              tone={row.enabled ? "primary" : "neutral"}
            />
          ))}
        </CoreCard>
        <div className="core-menu-page">
          <CoreCard title="알림 설정" meta="기능 로직 없이 UI scaffold만 배치했습니다.">
            <div className="core-option-grid">
              <article className="core-option">
                <strong>전체 알림</strong>
                <p>가족 복약 알림을 한 번에 켜고 끄는 설정 영역입니다.</p>
              </article>
              <article className="core-option">
                <strong>보호자 알림</strong>
                <p>복용 누락 시 가족 대표에게 알려주는 설정 카드입니다.</p>
              </article>
              <article className="core-option">
                <strong>조용한 시간</strong>
                <p>야간에는 긴급 알림만 표시하도록 예약할 수 있습니다.</p>
              </article>
              <article className="core-option">
                <strong>등록 약 기준</strong>
                <p>현재 등록 약 {medications.length || 7}개를 기준으로 알림을 구성합니다.</p>
              </article>
            </div>
          </CoreCard>
        </div>
      </div>
    </CoreMenuPage>
  );
}
