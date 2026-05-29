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
});
