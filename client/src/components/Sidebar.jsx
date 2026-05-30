import React from 'react';

export function Sidebar({
  user,
  sessions,
  sessionId,
  onNewChat,
  onLogout,
  onSelectSession,
}) {
  const displayName = user.nickname || user.email;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebarBrand">
        <span>Levit</span>
        <strong>AI Agent</strong>
      </div>

      <div className="userCard">
        <div className="avatar" aria-hidden="true">{initial}</div>
        <div>
          <span>로그인 사용자</span>
          <strong>{displayName}</strong>
        </div>
      </div>

      <div className="sidebarActions">
        <button className="primaryButton" type="button" onClick={onNewChat}>
          새 대화
        </button>
        <button className="ghostButton" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </div>

      <div className="sessionList">
        <div className="sessionHeader">
          <span>채팅방</span>
          <strong>{sessions.length}</strong>
        </div>
        {sessions.length === 0 ? (
          <p className="emptyState">아직 저장된 대화가 없어요.</p>
        ) : (
          sessions.map((session) => (
            <button
              className={session.id === sessionId ? 'active' : ''}
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
            >
              <strong>{session.title || `대화 ${session.id}`}</strong>
              <span>{formatSessionDate(session.updated_at || session.created_at)}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

function formatSessionDate(value) {
  if (!value) return '최근 대화';

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
