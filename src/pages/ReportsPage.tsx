import type { ReactElement } from "react";
import {
  CoreBadge,
  CoreCard,
  CoreListRow,
  CoreMenuPage,
  CoreToolbar,
} from "../components/CoreMenuScaffold";
import type { CareProfile, FamilyMember, Medication, MedicationSchedule, TemporaryMedication } from "../types";

interface ReportsPageProps {
  careProfiles: CareProfile[];
  currentProfileId: string;
  familyMembers: FamilyMember[];
  medications: Medication[];
  schedules: MedicationSchedule[];
  temporaryMedications: TemporaryMedication[];
}

const reportRows = [
  { title: "김가족님 복약 지도 리포트", date: "2024.05.24", target: "본인", status: "완료", tone: "success" as const },
  { title: "어머니 진료 전 체크 리포트", date: "2024.04.24", target: "어머니", status: "완료", tone: "success" as const },
  { title: "아버지 복용약 점검 리포트", date: "2024.03.24", target: "아버지", status: "초안", tone: "primary" as const },
  { title: "강아지 영양제 메모", date: "2024.03.12", target: "강아지", status: "검토", tone: "warning" as const },
];

export function ReportsPage({
  careProfiles,
  medications,
  temporaryMedications,
}: ReportsPageProps): ReactElement {
  return (
    <CoreMenuPage
      action={<button className="core-primary-button" type="button">새 리포트 생성</button>}
      description="복약 지도 리포트를 생성하고 다운로드하는 화면 scaffold입니다."
      eyebrow="Reports"
      summary={[
        { icon: "file", label: "전체 리포트", value: `${reportRows.length}개`, helper: "최근 생성", tone: "primary" },
        { icon: "download", label: "다운로드", value: "3회", helper: "이번 달", tone: "neutral" },
        { icon: "warning", label: "검토 포함", value: `${temporaryMedications.length || 1}건`, helper: "임시약 기준", tone: "danger" },
        { icon: "family", label: "대상", value: `${careProfiles.length || 5}명`, helper: "가족/반려동물", tone: "success" },
      ]}
      title="리포트 출력"
    >
      <div className="core-two-column">
        <CoreCard title="리포트 목록" meta="문서 icon, 상태 badge, 다운로드 action을 통일한 report list입니다.">
          <CoreToolbar searchPlaceholder="리포트 제목 또는 대상 검색" filters={["전체", "완료", "초안", "검토"]} />
          <div className="core-table-head" aria-hidden="true">
            <span />
            <span>리포트</span>
            <span>생성일</span>
            <span>대상</span>
            <span>유형</span>
            <span>상태</span>
            <span>다운로드</span>
          </div>
          {reportRows.map((row) => (
            <CoreListRow
              action={<button className="core-secondary-button" type="button">다운로드</button>}
              fields={[row.date, row.target, "복약 지도"]}
              icon="file"
              key={row.title}
              meta="PDF 문서"
              status={<CoreBadge tone={row.tone}>{row.status}</CoreBadge>}
              title={row.title}
              tone="success"
            />
          ))}
        </CoreCard>

        <CoreCard title="생성 옵션" meta="기능 연결 전 option card scaffold입니다.">
          <div className="core-option-grid">
            <article className="core-option">
              <strong>복용약 요약</strong>
              <p>등록 약 {medications.length || 7}개와 복용 주기를 포함합니다.</p>
            </article>
            <article className="core-option">
              <strong>상호작용 결과</strong>
              <p>확인 필요 항목과 상담 권장 메모를 포함합니다.</p>
            </article>
            <article className="core-option">
              <strong>가족 메모</strong>
              <p>병원 방문 전 보호자가 확인할 메모를 정리합니다.</p>
            </article>
            <article className="core-option">
              <strong>반려동물 기록</strong>
              <p>반려동물 영양제와 주의사항을 별도 섹션으로 구성합니다.</p>
            </article>
          </div>
          <button className="core-primary-button" style={{ marginTop: 18, width: "100%", justifyContent: "center" }} type="button">
            새 리포트 생성
          </button>
        </CoreCard>
      </div>
    </CoreMenuPage>
  );
}
