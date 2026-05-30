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
  retrievedDocumentIds,
  recommendations,
  isLoading,
  error,
  quickPrompts,
  onNewChat,
  onInputChange,
  onSubmit,
  onQuickPrompt,
}) {
  return (
    <section className="chat">
      <header className="chatHeader">
        <div>
          <p>AI Supplement Advisor</p>
          <h1>건강기능식품 추천 에이전트</h1>
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

      <MessageList messages={messages} isLoading={isLoading} />

      <div className="chatFooter">
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

        {(retrievedDocumentIds.length > 0 || recommendations.length > 0) && (
          <div className="evidenceGrid">
            {retrievedDocumentIds.length > 0 && (
              <div className="retrievalPanel">
                <span>최근 RAG 참조 문서</span>
                <strong>{retrievedDocumentIds.join(', ')}</strong>
              </div>
            )}

            {recommendations.length > 0 && (
              <div className="retrievalPanel">
                <span>추천 상품 링크</span>
                <div className="panelLinks">
                  {recommendations.map((recommendation) => (
                    <a
                      key={`${recommendation.name}-${recommendation.source_url}`}
                      href={recommendation.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {recommendation.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
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
