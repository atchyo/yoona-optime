import type { ReactElement } from "react";
import {
  CoreBadge,
  CoreCard,
  CoreChip,
  CoreListRow,
  CoreMenuPage,
  CoreToolbar,
} from "../components/CoreMenuScaffold";
import type { CareProfile, Medication } from "../types";

interface SafetyCheckPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  medications: Medication[];
}

const selectedChips = ["고혈압약", "감기약", "오메가3"];
const safetyRows = [
  {
    title: "고혈압약 + 감기약",
    level: "확인 필요",
    tone: "danger" as const,
    message: "일부 감기약 성분은 혈압 관리에 영향을 줄 수 있어 약사 상담을 권장합니다.",
    target: "본인",
    action: "자세히",
  },
  {
    title: "오메가3 + 종합비타민",
    level: "주의",
    tone: "warning" as const,
    message: "성분 중복 가능성을 확인하고 제품 라벨을 비교해 주세요.",
    target: "본인",
    action: "확인",
  },
  {
    title: "비타민D + 마그네슘",
    level: "참고",
    tone: "success" as const,
    message: "현재 예시 기준에서는 중대한 충돌로 표시되지 않습니다.",
    target: "가족",
    action: "보기",
  },
];

export function SafetyCheckPage({
  currentProfile,
  medications,
}: SafetyCheckPageProps): ReactElement {
  return (
    <CoreMenuPage
      action={<button className="core-primary-button" type="button">검사 실행</button>}
      description={`${currentProfile.name}님에게 등록된 약 조합을 바탕으로 확인 필요 항목을 보여주는 mock 결과 화면입니다.`}
      eyebrow="Interaction Check"
      summary={[
        { icon: "warning", label: "확인 필요", value: "1건", helper: "상담 권장", tone: "danger" },
        { icon: "shield", label: "주의", value: "1건", helper: "성분 확인", tone: "warning" },
        { icon: "check", label: "안전", value: "3건", helper: "중대한 충돌 없음", tone: "success" },
        { icon: "pill", label: "검사 대상", value: `${medications.length || 7}개`, helper: "등록 약 기준", tone: "neutral" },
      ]}
      title="상호작용 체크"
    >
      <CoreCard title="약 조합 선택" meta="실제 의학 판단 로직 없이 Dashboard v2 warning/card 패턴만 적용했습니다.">
        <CoreToolbar searchPlaceholder="약 이름 또는 성분을 검색해 추가" filters={["전체", "처방약", "영양제", "감기약"]} />
        <div className="core-chip-list">
          {selectedChips.map((chip) => <CoreChip key={chip}>{chip}</CoreChip>)}
        </div>
      </CoreCard>

      <div className="core-two-column">
        <CoreCard title="검사 결과" meta="주의 문구는 단정 대신 확인 필요와 상담 권장 톤을 사용합니다.">
          <div className="core-table-head" aria-hidden="true">
            <span />
            <span>조합</span>
            <span>대상</span>
            <span>설명</span>
            <span>분류</span>
            <span>상태</span>
            <span>관리</span>
          </div>
          {safetyRows.map((row) => (
            <CoreListRow
              action={<button className={row.tone === "danger" ? "core-danger-button" : "core-secondary-button"} type="button">{row.action}</button>}
              fields={[row.target, row.message, row.level]}
              icon={row.tone === "danger" ? "warning" : "shield"}
              key={row.title}
              meta="상담 전 확인 자료"
              status={<CoreBadge tone={row.tone}>{row.level}</CoreBadge>}
              title={row.title}
              tone={row.tone}
            />
          ))}
        </CoreCard>
        <CoreCard title="안내" meta="상호작용 체크 화면의 보조 패널입니다.">
          <div className="core-warning-card">
            <strong>의료 판단을 대신하지 않습니다</strong>
            <p>표시된 결과는 상담 준비를 돕는 일반 정보입니다. 복용 변경이나 중단은 의료진 또는 약사와 상담해 주세요.</p>
          </div>
          <div className="core-option-grid" style={{ marginTop: 14 }}>
            <article className="core-option">
              <strong>약사 상담 CTA</strong>
              <p>주의 조합이 있을 때 상담으로 이어지는 위치입니다.</p>
            </article>
            <article className="core-option">
              <strong>검사 기록</strong>
              <p>최근 확인한 조합과 결과 요약을 보여줍니다.</p>
            </article>
          </div>
        </CoreCard>
      </div>
    </CoreMenuPage>
  );
}
