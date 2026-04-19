import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const { question, medications = [], profile } = await req.json();
  const normalized = String(question || "").toLowerCase();
  const ingredients = medications.flatMap((med: { ingredients?: Array<{ name: string }> }) =>
    med.ingredients?.map((ingredient) => ingredient.name) || [],
  );

  let answer = `${profile?.name || "사용자"}님의 등록 약 기준으로 확인했어요. `;
  if (normalized.includes("감기")) {
    answer += ingredients.some((ingredient: string) => ingredient.includes("아세트아미노펜"))
      ? "감기약에는 아세트아미노펜이 들어있는 경우가 많아 동일 성분 중복을 꼭 확인하세요."
      : "감기약은 해열진통제, 카페인, 항히스타민 성분 중복 여부를 먼저 확인하세요.";
  } else {
    answer += "질문에 나온 약이 등록 목록에 없으면 사진 등록 또는 임시약 입력 후 다시 확인하는 흐름이 안전합니다.";
  }

  return jsonResponse({
    answer,
    disclaimer: "Opti-Me는 의료행위를 대체하지 않습니다. 복용 결정은 의사 또는 약사와 상담해 주세요.",
  });
});
