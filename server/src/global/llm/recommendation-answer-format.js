export const recommendationAnswerSections = [
  '추천 요약',
  '추천 이유',
  '주의할 점',
  '참고 근거',
  '추가 확인 질문',
];

export function createRecommendationFormatInstruction() {
  return [
    '아래 섹션 제목을 그대로 사용해 답변한다.',
    ...recommendationAnswerSections.map((section) => `- ${section}`),
    '각 섹션은 1-3문장으로 짧게 작성한다.',
    '근거가 부족하면 추천을 단정하지 말고 추가 확인 질문을 우선한다.',
  ].join('\n');
}
