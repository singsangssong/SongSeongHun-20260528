import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '건강기능식품 선택을 도와드릴게요. 지금 가장 궁금한 상품이나 건강 고민을 알려주세요.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = input.trim();
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
          user_id: 'demo-user',
          message: content,
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: data.message },
      ]);
    } catch {
      setError('응답을 가져오지 못했어요. 서버가 실행 중인지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="chat">
        <header className="chatHeader">
          <p>AI Supplement Agent</p>
          <h1>건강기능식품 추천 도우미</h1>
        </header>

        <div className="messages">
          {messages.map((message, index) => (
            <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
              {message.content}
            </div>
          ))}
          {isLoading && <div className="message assistant">답변을 정리하고 있어요...</div>}
        </div>

        {error && <p className="error">{error}</p>}

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="예: 요즘 피곤한데 비타민 B를 봐도 될까요?"
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
