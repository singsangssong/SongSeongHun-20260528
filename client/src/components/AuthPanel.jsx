import React from 'react';

export function AuthPanel({
  authMode,
  authForm,
  error,
  onAuthModeChange,
  onAuthFormChange,
  onSubmit,
}) {
  return (
    <main className="app">
      <section className="authPanel">
        <div className="authHeader">
          <p>Levit Assignment</p>
          <h1>건강기능식품 추천 에이전트</h1>
          <span>
            건강 고민과 복용 맥락을 바탕으로 상품 정보를 비교해드려요.
          </span>
        </div>
        <div className="authTabs">
          <button
            className={authMode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => onAuthModeChange('login')}
          >
            로그인
          </button>
          <button
            className={authMode === 'signup' ? 'active' : ''}
            type="button"
            onClick={() => onAuthModeChange('signup')}
          >
            회원가입
          </button>
        </div>
        <form className="authForm" onSubmit={onSubmit}>
          <label>
            <span>이메일</span>
            <input
              value={authForm.email}
              onChange={(event) => onAuthFormChange('email', event.target.value)}
              placeholder="email@example.com"
              type="email"
            />
          </label>
          {authMode === 'signup' && (
            <label>
              <span>닉네임</span>
              <input
                value={authForm.nickname}
                onChange={(event) => onAuthFormChange('nickname', event.target.value)}
                placeholder="닉네임"
              />
            </label>
          )}
          <label>
            <span>비밀번호</span>
            <input
              value={authForm.password}
              onChange={(event) => onAuthFormChange('password', event.target.value)}
              placeholder="비밀번호 8자 이상"
              type="password"
            />
          </label>
          <button type="submit">
            {authMode === 'signup' ? '회원가입' : '로그인'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
