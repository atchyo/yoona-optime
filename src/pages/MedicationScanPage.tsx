import type { ReactElement } from "react";
import {
  CoreBadge,
  CoreCard,
  CoreEmptyState,
  CoreListRow,
  CoreMenuPage,
  CoreToolbar,
} from "../components/CoreMenuScaffold";
import type {
  CareProfile,
  Medication,
  OcrScan,
  TemporaryMedication,
} from "../types";
import { ingredientSummary } from "../utils/medicationDisplay";

interface MedicationScanPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  medications: Medication[];
  onDeleteMedication: (medicationId: string) => Promise<void> | void;
  onConfirmMedication: (medication: Medication, scan: OcrScan) => Promise<void> | void;
  onCreateTemporaryMedication: (medication: TemporaryMedication, scan: OcrScan) => Promise<void> | void;
}

const medicationRows = [
  {
    name: "고혈압약 (암로디핀 5mg)",
    target: "본인",
    cadence: "매일 아침",
    lastTaken: "오늘 08:00",
    status: "복용 중",
    tone: "success" as const,
    meta: "암로디핀 5mg",
  },
  {
    name: "비타민D 1000IU",
    target: "본인",
    cadence: "매일 아침",
    lastTaken: "오늘 09:00",
    status: "복용 중",
    tone: "success" as const,
    meta: "영양제 · 식후",
  },
  {
    name: "오메가3",
    target: "본인",
    cadence: "매일 점심",
    lastTaken: "어제 12:10",
    status: "복용 중",
    tone: "success" as const,
    meta: "1캡슐 식후",
  },
  {
    name: "감기약",
    target: "본인",
    cadence: "필요 시",
    lastTaken: "검토 필요",
    status: "주의 필요",
    tone: "danger" as const,
    meta: "상호작용 확인 권장",
  },
];

export function MedicationScanPage({
  careProfiles,
  currentProfile,
  medications,
}: MedicationScanPageProps): ReactElement {
  const rows = medications.length
    ? medications.slice(0, 6).map((medication, index) => ({
        name: medication.productName,
        target: careProfiles.find((profile) => profile.id === medication.careProfileId)?.name || currentProfile.name,
        cadence: medication.instructions || medication.dosage || "복용 정보 미등록",
        lastTaken: index < 2 ? "오늘" : "최근 7일",
        status: medication.status === "confirmed" ? "복용 중" : "주의 필요",
        tone: medication.status === "confirmed" ? ("success" as const) : ("danger" as const),
        meta: ingredientSummary(medication.ingredients) || "성분 미등록",
      }))
    : medicationRows;
  const warningCount = rows.filter((row) => row.tone === "danger").length;

  return (
    <CoreMenuPage
      action={<button className="core-primary-button" type="button">약 추가</button>}
      description="가족별 복용약과 영양제를 검색하고 상태를 빠르게 확인하는 관리 화면입니다."
      eyebrow="Medication"
      summary={[
        { icon: "pill", label: "등록된 약", value: `${rows.length}개`, helper: "전체 관리 목록", tone: "primary" },
        { icon: "check", label: "복용 중", value: `${rows.length - warningCount}개`, helper: "활성 상태", tone: "success" },
        { icon: "clock", label: "복용 중지", value: "1개", helper: "최근 정리", tone: "neutral" },
        { icon: "warning", label: "주의 필요", value: `${warningCount || 1}건`, helper: "상호작용 확인", tone: "danger" },
      ]}
      title="약 관리"
    >
      <CoreCard title="등록 약 목록" meta="Dashboard v2 리스트 패턴을 적용한 약 관리 scaffold입니다.">
        <CoreToolbar searchPlaceholder="약 이름, 성분, 복용법 검색" filters={["전체", "복용 중", "복용 중지", "주의 필요"]} />
        <div className="core-table-head" aria-hidden="true">
          <span />
          <span>약 정보</span>
          <span>복용 대상</span>
          <span>복용 주기</span>
          <span>최근 복용</span>
          <span>상태</span>
          <span>관리</span>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <CoreListRow
              action={<button className="core-secondary-button" type="button">관리</button>}
              fields={[row.target, row.cadence, row.lastTaken]}
              key={`${row.name}-${row.target}`}
              meta={row.meta}
              status={<CoreBadge tone={row.tone}>{row.status}</CoreBadge>}
              title={row.name}
              tone={row.tone === "danger" ? "danger" : "primary"}
            />
          ))
        ) : (
          <CoreEmptyState
            action={<button className="core-primary-button" type="button">첫 약 등록</button>}
            description="검색 또는 사진 OCR로 첫 복용약을 등록할 수 있습니다."
            icon="pill"
            title="등록된 약이 없습니다"
          />
        )}
      </CoreCard>
    </CoreMenuPage>
  );
}
