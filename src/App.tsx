import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { analyzeIngredients, assistantReply, buildEmptyAnalysis, summarizeFindings } from "./analysis";
import { demoUsers, interactionRules, profiles, reportStatuses } from "./data/demoData";
import {
  clearUser,
  loadCurrentProfileId,
  loadTheme,
  loadUser,
  saveCurrentProfileId,
  saveTheme,
  saveUser,
} from "./storage";
import type { AnalysisResult, DemoUser, Profile, ThemeMode } from "./types";

type Route = "/" | "/login" | "/profiles" | "/report" | "/admin";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const navItems: Array<{ path: Route; label: string; adminOnly?: boolean }> = [
  { path: "/", label: "대시보드" },
  { path: "/profiles", label: "가족" },
  { path: "/report", label: "리포트" },
  { path: "/admin", label: "Admin", adminOnly: true },
];

const basePath = "/yoona-app";

export function App(): ReactElement {
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [user, setUser] = useState<DemoUser | null>(() => loadUser());
  const [route, setRoute] = useState<Route>(() => getInitialRoute());
  const [currentProfileId, setCurrentProfileId] = useState(() =>
    loadCurrentProfileId(profiles[0].id),
  );

  const currentProfile = useMemo(
    () => profiles.find((profile) => profile.id === currentProfileId) || profiles[0],
    [currentProfileId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const onPopState = (): void => setRoute(getRouteFromLocation());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!user && route !== "/login") {
      setRoute("/login");
      replaceRoute("/login");
    }

    if (user?.role !== "admin" && route === "/admin") {
      setRoute("/");
      replaceRoute("/");
    }
  }, [route, user]);

  function navigate(nextRoute: Route): void {
    if (!user && nextRoute !== "/login") {
      pushRoute("/login");
      setRoute("/login");
      return;
    }

    if (nextRoute === "/admin" && user?.role !== "admin") {
      pushRoute("/");
      setRoute("/");
      return;
    }

    pushRoute(nextRoute);
    setRoute(nextRoute);
  }

  function handleLogin(nextUser: DemoUser): void {
    saveUser(nextUser);
    setUser(nextUser);
    pushRoute("/");
    setRoute("/");
  }

  function handleLogout(): void {
    clearUser();
    setUser(null);
    navigate("/login");
  }

  function handleProfileChange(profileId: string): void {
    saveCurrentProfileId(profileId);
    setCurrentProfileId(profileId);
  }

  const shell = (
    <AppShell
      currentProfile={currentProfile}
      onLogout={handleLogout}
      onNavigate={navigate}
      onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
      route={route}
      theme={theme}
      user={user}
    >
      {route === "/" && (
        <DashboardPage
          currentProfile={currentProfile}
          onProfileChange={handleProfileChange}
        />
      )}
      {route === "/profiles" && (
        <ProfilesPage
          currentProfileId={currentProfile.id}
          onProfileChange={handleProfileChange}
        />
      )}
      {route === "/report" && <ReportPage currentProfile={currentProfile} />}
      {route === "/admin" && user?.role === "admin" && <AdminPage />}
    </AppShell>
  );

  return route === "/login" || !user ? (
    <LoginPage
      onLogin={handleLogin}
      onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
      theme={theme}
    />
  ) : (
    shell
  );
}

interface AppShellProps {
  children: ReactNode;
  currentProfile: Profile;
  onLogout: () => void;
  onNavigate: (route: Route) => void;
  onThemeToggle: () => void;
  route: Route;
  theme: ThemeMode;
  user: DemoUser | null;
}

function AppShell({
  children,
  currentProfile,
  onLogout,
  onNavigate,
  onThemeToggle,
  route,
  theme,
  user,
}: AppShellProps): ReactElement {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">O</span>
          <div>
            <strong>Opti-Me</strong>
            <span>AI 복용비서</span>
          </div>
        </div>
        <nav aria-label="주요 메뉴" className="nav-list">
          {navItems
            .filter((item) => !item.adminOnly || user?.role === "admin")
            .map((item) => (
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
          <span>현재 프로필</span>
          <strong>{currentProfile.name}</strong>
          <p>{currentProfile.type === "pet" ? "반려동물" : "가족"} 복용 상태 확인 중</p>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Demo MVP</p>
            <h1>안전한 복용 루틴을 한 곳에서</h1>
          </div>
          <div className="topbar-actions">
            <ThemeToggle onToggle={onThemeToggle} theme={theme} />
            <div className="user-chip" aria-label="로그인 사용자">
              <span>{user?.name.slice(0, 1)}</span>
              <strong>{user?.name}</strong>
            </div>
            <button className="ghost-button" onClick={onLogout} type="button">
              로그아웃
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>

      <nav aria-label="모바일 메뉴" className="mobile-tabbar">
        {navItems
          .filter((item) => !item.adminOnly || user?.role === "admin")
          .map((item) => (
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

interface LoginPageProps {
  onLogin: (user: DemoUser) => void;
  onThemeToggle: () => void;
  theme: ThemeMode;
}

function LoginPage({ onLogin, onThemeToggle, theme }: LoginPageProps): ReactElement {
  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Opti-Me 소개">
        <div className="login-copy">
          <p className="eyebrow">Opti-Me MVP</p>
          <h1>가족의 약과 영양제 루틴을 더 선명하게.</h1>
          <p>
            AI 스캔, 병용 주의, 가족·펫 프로필, 의료 리포트를 하나의 웹앱
            구조로 연결합니다.
          </p>
        </div>
        <img
          alt="의약품을 정리하는 모습"
          className="login-image"
          src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80"
        />
      </section>
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card-head">
          <span className="brand-mark">O</span>
          <ThemeToggle onToggle={onThemeToggle} theme={theme} />
        </div>
        <p className="eyebrow">데모 로그인</p>
        <h2 id="login-title">역할을 선택해 시작하세요</h2>
        <p className="muted">
          실제 계정 연동 전까지 GitHub Pages에서 바로 확인할 수 있는 데모
          로그인입니다.
        </p>
        <div className="login-actions">
          {demoUsers.map((demoUser) => (
            <button
              className="primary-button"
              key={demoUser.id}
              onClick={() => onLogin(demoUser)}
              type="button"
            >
              {demoUser.role === "admin" ? "관리자로 시작" : "사용자로 시작"}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

interface DashboardPageProps {
  currentProfile: Profile;
  onProfileChange: (profileId: string) => void;
}

function DashboardPage({
  currentProfile,
  onProfileChange,
}: DashboardPageProps): ReactElement {
  const [ingredientInput, setIngredientInput] = useState(currentProfile.meds.join(", "));
  const [analysis, setAnalysis] = useState<AnalysisResult>(() =>
    buildEmptyAnalysis(currentProfile),
  );
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "성분을 입력하면 복용 안전도를 분석해드릴게요.",
    },
  ]);

  useEffect(() => {
    const nextInput = currentProfile.meds.join(", ");
    setIngredientInput(nextInput);
    setAnalysis(analyzeIngredients(nextInput, currentProfile));
  }, [currentProfile]);

  function handleAnalyze(): void {
    setAnalysis(analyzeIngredients(ingredientInput, currentProfile));
  }

  function handleSend(): void {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const reply = assistantReply(trimmed, currentProfile);
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: crypto.randomUUID(), role: "user", text: trimmed },
      { id: crypto.randomUUID(), role: "assistant", text: reply },
    ]);
    setChatInput("");
  }

  return (
    <div className="dashboard-layout">
      <section className="workspace-column">
        <div className="profile-strip card">
          {profiles.map((profile) => (
            <button
              className={profile.id === currentProfile.id ? "profile-pill active" : "profile-pill"}
              key={profile.id}
              onClick={() => onProfileChange(profile.id)}
              type="button"
            >
              <span>{profile.name}</span>
              <small>{profile.type === "pet" ? "펫" : `${profile.ageGroup}+`}</small>
            </button>
          ))}
        </div>

        <section className="analysis-card card" aria-labelledby="analysis-title">
          <div className="section-heading">
            <p className="eyebrow">AI Scan</p>
            <h2 id="analysis-title">성분 분석</h2>
          </div>
          <label htmlFor="ingredient-input">성분 입력</label>
          <textarea
            id="ingredient-input"
            onChange={(event) => setIngredientInput(event.target.value)}
            placeholder="예시: 비타민C 1000mg, 칼슘 500mg, 철분 18mg"
            rows={5}
            value={ingredientInput}
          />
          <button className="primary-button" onClick={handleAnalyze} type="button">
            성분 분석하기
          </button>
          <AnalysisSummary analysis={analysis} />
        </section>
      </section>

      <aside className="support-column">
        <TimelinePanel timeline={analysis.timeline} />
        <ChatPanel
          chatInput={chatInput}
          messages={messages}
          onChatInputChange={setChatInput}
          onSend={handleSend}
        />
        <ReportSnapshot analysis={analysis} currentProfile={currentProfile} />
      </aside>
    </div>
  );
}

function AnalysisSummary({ analysis }: { analysis: AnalysisResult }): ReactElement {
  const statusClass =
    analysis.safetyLevel === "고위험"
      ? "danger"
      : analysis.safetyLevel === "주의"
        ? "warning"
        : "safe";

  return (
    <div className="analysis-result">
      <div className="metric-row">
        <span>복용 안전도</span>
        <strong className={statusClass}>{analysis.safetyLevel}</strong>
      </div>
      <p>
        분석 성분:{" "}
        <strong>{analysis.ingredients.length ? analysis.ingredients.join(", ") : "미입력"}</strong>
      </p>
      <ul>
        {analysis.findings.length ? (
          analysis.findings.map((finding) => (
            <li key={finding.id}>
              <strong>[{finding.level}]</strong> {finding.message}
            </li>
          ))
        ) : (
          <li>중대한 충돌은 탐지되지 않았습니다.</li>
        )}
      </ul>
    </div>
  );
}

function TimelinePanel({ timeline }: { timeline: string[] }): ReactElement {
  return (
    <section className="card compact-card" aria-labelledby="timeline-title">
      <div className="section-heading">
        <p className="eyebrow">Timeline</p>
        <h2 id="timeline-title">오늘 복용 흐름</h2>
      </div>
      <ol className="timeline-list">
        {timeline.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}

interface ChatPanelProps {
  chatInput: string;
  messages: ChatMessage[];
  onChatInputChange: (value: string) => void;
  onSend: () => void;
}

function ChatPanel({
  chatInput,
  messages,
  onChatInputChange,
  onSend,
}: ChatPanelProps): ReactElement {
  return (
    <section className="card compact-card chat-card" aria-labelledby="chat-title">
      <div className="section-heading">
        <p className="eyebrow">Assistant</p>
        <h2 id="chat-title">AI 채팅</h2>
      </div>
      <div className="chat-log" aria-live="polite">
        {messages.map((message) => (
          <p className={message.role === "user" ? "chat-bubble user" : "chat-bubble"} key={message.id}>
            {message.text}
          </p>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          aria-label="AI 비서에게 질문"
          onChange={(event) => onChatInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSend();
          }}
          placeholder="감기약이랑 같이 먹어도 돼?"
          type="text"
          value={chatInput}
        />
        <button className="primary-button" onClick={onSend} type="button">
          전송
        </button>
      </div>
    </section>
  );
}

interface ReportSnapshotProps {
  analysis: AnalysisResult;
  currentProfile: Profile;
}

function ReportSnapshot({ analysis, currentProfile }: ReportSnapshotProps): ReactElement {
  return (
    <section className="card compact-card">
      <div className="section-heading">
        <p className="eyebrow">Report</p>
        <h2>의료 리포트 요약</h2>
      </div>
      <p className="muted">
        {currentProfile.name} · {summarizeFindings(analysis.findings)}
      </p>
    </section>
  );
}

interface ProfilesPageProps {
  currentProfileId: string;
  onProfileChange: (profileId: string) => void;
}

function ProfilesPage({
  currentProfileId,
  onProfileChange,
}: ProfilesPageProps): ReactElement {
  return (
    <section className="page-grid">
      {profiles.map((profile) => (
        <article className="card profile-card" key={profile.id}>
          <div>
            <p className="eyebrow">{profile.type === "pet" ? "Pet" : "Family"}</p>
            <h2>{profile.name}</h2>
            <p className="muted">연령대 {profile.ageGroup}+ · 복용 {profile.meds.length}개</p>
          </div>
          <ul className="tag-list">
            {profile.meds.map((med) => (
              <li key={med}>{med}</li>
            ))}
          </ul>
          <button
            className={currentProfileId === profile.id ? "primary-button" : "ghost-button"}
            onClick={() => onProfileChange(profile.id)}
            type="button"
          >
            {currentProfileId === profile.id ? "확인 중" : "프로필 보기"}
          </button>
        </article>
      ))}
    </section>
  );
}

function ReportPage({ currentProfile }: { currentProfile: Profile }): ReactElement {
  const analysis = buildEmptyAnalysis(currentProfile);

  return (
    <section className="report-page card">
      <div className="section-heading">
        <p className="eyebrow">Medical Report</p>
        <h2>전문가용 의료 리포트</h2>
      </div>
      <div className="report-document">
        <p>
          <strong>대상:</strong> {currentProfile.name}
        </p>
        <p>
          <strong>현재 복용 성분:</strong> {analysis.ingredients.join(", ")}
        </p>
        <p>
          <strong>복용 안전도:</strong> {analysis.safetyLevel}
        </p>
        <p>
          <strong>AI 종합 의견:</strong> {summarizeFindings(analysis.findings)}
        </p>
        <p className="muted">본 리포트는 데모 데이터 기반이며 의료행위를 대체하지 않습니다.</p>
      </div>
      <button className="primary-button" onClick={() => window.print()} type="button">
        인쇄 / PDF 저장
      </button>
    </section>
  );
}

function AdminPage(): ReactElement {
  return (
    <div className="admin-layout">
      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Admin</p>
          <h2>운영 현황</h2>
        </div>
        <div className="stat-grid">
          {reportStatuses.map((status) => (
            <div className="stat-card" key={status.label}>
              <span>{status.label}</span>
              <strong>{status.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Users</p>
          <h2>데모 사용자</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>역할</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {demoUsers.map((demoUser) => (
                <tr key={demoUser.id}>
                  <td>{demoUser.name}</td>
                  <td>{demoUser.role}</td>
                  <td>활성</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Rules</p>
          <h2>상호작용 룰</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>성분 조합</th>
                <th>등급</th>
                <th>안내</th>
              </tr>
            </thead>
            <tbody>
              {interactionRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.pair.join(" + ")}</td>
                  <td>{rule.level}</td>
                  <td>{rule.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ThemeToggle({
  onToggle,
  theme,
}: {
  onToggle: () => void;
  theme: ThemeMode;
}): ReactElement {
  return (
    <button className="theme-toggle" onClick={onToggle} type="button">
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

function getInitialRoute(): Route {
  const params = new URLSearchParams(window.location.search);
  const redirectedRoute = params.get("route");
  if (redirectedRoute) {
    const route = normalizeRoute(redirectedRoute);
    replaceRoute(route);
    return route;
  }

  return getRouteFromLocation();
}

function getRouteFromLocation(): Route {
  const path = window.location.pathname.replace(basePath, "") || "/";
  return normalizeRoute(path);
}

function normalizeRoute(path: string): Route {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (["/", "/login", "/profiles", "/report", "/admin"].includes(normalized)) {
    return normalized as Route;
  }
  return "/";
}

function pushRoute(route: Route): void {
  window.history.pushState({}, "", `${basePath}${route === "/" ? "/" : route}`);
}

function replaceRoute(route: Route): void {
  window.history.replaceState({}, "", `${basePath}${route === "/" ? "/" : route}`);
}
