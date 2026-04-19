import { interactionRules } from "../data/demoData";
import type { CareProfile, Medication, SafetyFinding } from "../types";

export function buildSafetyFindings(
  medications: Medication[],
  profile: CareProfile,
): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  const ingredientMap = new Map<string, string[]>();

  medications.forEach((medication) => {
    medication.ingredients.forEach((ingredient) => {
      const key = ingredient.name;
      ingredientMap.set(key, [...(ingredientMap.get(key) || []), medication.id]);
    });
  });

  ingredientMap.forEach((medicationIds, ingredient) => {
    if (medicationIds.length > 1) {
      findings.push({
        id: `duplicate-${ingredient}`,
        level: "고위험",
        title: `${ingredient} 성분 중복`,
        message: "동일 성분이 여러 약에 포함되어 있습니다. 복용 전 약사 또는 의사에게 확인하세요.",
        medicationIds,
      });
    }
  });

  interactionRules.forEach((rule) => {
    const ids = medications
      .filter((medication) =>
        medication.ingredients.some((ingredient) =>
          rule.pair.some((keyword) => ingredient.name.includes(keyword)),
        ) || rule.pair.some((keyword) => medication.productName.includes(keyword)),
      )
      .map((medication) => medication.id);

    if (ids.length >= 1 && rule.level === "위험") {
      findings.push({
        id: rule.id,
        level: "고위험",
        title: "상호작용 위험 가능성",
        message: rule.message,
        medicationIds: ids,
      });
    } else if (ids.length >= 1) {
      findings.push({
        id: rule.id,
        level: "주의",
        title: "주의 조합",
        message: rule.message,
        medicationIds: ids,
      });
    }
  });

  if (profile.ageGroup === "60" && medications.length > 0) {
    findings.push({
      id: `senior-${profile.id}`,
      level: "주의",
      title: "고령자 복용 검토",
      message: "60세 이상은 새 약 추가 시 복용 간격, 용량, 기존 처방약과의 조합을 보수적으로 확인하세요.",
      medicationIds: medications.map((medication) => medication.id),
    });
  }

  medications
    .filter((medication) => medication.status !== "confirmed")
    .forEach((medication) => {
      findings.push({
        id: `review-${medication.id}`,
        level: "검토필요",
        title: "성분 미확정 약",
        message: `${medication.productName}은 공식 DB 매칭이 확정되지 않았습니다. 안전 판단에서 제한적으로만 사용하세요.`,
        medicationIds: [medication.id],
      });
    });

  return findings;
}

export function isPastReviewDate(medication: Medication, today = new Date()): boolean {
  if (!medication.reviewAt) return false;
  const reviewDate = new Date(`${medication.reviewAt}T00:00:00`);
  return reviewDate.getTime() <= today.getTime();
}
