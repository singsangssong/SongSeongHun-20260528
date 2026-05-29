import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const demoUserId = 'demo-user';

const quickPrompts = [
  '40대 여성이고 요즘 피로랑 수면이 고민이에요',
  '임신은 아니고 갑상선 질환으로 관리 중이에요',
  '갑상선약을 먹고 있고 유산균도 먹어요',
  '수면 부족하고 야근이 많아요. 카페인은 피하고 구미가 좋아요',
  '피로 회복에 좋은 영양제를 추천해줘',
];

function formatAction(action) {
  const labels = {
    ASK_QUESTION: '온보딩 질문',
    SEARCH_RAG: '추천 준비',
    RESPOND: '답변 완료',
  };

  return labels[action] ?? '대기 중';
}

function App() {
  const [messages, setMessages] = useState([
      {
        role: 'assistant',
        content: '건강기능식품 선택을 도와드릴게요. 먼저 연령대와 건강 고민을 알려주세요.',
        action: 'ASK_QUESTION',
      },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [nextAction, setNextAction] = useState('ASK_QUESTION');
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [retrievedDocumentIds, setRetrievedDocumentIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (content) => {
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: demoUserId,
          session_id: sessionId,
          message: content,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setSessionId(data.session_id ?? sessionId);
      setNextAction(data.next_action ?? 'RESPOND');
      setIsOnboardingCompleted(Boolean(data.is_onboarding_completed));
      setRetrievedDocumentIds(data.retrieved_document_ids ?? []);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.message,
          action: data.next_action,
          retrievedDocumentIds: data.retrieved_document_ids ?? [],
        },
      ]);
    } catch {
      setError('응답을 가져오지 못했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input.trim());
  };

  const resetConversation = () => {
    setMessages([
      {
        role: 'assistant',
        content: '새 대화를 시작할게요. 먼저 연령대와 건강 고민을 알려주세요.',
        action: 'ASK_QUESTION',
      },
    ]);
    setInput('');
    setSessionId(null);
    setNextAction('ASK_QUESTION');
    setIsOnboardingCompleted(false);
    setRetrievedDocumentIds([]);
    setError('');
  };

  return (
    <main className="app">
      <section className="chat">
        <header className="chatHeader">
          <div>
            <p>Levit Assignment MVP</p>
            <h1>건강기능식품 추천 에이전트</h1>
          </div>
          <button className="ghostButton" type="button" onClick={resetConversation}>
            새 대화
          </button>
        </header>

        <div className="statusBar" aria-label="chat status">
          <div>
            <span>사용자</span>
            <strong>{demoUserId}</strong>
          </div>
          <div>
            <span>세션</span>
            <strong>{sessionId ?? '미생성'}</strong>
          </div>
          <div>
            <span>온보딩</span>
            <strong>{isOnboardingCompleted ? '완료' : '진행 중'}</strong>
          </div>
          <div>
            <span>다음 액션</span>
            <strong>{formatAction(nextAction)}</strong>
          </div>
        </div>

        <div className="messages">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              <p>{message.content}</p>
              {message.action && (
                <span className="messageMeta">{formatAction(message.action)}</span>
              )}
              {message.retrievedDocumentIds?.length > 0 && (
                <span className="messageMeta">
                  참조: {message.retrievedDocumentIds.join(', ')}
                </span>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant">
              <p>답변을 정리하고 있어요...</p>
              <span className="messageMeta">요청 처리 중</span>
            </div>
          )}
        </div>

        <div className="quickPrompts" aria-label="example prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        {retrievedDocumentIds.length > 0 && (
          <div className="retrievalPanel">
            <span>최근 RAG 참조 문서</span>
            <strong>{retrievedDocumentIds.join(', ')}</strong>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <form className="composer" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
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
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
