import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { buildSafetyFindings } from "../services/safety";
import type { CareProfile, FamilyMember, Medication, MedicationSchedule, TemporaryMedication } from "../types";
import {
  ingredientSummary,
  medicationGuidanceText,
  medicationPeriodText,
  medicationScheduleText,
  medicationStatusLabel,
  sourceLabel,
} from "../utils/medicationDisplay";

interface ReportsPageProps {
  careProfiles: CareProfile[];
  currentProfileId: string;
  familyMembers: FamilyMember[];
  medications: Medication[];
  schedules: MedicationSchedule[];
  temporaryMedications: TemporaryMedication[];
}

type ReportKind = "medication" | "visit" | "supplement";

const reportKinds: Array<{ id: ReportKind; title: string; description: string }> = [
  {
    id: "medication",
    title: "복약 지도 리포트",
    description: "현재 복용약, 성분, 주기, 주의사항을 병원 방문용으로 정리합니다.",
  },
  {
    id: "visit",
    title: "진료 전 체크 리포트",
    description: "복용 중인 약과 최근 검토 항목을 간호사에게 바로 보여줄 수 있게 정리합니다.",
  },
  {
    id: "supplement",
    title: "영양제 점검 리포트",
    description: "건강기능식품과 처방약 조합, 장기복용 검토 항목을 중심으로 정리합니다.",
  },
];

export function ReportsPage({
  careProfiles,
  currentProfileId,
  familyMembers,
  medications,
  schedules,
  temporaryMedications,
}: ReportsPageProps): ReactElement {
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfileId);
  const [reportKind, setReportKind] = useState<ReportKind>("medication");

  useEffect(() => {
    if (careProfiles.some((profile) => profile.id === currentProfileId)) {
      setSelectedProfileId(currentProfileId);
    }
  }, [careProfiles, currentProfileId]);

  const selectedProfile =
    careProfiles.find((profile) => profile.id === selectedProfileId) || careProfiles[0];
  const selectedMedications = useMemo(
    () => medications.filter((medication) => medication.careProfileId === selectedProfile?.id),
    [medications, selectedProfile?.id],
  );
  const findings = selectedProfile ? buildSafetyFindings(selectedMedications, selectedProfile) : [];
  const temporaryCount = temporaryMedications.filter(
    (medication) => medication.careProfileId === selectedProfile?.id,
  ).length;
  const reportTitle =
    reportKinds.find((kind) => kind.id === reportKind)?.title || reportKinds[0].title;

  return (
    <div className="reports-page">
      <aside className="card report-type-panel">
        <p className="eyebrow">Report Output</p>
        <h2>리포트 종류</h2>
        <div className="report-type-list">
          {reportKinds.map((kind) => (
            <button
              className={kind.id === reportKind ? "report-type-button active" : "report-type-button"}
              key={kind.id}
              onClick={() => setReportKind(kind.id)}
              type="button"
            >
              <strong>{kind.title}</strong>
              <span>{kind.description}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="card report-preview-card">
        <div className="report-page-toolbar">
          <div>
            <p className="eyebrow">Preview</p>
            <h2>{reportTitle}</h2>
          </div>
          <div className="report-control-row">
            <select
              aria-label="리포트 대상"
              onChange={(event) => setSelectedProfileId(event.target.value)}
              value={selectedProfile?.id || ""}
            >
              {careProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <button className="ghost-button" onClick={() => window.print()} type="button">
              인쇄
            </button>
          </div>
        </div>

        {selectedProfile ? (
          <article className="printable-report">
            <header>
              <div>
                <span>Opti-Me</span>
                <h3>{selectedProfile.name} 복약 지도 리포트</h3>
              </div>
              <time>{new Date().toLocaleDateString("ko-KR")}</time>
            </header>

            <dl className="report-summary-list">
              <div>
                <dt>구분</dt>
                <dd>{profileRoleLabel(selectedProfile, familyMembers)}</dd>
              </div>
              <div>
                <dt>등록 약</dt>
                <dd>{selectedMedications.length}건</dd>
              </div>
              <div>
                <dt>검토 필요</dt>
                <dd>{findings.length + temporaryCount}건</dd>
              </div>
              <div>
                <dt>메모</dt>
                <dd>{selectedProfile.notes || "등록된 메모가 없습니다."}</dd>
              </div>
            </dl>

            <section>
              <h4>복용약 정보</h4>
              <div className="report-medication-cards">
                {selectedMedications.map((medication) => (
                  <article className="report-medication-card" key={medication.id}>
                    <div className="report-medication-title">
                      <span>{sourceLabel(medication.source)} · {medicationStatusLabel(medication)}</span>
                      <strong>{medication.productName}</strong>
                    </div>
                    <dl>
                      <div>
                        <dt>성분</dt>
                        <dd>{ingredientSummary(medication.ingredients)}</dd>
                      </div>
                      <div>
                        <dt>복용기간</dt>
                        <dd>{medicationPeriodText(medication)}</dd>
                      </div>
                      <div>
                        <dt>주기</dt>
                        <dd>{medicationScheduleText(medication, schedules)}</dd>
                      </div>
                      <div className="report-medication-wide">
                        <dt>복약 지도</dt>
                        <dd>{medicationGuidanceText(medication)}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
                {!selectedMedications.length && (
                  <p className="empty-panel">아직 등록된 복용약이 없습니다.</p>
                )}
              </div>
            </section>

            <section>
              <h4>상호작용 및 확인 항목</h4>
              <div className="report-finding-list">
                {findings.map((finding) => (
                  <article key={finding.id}>
                    <strong>{finding.title}</strong>
                    <p>{finding.message}</p>
                  </article>
                ))}
                {!findings.length && <p className="safe-box">현재 등록 약 기준으로 표시할 중대한 충돌은 없습니다.</p>}
              </div>
            </section>
          </article>
        ) : (
          <p className="empty-panel">리포트로 만들 관리대상이 없습니다.</p>
        )}
      </section>

      <aside className="card report-setting-panel">
        <p className="eyebrow">Report Settings</p>
        <h2>리포트 설정</h2>
        <label>
          대상 선택
          <select
            aria-label="리포트 대상 선택"
            onChange={(event) => setSelectedProfileId(event.target.value)}
            value={selectedProfile?.id || ""}
          >
            {careProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="report-option-group">
          <legend>기간 선택</legend>
          <label><input defaultChecked name="period" type="radio" /> 현재</label>
          <label><input name="period" type="radio" /> 최근 1개월</label>
          <label><input name="period" type="radio" /> 최근 3개월</label>
          <label><input name="period" type="radio" /> 직접 선택</label>
        </fieldset>
        <div className="report-date-range">
          <input aria-label="시작일" type="date" />
          <input aria-label="종료일" type="date" />
        </div>
        <button className="primary-button wide" onClick={() => window.print()} type="button">
          PDF 다운로드
        </button>
        <button className="ghost-button wide" onClick={() => window.print()} type="button">
          인쇄하기
        </button>
      </aside>
    </div>
  );
}

function profileRoleLabel(profile: CareProfile, familyMembers: FamilyMember[]): string {
  if (profile.type === "pet") return "반려동물";

  const member = familyMembers.find(
    (item) => item.userId === profile.ownerUserId || item.careProfileId === profile.id,
  );
  if (member?.role === "owner") return "가족대표";
  if (member?.role === "manager") return "가족관리자";
  return "가족구성원";
}
