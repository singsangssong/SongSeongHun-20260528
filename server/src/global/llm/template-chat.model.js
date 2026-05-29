export class TemplateChatModel {
  async generate({ documents, userPreferences }) {
    const concerns = userPreferences.healthConcerns?.length
      ? userPreferences.healthConcerns.join(', ')
      : '아직 수집 중';
    const documentSummary = documents
      .map((document) => `- ${document.title}: ${document.content}`)
      .join('\n');

    return [
      `현재 질문과 온보딩 정보를 바탕으로 보면, 먼저 ${concerns} 맥락을 확인하는 것이 좋아요.`,
      '',
      '참고한 상품 정보:',
      documentSummary || '- 아직 참고할 상품 정보가 충분하지 않습니다.',
      '',
      '주의: 이 답변은 구매 판단을 돕기 위한 정보 요약이며, 진단이나 치료 조언은 아닙니다.',
    ].join('\n');
  }
}

