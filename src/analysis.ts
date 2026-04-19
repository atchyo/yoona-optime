import { interactionRules } from "./data/demoData";
import type { AnalysisResult, InteractionRule, Profile, SafetyLevel } from "./types";

export function analyzeIngredients(rawInput: string, profile: Profile): AnalysisResult {
  const ingredients = rawInput
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const findings = interactionRules.filter((rule) =>
    rule.pair.every((keyword) =>
      ingredients.some((ingredient) => ingredient.includes(keyword)),
    ),
  );

  let safetyLevel: SafetyLevel = "적정";
  if (findings.some((finding) => finding.level === "위험")) {
    safetyLevel = "고위험";
  } else if (findings.length > 0 || profile.ageGroup === "60") {
    safetyLevel = "주의";
  }

  return {
    ingredients,
    findings,
    safetyLevel,
    timeline: buildTimeline(ingredients),
  };
}

export function buildEmptyAnalysis(profile: Profile): AnalysisResult {
  return analyzeIngredients(profile.meds.join(", "), profile);
}

export function assistantReply(message: string, profile: Profile): string {
  let answer = "복용 중인 성분 리스트를 먼저 분석해볼게요.";

  if (message.includes("감기약")) {
    answer = "감기약은 카페인과 중복 진통성분을 먼저 확인하세요. 현재 성분과 함께 주의 단계로 살펴보겠습니다.";
  } else if (message.includes("타이레놀") || message.includes("아세트아미노펜")) {
    answer = "아세트아미노펜은 동일 성분 중복 섭취를 피해야 합니다. 감기약 성분표를 함께 확인하세요.";
  } else if (message.includes("같이 먹어") || message.includes("병용")) {
    answer = "병용 가능성은 성분 조합에 따라 달라집니다. 분석 결과의 위험/주의 항목을 우선 확인해주세요.";
  }

  if (profile.ageGroup === "60") {
    answer += " 60세 이상은 복용 간격과 용량을 보수적으로 관리하는 편이 좋습니다.";
  }

  return `${answer} 본 서비스는 의료행위 대체가 아닌 정보 제공용입니다.`;
}

export function summarizeFindings(findings: InteractionRule[]): string {
  if (findings.length === 0) return "중대한 충돌은 탐지되지 않았습니다.";
  return findings.map((finding) => `[${finding.level}] ${finding.message}`).join(" ");
}

function buildTimeline(ingredients: string[]): string[] {
  const hasIron = ingredients.some((ingredient) => ingredient.includes("철분"));
  const hasCalcium = ingredients.some((ingredient) => ingredient.includes("칼슘"));

  return [
    hasIron ? "오전 공복: 철분 계열 우선 복용" : "오전: 물과 함께 기본 영양제 확인",
    "식후: 멀티비타민·오메가3 계열",
    hasCalcium ? "취침 전: 칼슘은 철분과 2시간 이상 간격" : "저녁: 복용 누락 여부 점검",
  ];
}
