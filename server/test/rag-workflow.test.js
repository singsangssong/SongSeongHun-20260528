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
    let generatedDocumentTitles = [];
    const vectorStore = new InMemoryVectorStore({
      embeddingProvider: new FakeEmbeddingProvider(),
    });
    await vectorStore.addDocuments([
      {
        id: 'vitamin-b-ingredient',
        title: '비타민 B 컴플렉스 성분',
        content: '피로와 에너지 대사에 관련된 비타민 B군 정보',
        metadata: {
          productName: '비타민 B 컴플렉스',
          brand: 'Sample Health',
          sourceUrl: 'https://example.test/vitamin-b',
        },
      },
      {
        id: 'lutein-ingredient',
        title: '루테인 성분',
        content: '눈 건강과 관련된 루테인 정보',
        metadata: { productName: '루테인' },
      },
      {
        id: 'vitamin-b-caution',
        title: '비타민 B 컴플렉스 주의사항',
        content: '피로 관련 제품이지만 복용 중인 약이 있으면 전문가 상담이 필요합니다.',
        metadata: {
          productName: '비타민 B 컴플렉스',
          brand: 'Sample Health',
          sourceUrl: 'https://example.test/vitamin-b',
        },
      },
    ]);

    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel: {
        async generate(input) {
          generatedDocumentTitles = input.documents.map((document) => document.title);
          return new FakeChatModel().generate(input);
        },
      },
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
    assert.ok(
      result.retrievedDocuments.some(
        (document) => document.id === 'vitamin-b-caution',
      ),
    );
    assert.deepEqual(result.recommendations, [
      {
        name: '비타민 B 컴플렉스',
        brand: 'Sample Health',
        source_url: 'https://example.test/vitamin-b',
      },
    ]);
    assert.deepEqual(generatedDocumentTitles, [
      '비타민 B 컴플렉스 성분',
      '비타민 B 컴플렉스 주의사항',
    ]);
    assert.match(result.answer, /비타민 B 컴플렉스 성분/);
  });

  it('expands retrieved chunks into product-level context before generation', async () => {
    let generatedDocumentTitles = [];
    const vectorStore = {
      async similaritySearch() {
        return [
          {
            id: 'product-chunk-18',
            title: '여성 멀티비타민 claims',
            content: '기능성/특징\n- 피로 개선에 도움',
            score: 0.9,
            metadata: {
              productId: 6,
              productName: '여성 멀티비타민',
              brand: '브랜드A',
              sourceUrl: 'https://example.test/multi',
              chunkType: 'claims',
            },
          },
        ];
      },
    };
    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel: {
        async generate(input) {
          generatedDocumentTitles = input.documents.map((document) => document.title);
          return 'expanded answer';
        },
      },
      productContextLoader: {
        async loadByProductIds(productIds) {
          assert.deepEqual(productIds, [6]);
          return [
            {
              id: 'product-chunk-16',
              title: '여성 멀티비타민 summary',
              content: '상품명: 여성 멀티비타민',
              metadata: {
                productId: 6,
                productName: '여성 멀티비타민',
                brand: '브랜드A',
                sourceUrl: 'https://example.test/multi',
                chunkType: 'summary',
              },
            },
            {
              id: 'product-chunk-17',
              title: '여성 멀티비타민 ingredients',
              content: '성분/함량\n- 비타민D 25ug',
              metadata: {
                productId: 6,
                productName: '여성 멀티비타민',
                brand: '브랜드A',
                sourceUrl: 'https://example.test/multi',
                chunkType: 'ingredients',
              },
            },
            {
              id: 'product-chunk-19',
              title: '여성 멀티비타민 cautions',
              content: '주의사항\n- 임신 중이면 전문가 상담',
              metadata: {
                productId: 6,
                productName: '여성 멀티비타민',
                brand: '브랜드A',
                sourceUrl: 'https://example.test/multi',
                chunkType: 'cautions',
              },
            },
          ];
        },
      },
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '피로 개선에 도움되는 제품 추천해줘',
      userPreferences: {
        healthConcerns: ['피로'],
      },
    });

    assert.equal(result.answer, 'expanded answer');
    assert.deepEqual(result.retrievedDocuments.map((document) => document.id), [
      'product-chunk-18',
    ]);
    assert.deepEqual(generatedDocumentTitles, [
      '여성 멀티비타민 summary',
      '여성 멀티비타민 ingredients',
      '여성 멀티비타민 claims',
      '여성 멀티비타민 cautions',
    ]);
  });

  it('ignores low-score retrieval results instead of forcing a weak recommendation', async () => {
    let generateCount = 0;
    const vectorStore = {
      async similaritySearch() {
        return [
          {
            id: 'weak-match',
            title: '약한 검색 결과',
            content: '질문과 거의 관련 없는 상품 정보',
            score: 0.05,
            metadata: {
              productName: '약한 상품',
              sourceUrl: 'https://example.test/weak',
            },
          },
        ];
      },
    };
    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel: {
        async generate() {
          generateCount += 1;
          return 'should not be used';
        },
      },
      minSimilarityScore: 0.2,
    });

    const result = await workflow.invoke({
      userId: 'demo-user',
      message: '갱년기 홍조에 좋은 제품 있어?',
      userPreferences: {
        healthConcerns: ['갱년기'],
      },
    });

    assert.equal(generateCount, 0);
    assert.deepEqual(result.retrievedDocuments, []);
    assert.deepEqual(result.recommendations, []);
    assert.match(result.answer, /추천 가능한 상품 데이터가 없습니다/);
  });

  it('responds without generation when no product chunks are available', async () => {
    let generateCount = 0;
    const vectorStore = {
      async similaritySearch() {
        return [];
      },
    };
    const workflow = new ChatRagWorkflow({
      vectorStore,
      chatModel: {
        async generate() {
          generateCount += 1;
          return 'should not be used';
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

    assert.equal(generateCount, 0);
    assert.equal(result.nextAction, 'RESPOND');
    assert.deepEqual(result.retrievedDocuments, []);
    assert.deepEqual(result.recommendations, []);
    assert.match(result.answer, /추천 가능한 상품 데이터가 없습니다/);
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
