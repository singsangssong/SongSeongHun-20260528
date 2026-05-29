export function formatAction(action) {
  const labels = {
    ASK_QUESTION: '온보딩 질문',
    SEARCH_RAG: '추천 준비',
    RESPOND: '답변 완료',
  };

  return labels[action] ?? '대기 중';
}
