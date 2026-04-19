import { useState } from "react";
import type { ReactElement } from "react";
import { answerRuleBasedQuestion } from "../services/ruleChat";
import type { CareProfile, Medication, RuleChatResponse } from "../types";

interface RuleChatPageProps {
  currentProfile: CareProfile;
  medications: Medication[];
}

export function RuleChatPage({
  currentProfile,
  medications,
}: RuleChatPageProps): ReactElement {
  const [question, setQuestion] = useState("감기 걸렸을 때 감기약 먹어도 돼?");
  const [response, setResponse] = useState<RuleChatResponse>();
  const profileMeds = medications.filter((medication) => medication.careProfileId === currentProfile.id);

  function handleAsk(): void {
    setResponse(answerRuleBasedQuestion(question, profileMeds, currentProfile));
  }

  return (
    <div className="dashboard-layout">
      <section className="workspace-column">
        <section className="card">
          <div className="section-heading">
            <p className="eyebrow">Rule-based Assistant</p>
            <h2>비용 없는 규칙형 상담</h2>
            <p className="muted">상용 AI가 아니라 등록 약, 성분 중복, 주의 문구를 바탕으로 안전 안내를 제공합니다.</p>
          </div>
          <textarea
            aria-label="상담 질문"
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            value={question}
          />
          <button className="primary-button chat-submit-button" onClick={handleAsk} type="button">
            상담 안내 받기
          </button>
        </section>
        {response && (
          <section className="card">
            <p className="eyebrow">Answer</p>
            <h2>답변</h2>
            <p>{response.answer}</p>
            <p className="muted">{response.disclaimer}</p>
          </section>
        )}
      </section>
      <aside className="support-column">
        <section className="card compact-card">
          <p className="eyebrow">Medication Context</p>
          <h2>상담에 반영되는 약</h2>
          <ul className="timeline-list">
            {profileMeds.map((medication) => (
              <li key={medication.id}>{medication.productName}</li>
            ))}
          </ul>
        </section>
        {response && (
          <section className="card compact-card">
            <p className="eyebrow">Findings</p>
            <h2>주의 항목</h2>
            <ul className="finding-list">
              {response.findings.map((finding) => (
                <li className={finding.level === "고위험" ? "danger-box" : "warning-box"} key={finding.id}>
                  <strong>{finding.title}</strong>
                  <span>{finding.message}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
