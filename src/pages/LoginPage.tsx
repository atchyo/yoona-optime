import { useState } from "react";
import type { ReactElement } from "react";
import { isSupabaseConfigured } from "../config";
import { signInWithProvider } from "../services/supabaseClient";
import { ThemeToggle } from "../components/ThemeToggle";
import type { ThemeMode } from "../types";

interface LoginPageProps {
  onThemeToggle: () => void;
  theme: ThemeMode;
}

export function LoginPage({
  onThemeToggle,
  theme,
}: LoginPageProps): ReactElement {
  const [authProvider, setAuthProvider] = useState<"google" | "kakao" | "">("");
  const [authMessage, setAuthMessage] = useState("");

  async function startProviderLogin(provider: "google" | "kakao"): Promise<void> {
    setAuthProvider(provider);
    setAuthMessage("");

    try {
      await signInWithProvider(provider);
    } catch (error) {
      setAuthProvider("");
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "로그인 연결 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Opti-Me 소개">
        <div className="login-copy">
          <p className="eyebrow">Opti-Me V2</p>
          <h1>
            <span>가족과 반려동물,</span>
            <span>건강 루틴을 한곳에서.</span>
          </h1>
          <p>
            약과 영양제 기록, 복용 주기, 장기복용 검토와 반려동물 케어 정보를 한곳에서 확인하세요.
          </p>
        </div>
        <img
          alt="영양제와 건강 루틴을 확인하는 모습"
          className="login-image"
          src="https://images.unsplash.com/photo-1687200267991-d86b8df69968?auto=format&fit=crop&w=1200&q=80"
        />
      </section>
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card-head">
          <ThemeToggle onToggle={onThemeToggle} theme={theme} />
        </div>
        <h2 id="login-title">옵티미에 로그인</h2>
        <p className="muted">
          최적화된 건강관리 습관을 가족과 함께 시작하세요.
        </p>
        <div className="login-actions">
          <button
            className="social-button kakao-login"
            disabled={!isSupabaseConfigured || Boolean(authProvider)}
            onClick={() => void startProviderLogin("kakao")}
            type="button"
          >
            <span className="provider-icon kakao-icon" aria-hidden="true" />
            {authProvider === "kakao" ? "Kakao 로그인 중" : "Kakao 로그인"}
          </button>
          <button
            className="social-button google-login"
            disabled={!isSupabaseConfigured || Boolean(authProvider)}
            onClick={() => void startProviderLogin("google")}
            type="button"
          >
            <svg className="google-icon" aria-hidden="true" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            {authProvider === "google" ? "Google 로그인 중" : "Google 로그인"}
          </button>
        </div>
        {authMessage && <p className="login-error-note">{authMessage}</p>}
      </section>
    </main>
  );
}
