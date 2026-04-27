import type { ReactElement } from "react";
import {
  CoreAvatar,
  CoreBadge,
  CoreCard,
  CoreMenuPage,
} from "../components/CoreMenuScaffold";
import type {
  CareProfile,
  DemoUser,
  FamilyInvitation,
  FamilyMember,
  FamilyWorkspace,
  Medication,
  OcrScan,
  TemporaryMedication,
} from "../types";

interface FamilyAdminPageProps {
  careProfiles: CareProfile[];
  familyInvitations: FamilyInvitation[];
  familyMembers: FamilyMember[];
  medications: Medication[];
  onAddMember: (member: Pick<FamilyMember, "displayName" | "email" | "role">) => Promise<void> | void;
  onAddCareProfile: (profile: CareProfile) => Promise<void> | void;
  onDeleteCareProfile: (profileId: string) => Promise<void> | void;
  onDeleteMember: (memberId: string) => Promise<void> | void;
  onRevokeInvitation: (invitationId: string) => Promise<void> | void;
  onUpdateCareProfile: (profileId: string, patch: Partial<CareProfile>) => Promise<void> | void;
  onUpdateMember: (memberId: string, patch: Partial<FamilyMember>) => Promise<void> | void;
  scans: OcrScan[];
  temporaryMedications: TemporaryMedication[];
  user: DemoUser;
  workspace: FamilyWorkspace;
}

const mockFamilyMembers = [
  { name: "본인", relation: "가족대표", meds: 4, status: "정상", tone: "success" as const },
  { name: "아버지", relation: "보호 대상", meds: 1, status: "예정", tone: "primary" as const },
  { name: "어머니", relation: "보호 대상", meds: 2, status: "정상", tone: "success" as const },
  { name: "김아들", relation: "가족 구성원", meds: 0, status: "초대 대기", tone: "warning" as const },
];

export function FamilyAdminPage({
  careProfiles,
  familyInvitations,
  familyMembers,
  medications,
  user,
  workspace,
}: FamilyAdminPageProps): ReactElement {
  const rows = familyMembers.length >= 3
    ? familyMembers.map((member, index) => ({
        name: member.displayName,
        relation: member.role === "owner" ? "가족대표" : member.role === "manager" ? "관리자" : "가족 구성원",
        meds: medications.filter((medication) => member.accessibleProfileIds.includes(medication.careProfileId)).length,
        status: index === 0 ? "정상" : "관리 중",
        tone: index === 0 ? ("success" as const) : ("primary" as const),
      }))
    : mockFamilyMembers;

  return (
    <CoreMenuPage
      action={<button className="core-primary-button" type="button">가족 추가</button>}
      description={`${workspace.name}의 가족 구성원, 권한, 복용 관리 상태를 한 화면에서 확인합니다.`}
      eyebrow="Family"
      summary={[
        { icon: "family", label: "가족 구성원", value: `${rows.length}명`, helper: "연결된 계정", tone: "primary" },
        { icon: "user", label: "관리 대상", value: `${careProfiles.filter((profile) => profile.type !== "pet").length || 4}명`, helper: "가족 프로필", tone: "neutral" },
        { icon: "pill", label: "등록 약", value: `${medications.length || 7}개`, helper: "가족 전체", tone: "success" },
        { icon: "bell", label: "초대 대기", value: `${familyInvitations.length || 1}건`, helper: "권한 확인", tone: "warning" },
      ]}
      title="가족 관리"
    >
      <div className="core-three-column">
        {rows.map((member, index) => (
          <CoreCard
            action={<button className="core-secondary-button" type="button">관리</button>}
            key={member.name}
            meta={`${member.meds}개 약 · 최근 복용 ${member.status}`}
            title={member.name}
          >
            <div className="core-kpi-strip">
              <div className="core-kpi">
                <span>관계</span>
                <strong>{member.relation}</strong>
              </div>
              <div className="core-kpi">
                <span>등록 약</span>
                <strong>{member.meds}</strong>
              </div>
              <div className="core-kpi">
                <span>상태</span>
                <strong>{member.status}</strong>
              </div>
            </div>
            <div style={{ alignItems: "center", display: "flex", gap: 14, marginTop: 18 }}>
              <CoreAvatar tone={index === 0 ? "primary" : "neutral"} />
              <div>
                <CoreBadge tone={member.tone}>{member.status}</CoreBadge>
                <p style={{ color: "var(--dv2-muted)", fontSize: 15, margin: "8px 0 0" }}>
                  {member.name === user.name ? "현재 로그인 계정입니다." : "가족 복용 정보를 함께 관리합니다."}
                </p>
              </div>
            </div>
          </CoreCard>
        ))}
      </div>
      <CoreCard title="보호자 / 권한 안내" meta="초대와 권한 관리는 기존 로직 연결 전 visual scaffold 상태입니다.">
        <div className="core-warning-card">
          <strong>가족 권한은 신중하게 관리하세요</strong>
          <p>가족 구성원은 접근 권한에 따라 복용 정보와 리포트를 볼 수 있습니다. 실제 권한 변경 로직은 기존 기능과 분리해서 후속 pass에서 다룹니다.</p>
        </div>
      </CoreCard>
    </CoreMenuPage>
  );
}
