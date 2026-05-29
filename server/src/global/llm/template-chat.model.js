import { recommendationAnswerSections } from './recommendation-answer-format.js';

export class TemplateChatModel {
  async generate({ question, documents, userPreferences }) {
    const concerns = userPreferences.healthConcerns?.length
      ? userPreferences.healthConcerns.join(', ')
      : '아직 수집 중';
    const medications = userPreferences.medications?.length
      ? userPreferences.medications.join(', ')
      : '확인된 복용 약 없음';
    const lifestyle = userPreferences.lifestylePatterns?.length
      ? userPreferences.lifestylePatterns.join(', ')
      : '생활패턴 정보 부족';
    const documentSummary = documents
      .map((document) => `- ${document.title}: ${document.content}`)
      .join('\n');
    const [summary, reason, caution, evidence, followUp] = recommendationAnswerSections;

    return [
      `${summary}`,
      `현재 질문 "${question}"과 온보딩 정보를 보면 ${concerns} 맥락의 상품 정보를 먼저 비교하는 것이 좋아요.`,
      '',
      `${reason}`,
      `수집된 생활 맥락은 ${lifestyle}이고, 검색된 근거가 이 고민과 연결됩니다.`,
      '',
      `${caution}`,
      `복용 약 정보는 ${medications}입니다. 이 답변은 구매 판단을 돕기 위한 정보 요약이며, 진단이나 치료 조언은 아닙니다.`,
      '',
      `${evidence}`,
      documentSummary || '- 아직 참고할 상품 정보가 충분하지 않습니다.',
      '',
      `${followUp}`,
      '복용 중인 약, 질환, 임신/수유 여부가 바뀌었다면 먼저 알려주세요.',
    ].join('\n');
  }
}
