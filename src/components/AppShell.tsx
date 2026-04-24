import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import type { CareProfile, DemoUser, FamilyMember, FamilyWorkspace, ThemeMode } from "../types";

export type Route =
  | "/"
  | "/scan"
  | "/profiles"
  | "/reminders"
  | "/chat"
  | "/family"
  | "/service-admin"
  | "/login";

const navItems: Array<{ path: Route; label: string; shortLabel: string; icon: string; ownerOnly?: boolean; adminOnly?: boolean }> = [
  { path: "/", label: "대시보드", shortLabel: "홈", icon: "홈" },
  { path: "/scan", label: "약 관리", shortLabel: "약관리", icon: "약" },
  { path: "/profiles", label: "복용 기록", shortLabel: "기록", icon: "록" },
  { path: "/reminders", label: "복약 알림", shortLabel: "알림", icon: "알" },
  { path: "/chat", label: "AI 건강 상담", shortLabel: "상담", icon: "AI" },
  { path: "/family", label: "가족 관리", shortLabel: "가족", icon: "가", ownerOnly: true },
  { path: "/service-admin", label: "서비스 관리", shortLabel: "관리", icon: "관", adminOnly: true },
];

const appIconSrc = `${import.meta.env.BASE_URL}opti_me_app_icon.png`;

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
  const mobileItems = visibleItems
    .filter((item) => item.path !== "/service-admin" && item.path !== "/chat")
    .slice(0, 5);
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
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="sidebar-card-label">{workspaceKindLabel(workspace, familyMembers, user)}</span>
          <strong>{workspace.name}</strong>
          <p>건강공간은 데이터가 저장되는 곳이고, 관리대상은 그 안에서 보고 있는 가족입니다.</p>
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
              <span aria-hidden="true">!</span>
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
                          ? "현재 건강공간"
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
            <span className="mobile-tab-icon" aria-hidden="true">{item.icon}</span>
            {item.shortLabel}
          </button>
        ))}
      </nav>
    </div>
  );
}

function routeTitle(route: Route, userName: string): string {
  if (route === "/") return `안녕하세요, ${userName}님`;
  if (route === "/scan") return "약 정보를 등록하고 검색해요";
  if (route === "/profiles") return "가족 복용 기록을 확인해요";
  if (route === "/reminders") return "복약 시간을 관리해요";
  if (route === "/chat") return "등록 약 기준으로 상담을 준비해요";
  if (route === "/family") return "가족과 반려동물 권한을 관리해요";
  if (route === "/service-admin") return "서비스 데이터를 관리해요";
  return "Opti-Me";
}

function routeSubtitle(route: Route): string {
  if (route === "/") return "오늘 가족 복용 일정과 주의사항을 한눈에 확인하세요.";
  if (route === "/scan") return "사진 촬영, 파일 첨부, 약명 검색으로 복용약을 등록합니다.";
  if (route === "/profiles") return "병원 방문 전 복용약과 성분을 빠르게 확인할 수 있습니다.";
  if (route === "/reminders") return "정해진 시간과 장기복용 검토일을 놓치지 않게 관리합니다.";
  if (route === "/chat") return "의료 판단이 아니라 성분 중복과 주의사항 확인을 돕습니다.";
  if (route === "/family") return "초대와 권한, 반려동물 정보를 한곳에서 정리합니다.";
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

  if (workspace.ownerUserId !== user.id) return "초대받은 가족공간";
  if (connectedMembers.some((member) => member.userId && member.userId !== user.id)) return "내 가족공간";
  return "내 건강공간";
}
