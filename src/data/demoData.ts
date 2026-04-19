import type { DemoUser, InteractionRule, Profile } from "../types";

export const demoUsers: DemoUser[] = [
  { id: "user-demo", name: "윤아", role: "user" },
  { id: "admin-demo", name: "관리자", role: "admin" },
];

export const profiles: Profile[] = [
  {
    id: "profile-self",
    name: "나",
    type: "self",
    ageGroup: "40",
    meds: ["비타민C", "칼슘"],
  },
  {
    id: "profile-mother",
    name: "어머니",
    type: "parent",
    ageGroup: "60",
    meds: ["고혈압약", "오메가3"],
  },
  {
    id: "profile-pet",
    name: "흰둥이",
    type: "pet",
    ageGroup: "20",
    meds: ["관절 영양제"],
  },
];

export const interactionRules: InteractionRule[] = [
  {
    id: "rule-calcium-iron",
    pair: ["칼슘", "철분"],
    level: "주의",
    message: "칼슘과 철분은 흡수 경쟁이 있어 2시간 이상 간격을 권장합니다.",
  },
  {
    id: "rule-omega-anticoagulant",
    pair: ["오메가3", "항응고제"],
    level: "위험",
    message: "출혈 위험 증가 가능성이 있어 의료진 상담이 필요합니다.",
  },
  {
    id: "rule-vitamin-a-liver",
    pair: ["비타민A", "간기능"],
    level: "주의",
    message: "간질환 이력이 있으면 비타민A 과다 복용을 주의해야 합니다.",
  },
  {
    id: "rule-cold-caffeine",
    pair: ["감기약", "카페인"],
    level: "주의",
    message: "일부 감기약과 카페인 병용 시 심박 증가 가능성이 있습니다.",
  },
];

export const reportStatuses = [
  { label: "오늘 생성", value: "8건" },
  { label: "주의 필요", value: "3건" },
  { label: "공유 대기", value: "2건" },
];
