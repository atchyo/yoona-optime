import type { ReactElement } from "react";
import {
  CoreAvatar,
  CoreBadge,
  CoreCard,
  CoreMenuPage,
} from "../components/CoreMenuScaffold";
import type { CareProfile, FamilyWorkspace, Medication } from "../types";

interface PetAdminPageProps {
  careProfiles: CareProfile[];
  medications: Medication[];
  onAddCareProfile: (profile: CareProfile) => Promise<void> | void;
  onDeleteCareProfile: (profileId: string) => Promise<void> | void;
  onUpdateCareProfile: (profileId: string, patch: Partial<CareProfile>) => Promise<void> | void;
  workspace: FamilyWorkspace;
}

const mockPets = [
  { name: "강아지", breed: "말티즈", age: "9살", meds: 2, status: "정상", tone: "success" as const },
  { name: "초코", breed: "푸들", age: "5살", meds: 1, status: "검토", tone: "warning" as const },
];

export function PetAdminPage({
  careProfiles,
  medications,
  workspace,
}: PetAdminPageProps): ReactElement {
  const petProfiles = careProfiles.filter((profile) => profile.type === "pet");
  const pets = petProfiles.length >= 2
    ? petProfiles.map((profile) => ({
        name: profile.name,
        breed: profile.petDetails?.mainFood ? "반려동물" : "말티즈",
        age: profile.petDetails?.age || "나이 미등록",
        meds: medications.filter((medication) => medication.careProfileId === profile.id).length,
        status: "관리 중",
        tone: "primary" as const,
      }))
    : mockPets;

  return (
    <CoreMenuPage
      action={<button className="core-primary-button" type="button">반려동물 추가</button>}
      description={`${workspace.name}에 등록된 반려동물의 영양제, 약, 주의 메모를 관리합니다.`}
      eyebrow="Pets"
      summary={[
        { icon: "paw", label: "반려동물", value: `${pets.length}마리`, helper: "등록 프로필", tone: "primary" },
        { icon: "pill", label: "등록 약", value: `${pets.reduce((sum, pet) => sum + pet.meds, 0)}개`, helper: "영양제 포함", tone: "success" },
        { icon: "warning", label: "주의 메모", value: "1건", helper: "알러지 확인", tone: "danger" },
        { icon: "calendar", label: "최근 기록", value: "오늘", helper: "관리 상태", tone: "neutral" },
      ]}
      title="반려동물 관리"
    >
      <div className="core-three-column">
        {pets.map((pet) => (
          <CoreCard
            action={<button className="core-secondary-button" type="button">관리</button>}
            key={pet.name}
            meta={`${pet.breed} · ${pet.age}`}
            title={pet.name}
          >
            <div style={{ alignItems: "center", display: "flex", gap: 16 }}>
              <CoreAvatar tone="warning" type="pet" />
              <div>
                <CoreBadge tone={pet.tone}>{pet.status}</CoreBadge>
                <dl className="core-metadata-grid">
                  <div>
                    <dt>등록 약</dt>
                    <dd>{pet.meds}개</dd>
                  </div>
                  <div>
                    <dt>최근 복용</dt>
                    <dd>오늘</dd>
                  </div>
                </dl>
              </div>
            </div>
          </CoreCard>
        ))}
      </div>
      <CoreCard title="주의 안내" meta="반려동물 약/영양제는 수의사 확인을 우선합니다.">
        <div className="core-warning-card">
          <strong>반려동물 복용 기록은 사람 약과 분리해서 관리하세요</strong>
          <p>체중, 품종, 알러지에 따라 주의 기준이 달라질 수 있으므로 실제 복용 변경 전에는 수의사와 상담하는 흐름을 유지합니다.</p>
        </div>
      </CoreCard>
    </CoreMenuPage>
  );
}
