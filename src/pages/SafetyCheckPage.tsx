import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { buildSafetyFindings } from "../services/safety";
import type { CareProfile, Medication, SafetyFinding } from "../types";

interface SafetyCheckPageProps {
  careProfiles: CareProfile[];
  currentProfile: CareProfile;
  medications: Medication[];
}

export function SafetyCheckPage({
  careProfiles,
  currentProfile,
  medications,
}: SafetyCheckPageProps): ReactElement {
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfile.id);

  useEffect(() => {
    if (careProfiles.some((profile) => profile.id === currentProfile.id)) {
      setSelectedProfileId(currentProfile.id);
    }
  }, [careProfiles, currentProfile.id]);

  const selectedProfile =
    careProfiles.find((profile) => profile.id === selectedProfileId) || careProfiles[0] || currentProfile;
  const selectedMedications = medications.filter(
    (medication) => medication.careProfileId === selectedProfile.id,
  );
  const selectedFindings = buildSafetyFindings(selectedMedications, selectedProfile);

  return (
    <div className="safety-page">
      <section className="card safety-workspace">
        <div className="segmented-tabs safety-tabs" aria-label="상호작용 확인 범위">
          <button className="active" type="button">내 약 조합</button>
          <button type="button">영양제 조합 확인</button>
        </div>

        <div className="safe-box safety-ok-banner">
          <strong>현재 등록된 약에서 중대한 상호작용은 없습니다.</strong>
          <span>단, 아래 조합은 상황에 따라 주의가 필요합니다.</span>
        </div>

        <div className="safety-current-grid">
          <aside className="safety-profile-list" aria-label="관리 대상 선택">
            {careProfiles.map((profile) => (
              <button
                className={profile.id === selectedProfile.id ? "safety-profile active" : "safety-profile"}
                key={profile.id}
                onClick={() => setSelectedProfileId(profile.id)}
                type="button"
              >
                <strong>{profile.name}</strong>
                <span>{profile.type === "pet" ? "반려동물" : `${profile.ageGroup}대`}</span>
              </button>
            ))}
          </aside>

          <div className="safety-result-panel">
            <div className="section-heading row-heading">
              <div>
                <h2>확인된 상호작용 ({selectedFindings.length})</h2>
                <p className="muted">{selectedProfile.name}님에게 등록된 약과 영양제 기준입니다.</p>
              </div>
              <span className="owner-badge">등록 약 {selectedMedications.length}건</span>
            </div>
            <MedicationIngredientList medications={selectedMedications} />
            <SafetyFindingList findings={selectedFindings} medications={selectedMedications} />
          </div>
        </div>

        <div className="additional-check-panel">
          <h3>추가 조합 검색</h3>
          <div>
            <input placeholder="약 이름 또는 성분 입력" />
            <button className="primary-button" type="button">조합 확인</button>
          </div>
        </div>
      </section>

      <aside className="card safety-guide-panel">
        <h2>상호작용 등급 안내</h2>
        <div className="safety-guide-grid">
          <GuideCard title="주의" text="함께 복용 시 확인이 필요한 경우" />
          <GuideCard title="관찰" text="증상 변화가 있으면 중단/상담" />
          <GuideCard title="중복" text="성분이 겹칠 가능성" />
          <GuideCard title="참고" text="복용 시간 조정 권장" />
        </div>
        <div className="empty-panel current-guide">
          <strong>현재 안내</strong>
          <p>본 서비스는 등록한 약과 영양제를 기준으로 일반적인 주의 정보를 제공합니다. 처방 변경이나 중단은 반드시 의료진과 상담하세요.</p>
        </div>
      </aside>

      <section className="mobile-safety-med-list">
        <h2>함께 복용 중인 약</h2>
        <MedicationIngredientList medications={selectedMedications} />
      </section>
      <section className="mobile-safety-finding-list">
        <SafetyFindingList findings={selectedFindings} medications={selectedMedications} />
      </section>
      <button className="primary-button mobile-report-link" type="button">복약 지도 리포트 보기</button>
    </div>
  );
}

function MedicationIngredientList({ medications }: { medications: Medication[] }): ReactElement {
  if (!medications.length) {
    return <p className="empty-panel">등록된 약이 없어 성분을 비교할 수 없습니다.</p>;
  }

  return (
    <div className="ingredient-strip">
      {medications.map((medication) => (
        <article key={medication.id}>
          <div>
            <strong>{medication.productName}</strong>
            <span>{medication.ingredients.map(formatIngredient).join(", ") || "성분 미등록"}</span>
          </div>
          <button aria-label={`${medication.productName} 조합에서 제외`} type="button">⊖</button>
        </article>
      ))}
    </div>
  );
}

function SafetyFindingList({
  compact,
  findings,
  medications,
}: {
  compact?: boolean;
  findings: SafetyFinding[];
  medications: Medication[];
}): ReactElement {
  if (!findings.length) {
    return <p className="safe-box">현재 등록 약 기준으로 표시할 중대한 충돌은 없습니다.</p>;
  }

  return (
    <div className={compact ? "finding-stack compact" : "finding-stack"}>
      {findings.map((finding) => (
        <article className={finding.level === "고위험" ? "danger-box" : "warning-box"} key={finding.id}>
          <div>
            <strong>{finding.title}</strong>
            <span>{finding.level}</span>
          </div>
          <p>{finding.message}</p>
          <small>
            관련 약:{" "}
            {finding.medicationIds
              .map((id) => medications.find((medication) => medication.id === id)?.productName)
              .filter(Boolean)
              .join(", ") || "확인 필요"}
          </small>
        </article>
      ))}
    </div>
  );
}

function GuideCard({ title, text }: { title: string; text: string }): ReactElement {
  return (
    <article className="guide-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function formatIngredient(ingredient: Medication["ingredients"][number]): string {
  return ingredient.amount ? `${ingredient.name} ${ingredient.amount}` : ingredient.name;
}
