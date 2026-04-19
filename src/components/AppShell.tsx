import type { ReactElement, ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";
import type { CareProfile, DemoUser, ThemeMode } from "../types";

export type Route =
  | "/"
  | "/scan"
  | "/profiles"
  | "/reminders"
  | "/chat"
  | "/family"
  | "/service-admin"
  | "/login";

const navItems: Array<{ path: Route; label: string; ownerOnly?: boolean; adminOnly?: boolean }> = [
  { path: "/", label: "대시보드" },
  { path: "/scan", label: "약 등록" },
  { path: "/profiles", label: "가족약" },
  { path: "/reminders", label: "리마인더" },
  { path: "/chat", label: "상담" },
  { path: "/family", label: "가족관리", ownerOnly: true },
  { path: "/service-admin", label: "서비스", adminOnly: true },
];

const appIconSrc = `${import.meta.env.BASE_URL}opti_me_top_left_icon.png`;

interface AppShellProps {
  children: ReactNode;
  currentProfile: CareProfile;
  onLogout: () => void;
  onNavigate: (route: Route) => void;
  onThemeToggle: () => void;
  route: Route;
  theme: ThemeMode;
  user: DemoUser;
}

export function AppShell({
  children,
  currentProfile,
  onLogout,
  onNavigate,
  onThemeToggle,
  route,
  theme,
  user,
}: AppShellProps): ReactElement {
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) return user.role === "admin";
    if (item.ownerOnly) return user.familyRole === "owner" || user.familyRole === "manager";
    return true;
  });
  const mobileItems = visibleItems.filter((item) => item.path !== "/service-admin");

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
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-card">
          <span className="sidebar-card-label">보고 있는 프로필</span>
          <strong>{currentProfile.name}</strong>
          <p>{user.familyRole === "owner" ? "가족약에서 선택한 관리 대상" : "내 복용 기록 기준"}</p>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Family Medication Care</p>
            <h1>복용 기록을 정리하고, 가족 건강을 함께 확인하세요</h1>
          </div>
          <div className="topbar-actions">
            <ThemeToggle onToggle={onThemeToggle} theme={theme} />
            <div className="user-chip" aria-label="로그인 사용자">
              <span>{userRoleLabel(user)}</span>
              <strong>{user.name}</strong>
            </div>
            <button className="ghost-button" onClick={onLogout} type="button">
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
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function userRoleLabel(user: DemoUser): string {
  if (user.role === "admin") return "관리";
  if (user.familyRole === "owner") return "대표";
  if (user.familyRole === "manager") return "관리";
  return "가족";
}
