import { buildSafetyFindings } from "./safety";
import type { CareProfile, Medication, RuleChatResponse } from "../types";

export function answerRuleBasedQuestion(
  question: string,
  medications: Medication[],
  profile: CareProfile,
): RuleChatResponse {
  const findings = buildSafetyFindings(medications, profile);
  const normalized = question.toLocaleLowerCase("ko-KR");
  const mentionedMeds = medications.filter((medication) =>
    normalized.includes(medication.productName.toLocaleLowerCase("ko-KR")) ||
    medication.ingredients.some((ingredient) =>
      normalized.includes(ingredient.name.toLocaleLowerCase("ko-KR")),
    ),
  );

  let answer = `${profile.name}님의 등록 약 기준으로 확인했어요. `;

  if (normalized.includes("감기") || normalized.includes("cold")) {
    const acetaminophenMeds = medications.filter((medication) =>
      medication.ingredients.some((ingredient) => ingredient.name.includes("아세트아미노펜")),
    );
    answer += acetaminophenMeds.length
      ? `감기약에는 아세트아미노펜이 들어있는 경우가 많아 ${acetaminophenMeds.map((medication) => medication.productName).join(", ")}와 성분 중복을 꼭 확인해야 합니다.`
      : "감기약은 해열진통제, 카페인, 항히스타민 성분 중복 여부를 먼저 확인하세요.";
  } else if (mentionedMeds.length) {
    answer += `${mentionedMeds.map((medication) => medication.productName).join(", ")} 관련 주의사항을 기준으로 보면, 등록된 경고와 상호작용 항목을 먼저 확인하는 것이 좋습니다.`;
  } else {
    answer += "질문에 나온 약이 등록 목록에 없으면 약 등록 또는 임시약 입력 후 다시 확인하는 흐름이 안전합니다.";
  }

  if (findings.some((finding) => finding.level === "고위험")) {
    answer += " 현재 고위험 가능성이 표시된 항목이 있어 복용 전 전문가 확인을 권장합니다.";
  }

  return {
    answer,
    findings,
    disclaimer: "Opti-Me는 의료행위를 대체하지 않습니다. 복용 결정은 의사 또는 약사와 상담해 주세요.",
  };
}
