import React from 'react';
import { formatAction } from '../format-action.js';
import { MessageList } from './MessageList.jsx';

export function ChatPanel({
  userId,
  sessionId,
  nextAction,
  isOnboardingCompleted,
  messages,
  input,
  recommendations,
  isLoading,
  error,
  quickPrompts,
  onNewChat,
  onInputChange,
  onSubmit,
  onQuickPrompt,
}) {
  const currentStep = getCurrentStep({ isOnboardingCompleted, messages });

  return (
    <section className="chat">
      <header className="chatHeader">
        <div>
          <p>AI Supplement Advisor</p>
          <h1>건강기능식품 추천 에이전트</h1>
          <span>복용 맥락을 먼저 확인하고, 수집한 상품 데이터로 추천합니다.</span>
        </div>
        <button className="ghostButton" type="button" onClick={onNewChat}>
          새 대화
        </button>
      </header>

      <div className="statusBar" aria-label="chat status">
        <div>
          <span>사용자</span>
          <strong>{userId}</strong>
        </div>
        <div>
          <span>세션</span>
          <strong>{sessionId ?? '미생성'}</strong>
        </div>
        <div>
          <span>온보딩</span>
          <strong className={isOnboardingCompleted ? 'statusDone' : 'statusPending'}>
            {isOnboardingCompleted ? '완료' : '진행 중'}
          </strong>
        </div>
        <div>
          <span>다음 액션</span>
          <strong>{formatAction(nextAction)}</strong>
        </div>
      </div>

      <div className="progressPanel" aria-label="recommendation flow">
        {[
          ['1', '건강 고민 확인'],
          ['2', '복용/질환 확인'],
          ['3', '상품 추천'],
        ].map(([step, label], index) => (
          <div
            className={[
              'progressStep',
              index + 1 < currentStep ? 'done' : '',
              index + 1 === currentStep ? 'active' : '',
            ].filter(Boolean).join(' ')}
            key={step}
          >
            <strong>{step}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <MessageList messages={messages} isLoading={isLoading} />

      <div className="chatFooter">
        {!isOnboardingCompleted && (
          <div className="quickPrompts" aria-label="example prompts">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuickPrompt(prompt)}
                disabled={isLoading}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="recommendationPanel">
            <div>
              <span>추천 상품 바로가기</span>
              <strong>{recommendations.length}개 상품</strong>
            </div>
            <div className="panelLinks">
              {recommendations.map((recommendation) => (
                <a
                  key={`${recommendation.name}-${recommendation.source_url}`}
                  href={recommendation.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{recommendation.brand || '추천 상품'}</span>
                  <strong>{recommendation.name}</strong>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <form className="composer" onSubmit={onSubmit}>
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={
            isOnboardingCompleted
              ? '예: 피로 회복에 좋은 영양제를 추천해줘'
              : '예: 40대 여성이고 요즘 피로랑 수면이 고민이에요'
          }
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          보내기
        </button>
      </form>
    </section>
  );
}

function getCurrentStep({ isOnboardingCompleted, messages }) {
  if (isOnboardingCompleted) return 3;

  const assistantQuestions = messages.filter(
    (message) => message.role === 'assistant' && message.action === 'ASK_QUESTION',
  ).length;

  return assistantQuestions >= 3 ? 2 : 1;
}
