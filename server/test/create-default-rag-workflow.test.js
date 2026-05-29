import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDefaultRagWorkflow } from '../src/domain/rag/service/create-default-rag-workflow.js';

class FakeEmbeddingProvider {
  async embed(text) {
    return [
      text.includes('장') || text.includes('유산균') ? 1 : 0,
      text.includes('피로') || text.includes('비타민') ? 1 : 0,
    ];
  }
}

class FakeChatModel {
  async generate({ documents }) {
    return documents.map((document) => document.title).join(', ');
  }
}

describe('createDefaultRagWorkflow', () => {
  it('loads RAG documents from product chunks before seed documents', async () => {
    const workflow = await createDefaultRagWorkflow({
      embeddingProvider: new FakeEmbeddingProvider(),
      chatModel: new FakeChatModel(),
      productChunkRepository: {
        async findDocumentsForRag() {
          return [
            {
              id: 'product-chunk-1',
              title: '유산균 ingredient',
              content: '유산균은 장 건강 관심 사용자가 자주 비교하는 성분입니다.',
              metadata: { productName: '유산균', concern: '장 건강' },
            },
          ];
        },
      },
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '장 건강에 좋은 영양제를 추천해줘',
      userPreferences: {
        healthConcerns: ['장 건강'],
      },
    });

    assert.equal(result.retrievedDocuments[0].id, 'product-chunk-1');
    assert.match(result.answer, /유산균 ingredient/);
  });

  it('does not fall back to seed documents when product chunks are empty', async () => {
    const workflow = await createDefaultRagWorkflow({
      embeddingProvider: new FakeEmbeddingProvider(),
      chatModel: new FakeChatModel(),
      productChunkRepository: {
        async findDocumentsForRag() {
          return [];
        },
      },
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '피로에 좋은 영양제를 추천해줘',
      userPreferences: {
        healthConcerns: ['피로'],
      },
    });

    assert.deepEqual(result.retrievedDocuments, []);
    assert.match(result.answer, /추천 가능한 상품 데이터가 없습니다/);
  });
});
