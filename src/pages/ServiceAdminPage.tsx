import type { ReactElement } from "react";
import { drugMatches, interactionRules } from "../data/demoData";

export function ServiceAdminPage(): ReactElement {
  return (
    <div className="admin-layout">
      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Service Admin</p>
          <h2>약 DB 연동 상태</h2>
          <p className="muted">
            운영 환경에서는 식약처 공공 API 키와 Supabase Edge Functions를 통해 검색합니다.
          </p>
        </div>
        <div className="stat-grid">
          <div className="stat-card"><span>데모 후보</span><strong>{drugMatches.length}</strong></div>
          <div className="stat-card"><span>규칙</span><strong>{interactionRules.length}</strong></div>
          <div className="stat-card"><span>AI 비용</span><strong>0원</strong></div>
        </div>
      </section>
    </div>
  );
}
