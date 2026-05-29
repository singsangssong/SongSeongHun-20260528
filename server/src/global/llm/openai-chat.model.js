import OpenAI from 'openai';
import { createRecommendationFormatInstruction } from './recommendation-answer-format.js';

export class OpenAIChatModel {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    client = null,
    model = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  } = {}) {
    this.client = client ?? new OpenAI({ apiKey });
    this.model = model;
  }

  async generate({ question, documents, userPreferences }) {
    const context = documents
      .map((document) => `제목: ${document.title}\n내용: ${document.content}`)
      .join('\n\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            '너는 건강기능식품 구매 판단을 돕는 AI 에이전트다.',
            '진단, 치료, 처방처럼 단정하지 말고 상품 정보 요약, 주의사항, 추천 이유를 짧고 명확하게 답한다.',
            createRecommendationFormatInstruction(),
          ].join('\n\n'),
        },
        {
          role: 'user',
          content: [
            `유저 질문: ${question}`,
            `유저 선호/건강 고민: ${JSON.stringify(userPreferences)}`,
            `검색된 상품 근거:\n${context}`,
          ].join('\n\n'),
        },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
