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

  async classifyIntent({ question, userPreferences }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            '너는 건강기능식품 추천 채팅의 대화 의도를 분류하는 라우터다.',
            '사용자의 말을 상품 검색으로 보낼지, 일반 대화 응답으로 처리할지 결정한다.',
            '가능한 intent는 RECOMMENDATION, CLARIFICATION, PROFILE_UPDATE, SAFETY_CONTEXT, OFF_TOPIC 중 하나다.',
            'RECOMMENDATION: 상품 추천, 성분 비교, 건강 고민 기반 추천 요청.',
            'CLARIFICATION: 이전 답변을 이해하지 못했거나 더 쉽게/다르게 설명해달라는 요청.',
            'PROFILE_UPDATE: 사용자의 나이, 생활패턴, 선호, 피하고 싶은 성분 등 개인 정보 업데이트.',
            'SAFETY_CONTEXT: 임신/수유/질환/복용약/부작용/안전성 관련 내용.',
            'OFF_TOPIC: 건강기능식품 추천과 관련이 약한 일반 잡담.',
            '반드시 JSON으로만 답한다. 예: {"intent":"OFF_TOPIC","reason":"날씨 질문"}',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `사용자 메시지: ${question}`,
            `현재 유저 맥락: ${JSON.stringify(userPreferences ?? {})}`,
          ].join('\n\n'),
        },
      ],
    });

    return JSON.parse(response.choices[0]?.message?.content ?? '{}');
  }

  async generateConversationalReply({ intent, question, userPreferences }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: [
            '너는 건강기능식품 추천 채팅의 대화형 응답을 담당한다.',
            '상품 검색 결과를 만들지 않는다. 상품명, 가격, 효능을 새로 지어내지 않는다.',
            '사용자 말에 먼저 자연스럽게 반응하고, 필요하면 건강기능식품 추천 흐름으로 부드럽게 되돌린다.',
            '진단, 치료, 처방처럼 단정하지 않는다.',
            '답변은 한국어로 2-4문장, 친절하지만 과장 없이 작성한다.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `분류된 intent: ${intent}`,
            `사용자 메시지: ${question}`,
            `현재 유저 맥락: ${JSON.stringify(userPreferences ?? {})}`,
          ].join('\n\n'),
        },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  }
}
