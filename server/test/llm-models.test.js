import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OpenAIChatModel } from '../src/global/llm/openai-chat.model.js';
import { TemplateChatModel } from '../src/global/llm/template-chat.model.js';

const expectedSections = [
  '추천 요약',
  '추천 이유',
  '주의할 점',
  '참고 근거',
  '추가 확인 질문',
];

describe('LLM models', () => {
  it('generates the local fallback answer with a fixed recommendation format', async () => {
    const model = new TemplateChatModel();
    const answer = await model.generate({
      question: '피로 회복에 좋은 영양제를 추천해줘',
      userPreferences: {
        healthConcerns: ['피로'],
        medications: ['갑상선약'],
        lifestylePatterns: ['수면 부족'],
      },
      documents: [
        {
          title: '비타민 B 컴플렉스 성분',
          content: '비타민 B군은 에너지 대사에 관여합니다.',
          metadata: { productName: '비타민 B 컴플렉스' },
        },
      ],
    });

    for (const section of expectedSections) {
      assert.match(answer, new RegExp(section));
    }
    assert.match(answer, /진단이나 치료 조언은 아닙니다/);
  });

  it('asks OpenAI to respond using the same fixed recommendation format', async () => {
    const calls = [];
    const model = new OpenAIChatModel({
      client: {
        chat: {
          completions: {
            async create(payload) {
              calls.push(payload);
              return {
                choices: [{ message: { content: 'ok' } }],
              };
            },
          },
        },
      },
    });

    const answer = await model.generate({
      question: '피로 회복에 좋은 영양제를 추천해줘',
      userPreferences: { healthConcerns: ['피로'] },
      documents: [],
    });

    assert.equal(answer, 'ok');
    const prompt = calls[0].messages.map((message) => message.content).join('\n');
    for (const section of expectedSections) {
      assert.match(prompt, new RegExp(section));
    }
    assert.match(prompt, /진단, 치료, 처방처럼 단정하지 말고/);
  });

  it('asks OpenAI to classify chat intent with a strict JSON prompt', async () => {
    const calls = [];
    const model = new OpenAIChatModel({
      client: {
        chat: {
          completions: {
            async create(payload) {
              calls.push(payload);
              return {
                choices: [
                  {
                    message: {
                      content: '{"intent":"OFF_TOPIC","reason":"weather question"}',
                    },
                  },
                ],
              };
            },
          },
        },
      },
    });

    const result = await model.classifyIntent({
      question: '오늘 날씨 어때?',
      userPreferences: { healthConcerns: ['피로'] },
    });

    assert.equal(result.intent, 'OFF_TOPIC');
    const prompt = calls[0].messages.map((message) => message.content).join('\n');
    assert.match(prompt, /반드시 JSON/);
    assert.match(prompt, /RECOMMENDATION/);
    assert.match(prompt, /CLARIFICATION/);
    assert.match(prompt, /OFF_TOPIC/);
  });

  it('asks OpenAI for a conversational reply without product recommendation format', async () => {
    const calls = [];
    const model = new OpenAIChatModel({
      client: {
        chat: {
          completions: {
            async create(payload) {
              calls.push(payload);
              return {
                choices: [{ message: { content: '자연스러운 응답' } }],
              };
            },
          },
        },
      },
    });

    const answer = await model.generateConversationalReply({
      intent: 'CLARIFICATION',
      question: '뭐라는 거야?',
      userPreferences: { healthConcerns: ['피로'] },
    });

    assert.equal(answer, '자연스러운 응답');
    const prompt = calls[0].messages.map((message) => message.content).join('\n');
    assert.match(prompt, /상품 검색 결과를 만들지 않는다/);
    assert.doesNotMatch(prompt, /추천 요약/);
  });

  it('asks OpenAI to extract onboarding answers as strict JSON', async () => {
    const calls = [];
    const model = new OpenAIChatModel({
      client: {
        chat: {
          completions: {
            async create(payload) {
              calls.push(payload);
              return {
                choices: [
                  {
                    message: {
                      content:
                        '{"ageGroup":"40s","gender":"female","healthConcerns":["피로"],"goals":[]}',
                    },
                  },
                ],
              };
            },
          },
        },
      },
    });

    const result = await model.extractOnboardingPreferences({
      message: '마흔 넘었고 요즘 너무 지쳐요',
      preference: {},
      onboardingStep: 0,
    });

    assert.equal(result.ageGroup, '40s');
    assert.deepEqual(result.healthConcerns, ['피로']);
    assert.deepEqual(calls[0].response_format, { type: 'json_object' });
    const prompt = calls[0].messages.map((message) => message.content).join('\n');
    assert.match(prompt, /온보딩 답변을 구조화/);
    assert.match(prompt, /추측하지 않는다/);
  });
});
