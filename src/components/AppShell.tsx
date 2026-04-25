import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";
import type { CareProfile, DemoUser, FamilyMember, FamilyWorkspace, ThemeMode } from "../types";

export type Route =
  | "/"
  | "/scan"
  | "/profiles"
  | "/history"
  | "/reminders"
  | "/interactions"
  | "/chat"
  | "/reports"
  | "/family"
  | "/pets"
  | "/settings"
  | "/service-admin"
  | "/login";

const navItems: Array<{ path: Route; label: string; shortLabel: string; icon: IconName; ownerOnly?: boolean; adminOnly?: boolean }> = [
  { path: "/", label: "대시보드", shortLabel: "홈", icon: "home" },
  { path: "/scan", label: "약 관리", shortLabel: "약관리", icon: "pill" },
  { path: "/profiles", label: "가족약", shortLabel: "가족약", icon: "family" },
  { path: "/history", label: "복용 기록", shortLabel: "기록", icon: "calendar" },
  { path: "/reminders", label: "복약 알림", shortLabel: "알림", icon: "bell" },
  { path: "/interactions", label: "상호작용 체크", shortLabel: "체크", icon: "shield" },
  { path: "/chat", label: "AI 건강 상담", shortLabel: "상담", icon: "chat" },
  { path: "/reports", label: "리포트 출력", shortLabel: "리포트", icon: "file" },
  { path: "/family", label: "가족 관리", shortLabel: "가족", icon: "family", ownerOnly: true },
  { path: "/pets", label: "반려동물 관리", shortLabel: "반려", icon: "paw", ownerOnly: true },
  { path: "/settings", label: "설정", shortLabel: "설정", icon: "settings" },
  { path: "/service-admin", label: "서비스 관리", shortLabel: "관리", icon: "clipboard", adminOnly: true },
];

const appIconSrc = `${import.meta.env.BASE_URL}opti_me_app_icon.svg`;

interface AppShellProps {
  availableProfiles: CareProfile[];
  children: ReactNode;
  currentProfile: CareProfile;
  onLogout: () => void;
  onNavigate: (route: Route) => void;
  onProfileChange: (profileId: string) => void;
  onThemeToggle: () => void;
  route: Route;
  theme: ThemeMode;
  familyMembers: FamilyMember[];
  availableWorkspaces: FamilyWorkspace[];
  onWorkspaceChange: (workspaceId: string) => void;
  workspace: FamilyWorkspace;
  user: DemoUser;
}

export function AppShell({
  availableProfiles,
  children,
  currentProfile,
  familyMembers,
  availableWorkspaces,
  onLogout,
  onNavigate,
  onProfileChange,
  onWorkspaceChange,
  onThemeToggle,
  route,
  theme,
  workspace,
  user,
}: AppShellProps): ReactElement {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return user.role === "admin";
    if (item.ownerOnly) return user.familyRole === "owner" || user.familyRole === "manager";
    return true;
  });
  const preferredMobilePaths: Route[] =
    user.familyRole === "owner" || user.familyRole === "manager"
      ? ["/", "/scan", "/history", "/reminders", "/family"]
      : ["/", "/scan", "/history", "/reminders", "/settings"];
  const mobileItems = preferredMobilePaths
    .map((path) => visibleItems.find((item) => item.path === path))
    .filter(Boolean) as typeof visibleItems;
  const currentRoute = navItems.find((item) => item.path === route) || navItems[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img alt="Opti-Me" className="app-icon brand-icon" src={appIconSrc} />
          <div>
            <strong>Opti-Me</strong>
            <span>가족 약 관리</span>
          </div>
        </div>
        <nav aria-label="주요 메뉴" className="nav-list">
          {visibleItems.map((item) => (
            <button
              aria-current={route === item.path ? "page" : undefined}
              className={route === item.path ? "nav-item active" : "nav-item"}
              key={item.path}
              onClick={() => onNavigate(item.path)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true"><Icon name={item.icon} /></span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="sidebar-card-label">{workspaceKindLabel(workspace, familyMembers, user)}</span>
          <strong>{workspace.name}</strong>
          <p>개인공간과 가족공간은 따로 저장됩니다. 상단 공간 전환으로 범위를 바꾸고, 관리대상에서 볼 사람을 선택합니다.</p>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">{currentRoute.label}</p>
            <h1>{routeTitle(route, user.name)}</h1>
            <p>{routeSubtitle(route)}</p>
          </div>
          <div className="topbar-actions">
            <button className="topbar-icon-button" aria-label="알림" type="button">
              <Icon name="bell" />
              <span className="notification-dot" aria-hidden="true">3</span>
            </button>
            <button className="ghost-button topbar-help-button" type="button">
              도움말
            </button>
            <div className="space-switcher">
              <button
                aria-expanded={isSpaceMenuOpen}
                aria-haspopup="listbox"
                className="workspace-chip"
                onClick={() => setIsSpaceMenuOpen((current) => !current)}
                type="button"
              >
                <span className="chip-label">{workspaceKindLabel(workspace, familyMembers, user)}</span>
                <strong>{workspace.name}</strong>
              </button>
              {isSpaceMenuOpen && (
                <div aria-label="공간 선택" className="profile-switcher-menu space-switcher-menu" role="listbox">
                  {availableWorkspaces.map((item) => (
                    <button
                      aria-selected={item.id === workspace.id}
                      className={item.id === workspace.id ? "profile-option active" : "profile-option"}
                      key={item.id}
                      onClick={() => {
                        onWorkspaceChange(item.id);
                        setIsSpaceMenuOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <strong>{item.name}</strong>
                      <span>
                        {item.id === workspace.id
                          ? "현재 선택됨"
                          : workspaceKindLabel(item, familyMembers, user)}
                      </span>
                    </button>
                  ))}
                  {!availableWorkspaces.length && (
                    <div className="space-menu-note">사용 가능한 가족공간을 불러오는 중입니다.</div>
                  )}
                </div>
              )}
            </div>
            <ThemeToggle onToggle={onThemeToggle} theme={theme} />
            <div className="profile-switcher">
              <button
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="listbox"
                className="user-chip profile-switcher-button"
                onClick={() => setIsProfileMenuOpen((current) => !current)}
                type="button"
              >
                <span>{profileRoleLabel(currentProfile, familyMembers, user)}</span>
                <div className="profile-switcher-copy">
                  <small>관리대상</small>
                  <strong>{currentProfile.name}</strong>
                </div>
              </button>
              {isProfileMenuOpen && (
                <div aria-label="관리 대상 선택" className="profile-switcher-menu" role="listbox">
                  {availableProfiles.map((profile) => (
                    <button
                      aria-selected={profile.id === currentProfile.id}
                      className={profile.id === currentProfile.id ? "profile-option active" : "profile-option"}
                      key={profile.id}
                      onClick={() => {
                        onProfileChange(profile.id);
                        setIsProfileMenuOpen(false);
                      }}
                      role="option"
                      type="button"
                    >
                      <strong>{profile.name}</strong>
                      <span>{profileRoleLabel(profile, familyMembers, user)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="ghost-button logout-button" onClick={onLogout} type="button">
              로그아웃
            </button>
          </div>
        </header>

        <WorkspaceContextBanner
          availableWorkspaces={availableWorkspaces}
          familyMembers={familyMembers}
          onOpenSpaceMenu={() => setIsSpaceMenuOpen(true)}
          user={user}
          workspace={workspace}
        />

        <main className="page-content">{children}</main>
      </div>

      <nav aria-label="모바일 메뉴" className="mobile-tabbar">
        {mobileItems.map((item) => (
          <button
            aria-current={route === item.path ? "page" : undefined}
            className={route === item.path ? "mobile-tab active" : "mobile-tab"}
            key={item.path}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            <span className="mobile-tab-icon" aria-hidden="true"><Icon name={item.icon} /></span>
            {item.shortLabel}
          </button>
        ))}
      </nav>
    </div>
  );
}

function WorkspaceContextBanner({
  availableWorkspaces,
  familyMembers,
  onOpenSpaceMenu,
  user,
  workspace,
}: {
  availableWorkspaces: FamilyWorkspace[];
  familyMembers: FamilyMember[];
  onOpenSpaceMenu: () => void;
  user: DemoUser;
  workspace: FamilyWorkspace;
}): ReactElement | null {
  if (availableWorkspaces.length <= 1) return null;

  const currentKind = workspaceKindLabel(workspace, familyMembers, user);
  const isInvitedWorkspace = workspace.ownerUserId !== user.id;

  return (
    <section className={isInvitedWorkspace ? "workspace-context-banner family" : "workspace-context-banner personal"}>
      <div>
        <span>{currentKind}</span>
        <strong>{workspace.name}</strong>
        <p>
          {isInvitedWorkspace
            ? "이 공간에 등록한 약은 가족 권한에 따라 공유됩니다."
            : "개인공간 기록입니다. 초대 가족공간 기록과 다를 수 있습니다."}
        </p>
      </div>
      <button className="ghost-button" onClick={onOpenSpaceMenu} type="button">
        공간 바꾸기
      </button>
    </section>
  );
}

function routeTitle(route: Route, userName: string): string {
  if (route === "/") return `안녕하세요, ${userName}님`;
  if (route === "/scan") return "약 정보를 등록하고 검색해요";
  if (route === "/profiles") return "가족별 복용약을 확인해요";
  if (route === "/history") return "복용 완료와 예정 기록을 확인해요";
  if (route === "/reminders") return "복약 시간을 관리해요";
  if (route === "/interactions") return "성분 중복과 주의 조합을 확인해요";
  if (route === "/chat") return "등록 약 기준으로 상담을 준비해요";
  if (route === "/reports") return "병원 방문용 복약 리포트를 만들어요";
  if (route === "/family") return "가족과 반려동물 권한을 관리해요";
  if (route === "/pets") return "반려동물 건강 기록을 관리해요";
  if (route === "/settings") return "계정과 화면 설정을 확인해요";
  if (route === "/service-admin") return "서비스 데이터를 관리해요";
  return "Opti-Me";
}

function routeSubtitle(route: Route): string {
  if (route === "/") return "오늘 가족 복용 일정과 주의사항을 한눈에 확인하세요.";
  if (route === "/scan") return "사진 촬영, 파일 첨부, 약명 검색으로 복용약을 등록합니다.";
  if (route === "/profiles") return "병원 방문 전 가족별 복용약과 성분을 빠르게 확인할 수 있습니다.";
  if (route === "/history") return "완료한 복용 기록과 앞으로 예정된 복용 일정을 함께 봅니다.";
  if (route === "/reminders") return "정해진 시간과 장기복용 검토일을 놓치지 않게 관리합니다.";
  if (route === "/interactions") return "확정 약과 영양제 기준으로 성분 중복, 주의 조합, 검토 항목을 봅니다.";
  if (route === "/chat") return "의료 판단이 아니라 성분 중복과 주의사항 확인을 돕습니다.";
  if (route === "/reports") return "가족을 케어해 병원에 갈 때 필요한 복용 정보를 한 장으로 정리합니다.";
  if (route === "/family") return "초대와 권한, 반려동물 정보를 한곳에서 정리합니다.";
  if (route === "/pets") return "반려동물의 나이, 체중, 알러지, 사료, 금지 음식을 함께 관리합니다.";
  if (route === "/settings") return "로그인 계정, 가족공간, 화면 모드와 데이터 안내를 확인합니다.";
  return "가족 건강 관리를 위한 기본 데이터를 확인합니다.";
}

function profileRoleLabel(
  profile: CareProfile,
  familyMembers: FamilyMember[],
  user: DemoUser,
): string {
  if (profile.type === "pet") return "반려";
  const member = familyMembers.find(
    (item) => item.userId === profile.ownerUserId || item.careProfileId === profile.id,
  );
  if (user.role === "admin") return "관리";
  if (member?.role === "owner") return "대표";
  if (member?.role === "manager") return "관리";
  return "가족";
}

function workspaceKindLabel(
  workspace: FamilyWorkspace,
  familyMembers: FamilyMember[],
  user: DemoUser,
): string {
  const connectedMembers = familyMembers.filter((member) => member.workspaceId === workspace.id);

  if (workspace.ownerUserId !== user.id) return "초대 가족공간";
  if (connectedMembers.some((member) => member.userId && member.userId !== user.id)) return "가족공간";
  return "개인공간";
}
