import type { ReactElement } from "react";
import {
  CoreBadge,
  CoreCard,
  CoreListRow,
  CoreMenuPage,
  CoreToolbar,
} from "../components/CoreMenuScaffold";
import type { CareProfile, Medication, MedicationLog, MedicationSchedule } from "../types";

interface MedicationHistoryPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  logs: MedicationLog[];
  medications: Medication[];
  onMarkTaken: (schedule: MedicationSchedule) => Promise<void> | void;
  schedules: MedicationSchedule[];
}

const historyRows = [
  { date: "5.24 (금)", time: "08:00", medicine: "고혈압약", target: "본인", status: "완료", tone: "success" as const, memo: "식후 복용" },
  { date: "5.24 (금)", time: "09:00", medicine: "비타민D 1000IU", target: "본인", status: "완료", tone: "success" as const, memo: "아침 식후" },
  { date: "5.24 (금)", time: "12:00", medicine: "오메가3", target: "본인", status: "예정", tone: "primary" as const, memo: "점심 식후" },
  { date: "5.23 (목)", time: "18:00", medicine: "종합비타민", target: "어머니", status: "완료", tone: "success" as const, memo: "저녁 식후" },
  { date: "5.23 (목)", time: "21:00", medicine: "마그네슘", target: "아버지", status: "누락", tone: "danger" as const, memo: "취침 전 확인 필요" },
];

export function MedicationHistoryPage({
  currentProfile,
  logs,
  medications,
}: MedicationHistoryPageProps): ReactElement {
  const completedCount = logs.length || historyRows.filter((row) => row.status === "완료").length;
  const plannedCount = historyRows.filter((row) => row.status === "예정").length;
  const missedCount = historyRows.filter((row) => row.status === "누락").length;

  return (
    <CoreMenuPage
      action={<button className="core-secondary-button" type="button">기록 내보내기</button>}
      description={`${currentProfile.name}님과 가족의 복용 완료, 예정, 누락 기록을 날짜별로 확인합니다.`}
      eyebrow="Medication Log"
      summary={[
        { icon: "check", label: "완료 기록", value: `${completedCount}건`, helper: "최근 7일", tone: "success" },
        { icon: "clock", label: "예정 기록", value: `${plannedCount}건`, helper: "오늘 남은 일정", tone: "primary" },
        { icon: "warning", label: "누락 확인", value: `${missedCount}건`, helper: "보호자 확인", tone: "danger" },
        { icon: "pill", label: "기록 대상", value: `${medications.length || 7}개`, helper: "등록 약 기준", tone: "neutral" },
      ]}
      title="복용 기록"
    >
      <CoreCard title="날짜별 복용 기록" meta="필터와 그룹 리스트를 갖춘 복용 기록 화면 scaffold입니다.">
        <CoreToolbar searchPlaceholder="약 이름 또는 메모 검색" filters={["오늘", "이번 주", "완료", "예정", "누락"]}>
          <button className="core-secondary-button" type="button">가족 필터</button>
        </CoreToolbar>
        <div className="core-table-head" aria-hidden="true">
          <span />
          <span>시간 / 약</span>
          <span>대상</span>
          <span>메모</span>
          <span>날짜</span>
          <span>상태</span>
          <span>관리</span>
        </div>
        {historyRows.map((row) => (
          <CoreListRow
            action={<button className="core-secondary-button" type="button">보기</button>}
            eyebrow={row.time}
            fields={[row.target, row.memo, row.date]}
            icon="calendar"
            key={`${row.date}-${row.time}-${row.medicine}`}
            meta="복용 기록"
            status={<CoreBadge tone={row.tone}>{row.status}</CoreBadge>}
            title={row.medicine}
            tone={row.tone}
          />
        ))}
      </CoreCard>
    </CoreMenuPage>
  );
}
