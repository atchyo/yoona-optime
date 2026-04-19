import type {
  CareProfile,
  DemoUser,
  DrugDatabaseMatch,
  FamilyMember,
  FamilyWorkspace,
  InteractionRule,
  Medication,
  MedicationSchedule,
} from "../types";

export const demoUsers: DemoUser[] = [
  {
    id: "user-owner",
    name: "김정웅",
    role: "user",
    familyRole: "owner",
    email: "jungwoong@optime.family",
  },
  {
    id: "user-member",
    name: "공윤아",
    role: "user",
    familyRole: "member",
    email: "yoona@optime.family",
  },
  {
    id: "user-admin",
    name: "서비스 관리자",
    role: "admin",
    familyRole: "owner",
    email: "admin@optime.family",
  },
];

export const workspace: FamilyWorkspace = {
  id: "family-1",
  name: "우리 가족 약 관리",
  ownerUserId: "user-owner",
};

export const familyMembers: FamilyMember[] = [
  {
    id: "member-owner",
    workspaceId: workspace.id,
    userId: "user-owner",
    role: "owner",
    displayName: "김정웅",
    email: "jungwoong@optime.family",
  },
  {
    id: "member-mom",
    workspaceId: workspace.id,
    userId: "user-member",
    role: "member",
    displayName: "공윤아",
    email: "yoona@optime.family",
  },
];

export const careProfiles: CareProfile[] = [
  {
    id: "profile-self",
    workspaceId: workspace.id,
    ownerUserId: "user-owner",
    name: "나",
    type: "self",
    ageGroup: "40",
    notes: "영양제와 감기약 중복 복용을 자주 확인합니다.",
  },
  {
    id: "profile-mother",
    workspaceId: workspace.id,
    ownerUserId: "user-member",
    name: "공윤아",
    type: "self",
    ageGroup: "60",
    notes: "혈압약 복용 중. 새 약 등록 시 상호작용을 우선 확인합니다.",
  },
  {
    id: "profile-pet",
    workspaceId: workspace.id,
    name: "흰둥이",
    type: "pet",
    ageGroup: "20",
    notes: "반려동물 영양제는 수의사 확인이 필요합니다.",
    petDetails: {
      age: "5살",
      weightKg: "4.8",
      allergies: "닭고기 의심",
      mainFood: "저알러지 사료",
      forbiddenFoods: "초콜릿, 포도, 양파",
    },
  },
];

export const drugMatches: DrugDatabaseMatch[] = [
  {
    id: "match-tylenol",
    source: "mfds_permit",
    productName: "타이레놀정500밀리그람",
    manufacturer: "한국얀센",
    ingredients: [{ name: "아세트아미노펜", amount: "500mg" }],
    dosageForm: "정제",
    efficacy: "해열 및 진통",
    usage: "제품 라벨 또는 전문가 지시에 따릅니다.",
    warnings: ["동일 성분 감기약과 중복 복용하지 마세요.", "간질환이 있으면 전문가 상담이 필요합니다."],
    interactions: ["음주와 함께 복용 시 간 손상 위험이 증가할 수 있습니다."],
    confidence: 0.92,
  },
  {
    id: "match-cold",
    source: "mfds_easy",
    productName: "종합감기약 예시",
    manufacturer: "데모제약",
    ingredients: [
      { name: "아세트아미노펜", amount: "300mg" },
      { name: "카페인", amount: "30mg" },
    ],
    dosageForm: "캡슐",
    efficacy: "감기 증상 완화",
    usage: "식후 복용을 권장합니다.",
    warnings: ["카페인 민감자는 주의하세요.", "다른 해열진통제와 성분 중복을 확인하세요."],
    interactions: ["아세트아미노펜 포함 약과 중복 복용하지 마세요."],
    confidence: 0.78,
  },
  {
    id: "match-omega",
    source: "manual",
    productName: "오메가3 1000",
    manufacturer: "데모헬스",
    ingredients: [{ name: "오메가3", amount: "1000mg" }],
    dosageForm: "연질캡슐",
    efficacy: "건강기능식품",
    usage: "식후 복용",
    warnings: ["항응고제 복용 중이면 전문가 상담이 필요합니다."],
    interactions: ["항응고제와 함께 복용 시 출혈 위험을 확인하세요."],
    confidence: 0.65,
  },
];

export const medications: Medication[] = [
  {
    id: "med-acetaminophen",
    careProfileId: "profile-self",
    status: "confirmed",
    productName: "타이레놀정500밀리그람",
    source: "mfds_permit",
    ingredients: [{ name: "아세트아미노펜", amount: "500mg" }],
    dosage: "1정",
    instructions: "필요 시 복용. 동일 성분 중복 확인.",
    warnings: ["간질환, 음주, 동일 성분 감기약 중복에 주의하세요."],
    interactions: ["감기약 중 아세트아미노펜 포함 여부 확인"],
    startedAt: "2026-04-10",
    reviewAt: "2026-04-24",
  },
  {
    id: "med-bp",
    careProfileId: "profile-mother",
    status: "confirmed",
    productName: "고혈압약 예시",
    source: "manual",
    ingredients: [{ name: "암로디핀", amount: "5mg" }],
    dosage: "1정",
    instructions: "매일 아침 복용",
    warnings: ["어지러움이나 부종이 있으면 전문가 상담이 필요합니다."],
    interactions: ["자몽주스와의 상호작용 가능성을 확인하세요."],
    startedAt: "2026-03-01",
    reviewAt: "2026-05-01",
  },
  {
    id: "med-omega",
    careProfileId: "profile-mother",
    status: "needs_review",
    productName: "오메가3 1000",
    source: "manual",
    ingredients: [{ name: "오메가3", amount: "1000mg" }],
    dosage: "1캡슐",
    instructions: "식후 복용",
    warnings: ["항응고제 복용 중이면 전문가 상담이 필요합니다."],
    interactions: ["항응고제와 병용 시 출혈 위험 확인"],
    startedAt: "2026-01-01",
    reviewAt: "2026-04-15",
  },
];

export const medicationSchedules: MedicationSchedule[] = [
  {
    id: "schedule-bp",
    medicationId: "med-bp",
    type: "daily",
    label: "아침 식후",
    timeOfDay: "08:30",
    nextDueAt: "2026-04-20T08:30:00+09:00",
  },
  {
    id: "schedule-omega-review",
    medicationId: "med-omega",
    type: "duration_review",
    label: "장기복용 검토",
    timeOfDay: "09:00",
    nextDueAt: "2026-04-20T09:00:00+09:00",
    reviewAt: "2026-04-15",
  },
];

export const interactionRules: InteractionRule[] = [
  {
    id: "rule-acetaminophen-duplicate",
    pair: ["아세트아미노펜", "아세트아미노펜"],
    level: "위험",
    message: "동일 성분 해열진통제 중복 복용은 간 손상 위험을 높일 수 있습니다.",
  },
  {
    id: "rule-omega-anticoagulant",
    pair: ["오메가3", "항응고제"],
    level: "주의",
    message: "오메가3와 항응고제 병용 시 출혈 위험 가능성을 확인해야 합니다.",
  },
  {
    id: "rule-caffeine-cold",
    pair: ["카페인", "감기약"],
    level: "주의",
    message: "카페인이 포함된 감기약은 심박 증가나 불면을 유발할 수 있습니다.",
  },
];
