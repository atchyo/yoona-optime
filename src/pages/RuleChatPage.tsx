import type { ReactElement } from "react";
import {
  CoreCard,
  CoreChatBubble,
  CoreIconCircle,
  CoreMenuPage,
} from "../components/CoreMenuScaffold";
import { Icon } from "../components/Icon";
import type { CareProfile, Medication } from "../types";

interface RuleChatPageProps {
  currentProfile: CareProfile;
  medications: Medication[];
}

const suggestedQuestions = [
  "감기약 먹으면서 운전해도 될까요?",
  "오메가3와 혈압약을 같이 먹어도 되나요?",
  "약을 깜빡했을 때는 어떻게 하나요?",
  "영양제를 한 번에 먹어도 괜찮나요?",
];

const recentConsults = [
  "감기약 복용 후 졸림 주의",
  "마그네슘 장기복용 확인",
  "어머니 저녁 영양제 점검",
];

export function RuleChatPage({ currentProfile, medications }: RuleChatPageProps): ReactElement {
  return (
    <CoreMenuPage
      description={`${currentProfile.name}님과 가족 복용 정보를 바탕으로 상담 UI 흐름을 보여주는 mock 상담 화면입니다.`}
      eyebrow="AI Consult"
      summary={[
        { icon: "chat", label: "최근 상담", value: "3건", helper: "이번 주", tone: "primary" },
        { icon: "pill", label: "참고 약", value: `${medications.length || 7}개`, helper: "등록 약 기준", tone: "neutral" },
        { icon: "warning", label: "주의 안내", value: "1건", helper: "운전 전 확인", tone: "danger" },
        { icon: "check", label: "상담 준비", value: "완료", helper: "mock preview", tone: "success" },
      ]}
      title="AI 건강 상담"
    >
      <div className="core-two-column">
        <CoreCard title="상담 미리보기" meta="Dashboard v2 AI bubble 패턴을 확장한 전용 상담 화면입니다.">
          <div className="core-chat-thread">
            <CoreChatBubble side="user">감기약 먹으면서 운전해도 될까요?</CoreChatBubble>
            <CoreChatBubble side="assistant">
              일반적인 감기약 중 일부는 졸음을 유발할 수 있어 운전에 주의가 필요합니다. 항히스타민 성분을 확인하고, 복용 전 약사와 상담해 보세요.
            </CoreChatBubble>
            <CoreChatBubble side="user">라벨에서 어떤 문구를 보면 될까요?</CoreChatBubble>
            <CoreChatBubble side="assistant">
              “졸음”, “운전 또는 기계 조작 주의”, “항히스타민” 문구를 먼저 확인해 주세요. 증상이 있으면 운전을 피하고 전문가와 상담하는 편이 안전합니다.
            </CoreChatBubble>
          </div>
          <div className="core-chat-input">
            <input aria-label="상담 질문" placeholder="궁금한 내용을 입력하세요..." readOnly />
            <button aria-label="전송" type="button"><Icon name="send" /></button>
          </div>
        </CoreCard>

        <div className="core-menu-page">
          <CoreCard title="추천 질문" meta="기능 연결 전 화면 밀도 확인용 mock 질문입니다.">
            <div className="core-option-grid">
              {suggestedQuestions.map((question) => (
                <article className="core-option" key={question}>
                  <strong>{question}</strong>
                  <p>상담 입력창에 바로 넣을 수 있는 예시 질문 카드입니다.</p>
                </article>
              ))}
            </div>
          </CoreCard>
          <CoreCard title="최근 상담 내역" meta="실제 상담 저장 로직 없이 preview만 제공합니다.">
            {recentConsults.map((item) => (
              <div className="core-list-row" key={item}>
                <CoreIconCircle icon="chat" tone="primary" />
                <div className="core-list-copy">
                  <strong>{item}</strong>
                  <small>오전 10:30 · {currentProfile.name}</small>
                </div>
                <div className="core-list-field empty" />
                <div className="core-list-field empty" />
                <div className="core-list-field empty" />
                <span className="core-badge tone-neutral">기록</span>
                <button className="core-secondary-button" type="button">열기</button>
              </div>
            ))}
          </CoreCard>
        </div>
      </div>
    </CoreMenuPage>
  );
}
