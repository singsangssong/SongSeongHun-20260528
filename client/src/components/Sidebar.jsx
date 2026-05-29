import React from 'react';

export function Sidebar({
  user,
  sessions,
  sessionId,
  onNewChat,
  onLogout,
  onSelectSession,
}) {
  return (
    <aside className="sidebar">
      <div>
        <span>로그인 사용자</span>
        <strong>{user.nickname || user.email}</strong>
      </div>
      <button className="ghostButton" type="button" onClick={onNewChat}>
        새 대화
      </button>
      <button className="ghostButton" type="button" onClick={onLogout}>
        로그아웃
      </button>
      <div className="sessionList">
        <span>채팅방</span>
        {sessions.map((session) => (
          <button
            className={session.id === sessionId ? 'active' : ''}
            key={session.id}
            type="button"
            onClick={() => onSelectSession(session.id)}
          >
            {session.title || `대화 ${session.id}`}
          </button>
        ))}
      </div>
    </aside>
  );
}
