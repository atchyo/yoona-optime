import { useState } from "react";
import type { ReactElement } from "react";
import { answerRuleBasedQuestion } from "../services/ruleChat";
import type { CareProfile, Medication, RuleChatResponse } from "../types";

interface RuleChatPageProps {
  currentProfile: CareProfile;
  medications: Medication[];
}

const exampleQuestions = [
  "감기약 먹어도 괜찮을까요?",
  "오메가3와 혈압약을 같이 먹어도 되나요?",
  "마그네슘을 오래 먹어도 되나요?",
  "운전 전에 감기약을 먹어도 되나요?",
];

const quickQuestions = [
  "감기약 먹고 운전해도 돼?",
  "영양제 같이 먹어도 돼?",
  "약을 깜빡했을 때는?",
];

const popularQuestions = [
  "감기약은 언제 먹는 게 좋나요?",
  "영양제는 함께 먹어도 되나요?",
  "약을 빼먹었을 땐 어떻게 하나요?",
  "위장이 약할 때 주의할 약은?",
  "어린이 약 복용량은 어떻게 보나요?",
];

export function RuleChatPage({
  currentProfile,
  medications,
}: RuleChatPageProps): ReactElement {
  const [question, setQuestion] = useState(exampleQuestions[0]);
  const [response, setResponse] = useState<RuleChatResponse>();
  const profileMeds = medications.filter((medication) => medication.careProfileId === currentProfile.id);

  function handleAsk(nextQuestion = question): void {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion) return;
    setQuestion(cleanQuestion);
    setResponse(answerRuleBasedQuestion(cleanQuestion, profileMeds, currentProfile));
  }

  return (
    <div className="chat-page">
      <div className="mobile-question-chips" aria-label="빠른 상담 질문">
        {quickQuestions.map((item) => (
          <button key={item} onClick={() => handleAsk(item)} type="button">
            {item}
          </button>
        ))}
      </div>

      <aside className="card chat-history-panel">
        <h2>최근 상담</h2>
        <div className="question-list">
          {exampleQuestions.map((item) => (
            <button
              className={item === question ? "question-item active" : "question-item"}
              key={item}
              onClick={() => handleAsk(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <section className="card chat-room-panel">
        <div className="section-heading">
          <h2>상담 내용</h2>
        </div>

        <div className="chat-message-list">
          <div className="chat-bubble user">{question}</div>
          {response ? (
            <div className="assistant-message-row">
              <span className="topbar-avatar" aria-hidden="true">🙂</span>
              <div className="chat-bubble assistant">
                <p>{response.answer}</p>
                <strong>확인하면 좋은 항목</strong>
                <ul>
                  {response.findings.length ? (
                    response.findings.slice(0, 3).map((finding) => <li key={finding.id}>{finding.title}</li>)
                  ) : (
                    <>
                      <li>약 봉투나 라벨의 성분명</li>
                      <li>졸음, 어지러움 경고 문구</li>
                      <li>복용 후 몸의 반응</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="assistant-message-row">
              <span className="topbar-avatar" aria-hidden="true">🙂</span>
              <div className="chat-bubble assistant">
                <p>
                  일반적인 감기약 중 일부는 졸음을 유발할 수 있는 성분이 포함되어 있어 운전에 주의가
                  필요합니다. 항히스타민제 또는 진해제 성분이 있는지 확인해 주세요.
                </p>
                <strong>확인하면 좋은 항목</strong>
                <ul>
                  <li>약 봉투나 라벨의 졸음 경고</li>
                  <li>복용, 어지러움 경고 문구</li>
                  <li>운전 전 복용 시간</li>
                </ul>
              </div>
            </div>
          )}
          <div className="chat-bubble user confirm">네, 확인해보겠습니다.</div>
          <aside className="chat-safety-note">
            <strong>안전 안내</strong>
            <span>응급 증상이나 심한 부작용이 있다면 즉시 의료기관에 문의하세요.</span>
          </aside>
        </div>

        <div className="chat-input-row">
          <input
            aria-label="상담 질문"
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAsk();
            }}
            placeholder="궁금한 내용을 입력하세요"
            value={question}
          />
          <button className="primary-button" onClick={() => handleAsk()} type="button">
            보내기
          </button>
        </div>
      </section>

      <aside className="chat-context-panel">
        <section className="card compact-card">
          <h2>인기 질문</h2>
          <div className="popular-question-list">
            {popularQuestions.map((item) => (
              <button key={item} onClick={() => handleAsk(item)} type="button">
                {item}
              </button>
            ))}
          </div>
        </section>
        <section className="card compact-card chat-principle-card">
          <h2>상담 원칙</h2>
          <p>
            등록된 약 정보를 바탕으로 안내하지만, 진단이나 처방은 대신하지 않습니다. 장기복용,
            중복성분, 운전 전 주의 문구를 우선 확인합니다.
          </p>
        </section>
      </aside>
    </div>
  );
}
