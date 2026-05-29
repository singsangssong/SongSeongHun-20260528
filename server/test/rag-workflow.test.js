import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChatRagWorkflow } from '../src/domain/rag/service/chat-rag.workflow.js';
import { InMemoryVectorStore } from '../src/global/vector/in-memory-vector.store.js';

class FakeEmbeddingProvider {
  async embed(text) {
    return [
      text.includes('피로') || text.includes('에너지') ? 1 : 0,
      text.includes('눈') ? 1 : 0,
      text.includes('장') ? 1 : 0,
    ];
  }
}

class FakeChatModel {
  async generate({ question, documents, userPreferences }) {
    return [
      `질문: ${question}`,
      `고민: ${userPreferences.healthConcerns.join(', ')}`,
      `근거: ${documents.map((document) => document.title).join(', ')}`,
    ].join('\n');
  }
}

describe('RAG workflow', () => {
  it('retrieves relevant product documents and generates an answer', async () => {
    const vectorStore = new InMemoryVectorStore({
      embeddingProvider: new FakeEmbeddingProvider(),
    });
    await vectorStore.addDocuments([
      {
        id: 'vitamin-b-ingredient',
        title: '비타민 B 컴플렉스 성분',
        content: '피로와 에너지 대사에 관련된 비타민 B군 정보',
        metadata: { productName: '비타민 B 컴플렉스' },
      },
      {
        id: 'lutein-ingredient',
        title: '루테인 성분',
        content: '눈 건강과 관련된 루테인 정보',
        metadata: { productName: '루테인' },
      },
    ]);

    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel: new FakeChatModel(),
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '요즘 피로해서 에너지에 도움되는 영양제를 보고 있어요',
      userPreferences: {
        healthConcerns: ['피로'],
      },
    });

    assert.equal(result.nextAction, 'RESPOND');
    assert.equal(result.retrievedDocuments[0].id, 'vitamin-b-ingredient');
    assert.match(result.answer, /비타민 B 컴플렉스 성분/);
  });

  it('asks a follow-up question when the current question has a new medication context', async () => {
    let searchCount = 0;
    const vectorStore = {
      async similaritySearch() {
        searchCount += 1;
        return [];
      },
    };
    const chatModel = new FakeChatModel();
    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel,
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '혈압약이랑 같이 먹어도 되는 피로 영양제 추천해줘',
      userPreferences: {
        healthConcerns: ['피로'],
        medications: [],
        safetyNotes: [],
      },
    });

    assert.equal(searchCount, 0);
    assert.equal(result.nextAction, 'ASK_QUESTION');
    assert.equal(result.contextGap.hasGap, true);
    assert.match(result.answer, /혈압약/);
  });

  it('continues to retrieval when the medication context is already known', async () => {
    let searchCount = 0;
    const vectorStore = {
      async similaritySearch() {
        searchCount += 1;
        return [
          {
            id: 'vitamin-b-ingredient',
            title: '비타민 B 컴플렉스 성분',
            content: '피로와 에너지 대사에 관련된 비타민 B군 정보',
            metadata: { productName: '비타민 B 컴플렉스' },
          },
        ];
      },
    };
    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel: new FakeChatModel(),
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '혈압약이랑 같이 먹어도 되는 피로 영양제 추천해줘',
      userPreferences: {
        healthConcerns: ['피로'],
        medications: ['혈압약'],
        safetyNotes: ['혈압약'],
      },
    });

    assert.equal(searchCount, 1);
    assert.equal(result.nextAction, 'RESPOND');
    assert.equal(result.contextGap.hasGap, false);
    assert.match(result.answer, /비타민 B 컴플렉스 성분/);
  });
});
