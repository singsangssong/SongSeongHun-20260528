import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthPanel } from './components/AuthPanel.jsx';
import { ChatPanel } from './components/ChatPanel.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const authStorageKey = 'levit-auth';

const quickPrompts = [
  '40대 여성이고 요즘 피로랑 수면이 고민이에요',
  '임신은 아니고 갑상선 질환으로 관리 중이에요',
  '갑상선약을 먹고 있고 유산균도 먹어요',
  '수면 부족하고 야근이 많아요. 카페인은 피하고 구미가 좋아요',
  '피로 회복에 좋은 영양제를 추천해줘',
];

const initialMessage = {
  role: 'assistant',
  content: '건강기능식품 선택을 도와드릴게요. 먼저 연령대와 건강 고민을 알려주세요.',
  action: 'ASK_QUESTION',
};

function App() {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    nickname: '',
    password: '',
  });
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [nextAction, setNextAction] = useState('ASK_QUESTION');
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [retrievedDocumentIds, setRetrievedDocumentIds] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const userId = auth?.user?.email ?? '';
  const authHeaders = auth?.token
    ? { Authorization: `Bearer ${auth.token}` }
    : {};

  useEffect(() => {
    if (auth?.token) {
      loadSessions(auth.token);
    }
  }, [auth?.token]);

  const updateAuthForm = (field, value) => {
    setAuthForm((current) => ({ ...current, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? 'auth failed');
      }

      window.localStorage.setItem(authStorageKey, JSON.stringify(data));
      setAuth(data);
      resetConversationState();
      await loadSessions(data.token);
    } catch (authError) {
      setError(formatAuthError(authError));
    }
  };

  const loadSessions = async (token = auth?.token) => {
    if (!token) return;

    const response = await fetch(`${apiBaseUrl}/api/chat/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const data = await response.json();
    setSessions(data.sessions ?? []);
  };

  const loadMessages = async (selectedSessionId) => {
    const response = await fetch(
      `${apiBaseUrl}/api/chat/sessions/${selectedSessionId}/messages`,
      { headers: authHeaders },
    );
    if (!response.ok) return;

    const data = await response.json();
    setSessionId(data.session.id);
    setMessages(data.messages.map(toClientMessage));
  };

  const sendMessage = async (content) => {
    if (!content || isLoading) return;

    setMessages((current) => [...current, { role: 'user', content }]);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          session_id: sessionId,
          message: content,
        }),
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? 'API request failed');
      }

      setSessionId(data.session_id ?? sessionId);
      setNextAction(data.next_action ?? 'RESPOND');
      setIsOnboardingCompleted(Boolean(data.is_onboarding_completed));
      setRetrievedDocumentIds(data.retrieved_document_ids ?? []);
      setRecommendations(data.recommendations ?? []);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.message,
          action: data.next_action,
          retrievedDocumentIds: data.retrieved_document_ids ?? [],
          recommendations: data.recommendations ?? [],
        },
      ]);
      await loadSessions();
    } catch (chatError) {
      setError(formatChatError(chatError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input.trim());
  };

  const resetConversation = () => {
    resetConversationState('새 대화를 시작할게요. 먼저 연령대와 건강 고민을 알려주세요.');
  };

  const logout = () => {
    window.localStorage.removeItem(authStorageKey);
    setAuth(null);
    setSessions([]);
    resetConversationState();
  };

  const resetConversationState = (message = initialMessage.content) => {
    setMessages([{ ...initialMessage, content: message }]);
    setInput('');
    setSessionId(null);
    setNextAction('ASK_QUESTION');
    setIsOnboardingCompleted(false);
    setRetrievedDocumentIds([]);
    setRecommendations([]);
    setError('');
  };

  if (!auth) {
    return (
      <AuthPanel
        authMode={authMode}
        authForm={authForm}
        error={error}
        onAuthModeChange={setAuthMode}
        onAuthFormChange={updateAuthForm}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <main className="app">
      <section className="workspace">
        <Sidebar
          user={auth.user}
          sessions={sessions}
          sessionId={sessionId}
          onNewChat={resetConversation}
          onLogout={logout}
          onSelectSession={loadMessages}
        />
        <ChatPanel
          userId={userId}
          sessionId={sessionId}
          nextAction={nextAction}
          isOnboardingCompleted={isOnboardingCompleted}
          messages={messages}
          input={input}
          retrievedDocumentIds={retrievedDocumentIds}
          recommendations={recommendations}
          isLoading={isLoading}
          error={error}
          quickPrompts={quickPrompts}
          onNewChat={resetConversation}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onQuickPrompt={sendMessage}
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);

function readStoredAuth() {
  const stored = window.localStorage.getItem(authStorageKey);
  return stored ? JSON.parse(stored) : null;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function toClientMessage(message) {
  return {
    role: message.role,
    content: message.content,
    action: message.metadata?.next_action,
    retrievedDocumentIds: message.metadata?.retrieved_document_ids ?? [],
    recommendations: message.metadata?.recommendations ?? [],
  };
}

function formatAuthError(error) {
  const message = error instanceof Error ? error.message : '';
  const labels = {
    'invalid email or password': '이메일 또는 비밀번호가 맞지 않아요.',
    'email already exists': '이미 가입된 이메일이에요. 로그인으로 진행해주세요.',
    'email, nickname, and password(8+) are required':
      '이메일, 닉네임, 8자 이상의 비밀번호가 필요해요.',
    'internal server error':
      '서버 오류가 발생했어요. DB migration이 적용됐는지 확인해주세요.',
  };

  return labels[message] ?? '인증 요청에 실패했어요. 서버 실행 상태와 입력값을 확인해주세요.';
}

function formatChatError(error) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'authorization token is required') {
    return '로그인이 필요해요. 다시 로그인해주세요.';
  }

  return '응답을 가져오지 못했어요. 서버가 실행 중인지 확인해주세요.';
}
