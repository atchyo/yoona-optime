import type { ReactElement } from "react";
import {
  CoreBadge,
  CoreCard,
  CoreMenuPage,
  CoreToggle,
} from "../components/CoreMenuScaffold";
import type { DemoUser, FamilyWorkspace, ThemeMode } from "../types";

interface SettingsPageProps {
  availableWorkspaceCount: number;
  onThemeToggle: () => void;
  theme: ThemeMode;
  user: DemoUser;
  workspace: FamilyWorkspace;
}

const settingSections = [
  { title: "프로필 설정", description: "이름, 이메일, 기본 관리 대상을 확인합니다.", status: "확인됨" },
  { title: "알림 설정", description: "복약 알림과 보호자 알림 채널을 관리합니다.", status: "사용 중" },
  { title: "가족/반려동물 기본 설정", description: "기본 가족공간과 반려동물 표시 기준을 정리합니다.", status: "관리 중" },
  { title: "개인정보/보안", description: "로그인 세션과 의료 정보 안내를 확인합니다.", status: "안내" },
  { title: "앱 표시 설정", description: "라이트/다크 모드와 표시 환경을 조정합니다.", status: "Light" },
  { title: "계정 관리", description: "로그아웃과 계정 연결 상태를 확인합니다.", status: "활성" },
];

export function SettingsPage({
  availableWorkspaceCount,
  onThemeToggle,
  theme,
  user,
  workspace,
}: SettingsPageProps): ReactElement {
  return (
    <CoreMenuPage
      description="계정, 알림, 표시 환경, 개인정보 안내를 같은 카드 시스템으로 정리한 설정 scaffold입니다."
      eyebrow="Settings"
      summary={[
        { icon: "user", label: "계정", value: user.name, helper: roleLabel(user.familyRole), tone: "primary" },
        { icon: "family", label: "가족공간", value: `${availableWorkspaceCount}개`, helper: workspace.name, tone: "neutral" },
        { icon: "sun", label: "표시 모드", value: theme === "light" ? "Light" : "Dark", helper: "현재 기기", tone: "success" },
        { icon: "shield", label: "보안 안내", value: "확인", helper: "의료정보 주의", tone: "warning" },
      ]}
      title="설정"
    >
      <div className="core-three-column">
        {settingSections.map((section) => (
          <CoreCard
            action={<CoreBadge tone={section.status === "Light" ? "success" : "neutral"}>{section.status}</CoreBadge>}
            key={section.title}
            meta={section.description}
            title={section.title}
          >
            <div className="core-option">
              <strong>{section.title === "앱 표시 설정" ? "현재는 desktop light 기준" : "Dashboard v2 기준 적용"}</strong>
              <p>{section.title === "앱 표시 설정" ? "다크모드와 모바일 polish는 별도 pass에서 진행합니다." : "세부 기능 연결 전 visual scaffold 상태입니다."}</p>
            </div>
            {section.title === "앱 표시 설정" && (
              <button className="core-secondary-button" onClick={onThemeToggle} style={{ marginTop: 14 }} type="button">
                테마 전환 <CoreToggle checked={theme === "light"} />
              </button>
            )}
          </CoreCard>
        ))}
      </div>
    </CoreMenuPage>
  );
}

function roleLabel(role: DemoUser["familyRole"]): string {
  if (role === "owner") return "가족대표";
  if (role === "manager") return "가족관리자";
  return "가족구성원";
}
