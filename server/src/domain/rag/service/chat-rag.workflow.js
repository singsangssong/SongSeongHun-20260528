import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

const State = Annotation.Root({
  messages: Annotation({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  userId: Annotation({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  userPreferences: Annotation({
    reducer: (_left, right) => right,
    default: () => ({}),
  }),
  nextAction: Annotation({
    reducer: (_left, right) => right,
    default: () => 'SEARCH_RAG',
  }),
  intent: Annotation({
    reducer: (_left, right) => right,
    default: () => 'RECOMMENDATION',
  }),
  retrievedDocuments: Annotation({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  contextDocuments: Annotation({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  recommendations: Annotation({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  contextGap: Annotation({
    reducer: (_left, right) => right,
    default: () => ({
      hasGap: false,
      reason: null,
      keywords: [],
    }),
  }),
  answer: Annotation({
    reducer: (_left, right) => right,
    default: () => '',
  }),
});

const noProductDataAnswer =
  '현재 추천 가능한 상품 데이터가 없습니다. 상품 데이터를 먼저 수집/import한 뒤 다시 질문해주세요.';

const medicationKeywords = ['혈압약', '당뇨약', '갑상선약', '피임약', '진통제', '항응고제'];
const conditionKeywords = ['고혈압', '당뇨', '갑상선', '위장', '간 질환'];
const pregnancyKeywords = ['임신', '수유', '임신 준비'];

function flattenPreferenceValues(values) {
  return Object.values(values ?? {})
    .flat()
    .filter(Boolean)
    .join(' ');
}

function findMentionedKeywords(message, keywords) {
  return keywords.filter((keyword) => message.includes(keyword));
}

function findUnknownKeywords(message, keywords, knownText) {
  return findMentionedKeywords(message, keywords).filter(
    (keyword) => !knownText.includes(keyword),
  );
}

export class ChatRagWorkflow {
  constructor({
    vectorStore,
    chatModel,
    minSimilarityScore = 0.2,
    productContextLoader = null,
    intentClassifier = null,
  }) {
    this.vectorStore = vectorStore;
    this.chatModel = chatModel;
    this.minSimilarityScore = minSimilarityScore;
    this.productContextLoader = productContextLoader;
    this.intentClassifier = intentClassifier;
    this.graph = this.createGraph();
  }

  async invoke({ userId, message, userPreferences = {} }) {
    return this.graph.invoke({
      messages: [{ role: 'user', content: message }],
      userId,
      userPreferences,
      nextAction: 'SEARCH_RAG',
      intent: 'RECOMMENDATION',
      retrievedDocuments: [],
      contextDocuments: [],
      recommendations: [],
      contextGap: {
        hasGap: false,
        reason: null,
        keywords: [],
      },
      answer: '',
    });
  }

  createGraph() {
    return new StateGraph(State)
      .addNode('classifyIntent', this.classifyIntentNode)
      .addNode('respondDirectly', this.respondDirectlyNode)
      .addNode('checkContextGap', this.checkContextGapNode)
      .addNode('askFollowUp', this.askFollowUpNode)
      .addNode('retrieve', this.retrieveNode)
      .addNode('generate', this.generateNode)
      .addEdge(START, 'classifyIntent')
      .addConditionalEdges(
        'classifyIntent',
        (state) => (state.intent === 'RECOMMENDATION' ? 'checkContextGap' : 'respondDirectly'),
        {
          checkContextGap: 'checkContextGap',
          respondDirectly: 'respondDirectly',
        },
      )
      .addConditionalEdges(
        'checkContextGap',
        (state) => (state.contextGap.hasGap ? 'askFollowUp' : 'retrieve'),
        {
          askFollowUp: 'askFollowUp',
          retrieve: 'retrieve',
        },
      )
      .addEdge('respondDirectly', END)
      .addEdge('askFollowUp', END)
      .addEdge('retrieve', 'generate')
      .addEdge('generate', END)
      .compile();
  }

  classifyIntentNode = async (state) => {
    const message = state.messages.at(-1)?.content ?? '';
    const classification = await this.classifyIntent({
      question: message,
      userPreferences: state.userPreferences,
    });

    return {
      intent: classification.intent ?? 'RECOMMENDATION',
    };
  };

  respondDirectlyNode = async (state) => {
    const question = state.messages.at(-1)?.content ?? '';
    const answer = await this.generateConversationalReply({
      intent: state.intent,
      question,
      userPreferences: state.userPreferences,
    });

    return {
      answer:
        answer ||
        '건강기능식품 추천과 관련해 피로, 수면, 장 건강, 복용 중인 약, 피하고 싶은 성분을 알려주시면 이어서 도와드릴게요.',
      retrievedDocuments: [],
      contextDocuments: [],
      recommendations: [],
      nextAction: 'RESPOND',
    };
  };

  checkContextGapNode = async (state) => {
    const question = state.messages.at(-1)?.content ?? '';
    const preferences = state.userPreferences ?? {};
    const knownText = flattenPreferenceValues({
      pregnancyStatus: preferences.pregnancyStatus,
      chronicConditions: preferences.chronicConditions,
      medications: preferences.medications,
      safetyNotes: preferences.safetyNotes,
    });
    const unknownMedications = findUnknownKeywords(
      question,
      medicationKeywords,
      knownText,
    );
    const unknownConditions = findUnknownKeywords(
      question,
      conditionKeywords,
      knownText,
    );
    const mentionsPregnancy = findMentionedKeywords(question, pregnancyKeywords);
    const hasUnknownPregnancyContext =
      mentionsPregnancy.length > 0 && !preferences.pregnancyStatus;
    const keywords = [
      ...unknownMedications,
      ...unknownConditions,
      ...(hasUnknownPregnancyContext ? mentionsPregnancy : []),
    ];

    if (keywords.length === 0) {
      return {
        contextGap: {
          hasGap: false,
          reason: null,
          keywords: [],
        },
      };
    }

    return {
      contextGap: {
        hasGap: true,
        reason: 'SAFETY_CONTEXT_REQUIRED',
        keywords,
      },
      nextAction: 'ASK_QUESTION',
    };
  };

  askFollowUpNode = async (state) => {
    const keywords = state.contextGap.keywords.join(', ');

    return {
      answer:
        `${keywords} 관련 정보는 안전한 추천을 위해 먼저 확인이 필요해요. ` +
        '현재 복용 중인 약, 진단받은 질환, 임신/수유 여부를 조금 더 알려주세요.',
      retrievedDocuments: [],
      contextDocuments: [],
      recommendations: [],
      nextAction: 'ASK_QUESTION',
    };
  };

  retrieveNode = async (state) => {
    const question = state.messages.at(-1)?.content ?? '';
    const preferenceText = flattenPreferenceValues(state.userPreferences);
    const documents = await this.vectorStore.similaritySearch(
      `${preferenceText} ${question}`,
      3,
    );
    const relevantDocuments = documents.filter((document) =>
      isRelevantDocument(document, this.minSimilarityScore),
    );
    const contextDocuments = await this.loadProductContext(relevantDocuments);

    return {
      retrievedDocuments: relevantDocuments,
      contextDocuments,
      recommendations: extractRecommendations(contextDocuments),
      nextAction: 'RESPOND',
    };
  };

  generateNode = async (state) => {
    if (state.retrievedDocuments.length === 0) {
      return {
        ...state,
        answer: noProductDataAnswer,
        contextDocuments: [],
        recommendations: [],
        nextAction: 'RESPOND',
      };
    }

    const question = state.messages.at(-1)?.content ?? '';
    const answer = await this.chatModel.generate({
      question,
      documents: state.contextDocuments.length > 0
        ? state.contextDocuments
        : state.retrievedDocuments,
      userPreferences: state.userPreferences,
    });

    return {
      ...state,
      answer,
      contextDocuments: state.contextDocuments,
      recommendations: state.recommendations,
      nextAction: 'RESPOND',
    };
  };

  async loadProductContext(retrievedDocuments) {
    const productIds = extractProductIds(retrievedDocuments);
    if (!this.productContextLoader || productIds.length === 0) {
      return sortContextDocuments(retrievedDocuments);
    }

    const loadedDocuments = await this.productContextLoader.loadByProductIds(productIds);
    return mergeContextDocuments(loadedDocuments, retrievedDocuments);
  }

  async classifyIntent(input) {
    if (typeof this.intentClassifier?.classify === 'function') {
      return this.intentClassifier.classify(input);
    }

    if (typeof this.intentClassifier?.classifyIntent === 'function') {
      return this.intentClassifier.classifyIntent(input);
    }

    if (typeof this.chatModel?.classifyIntent === 'function') {
      return this.chatModel.classifyIntent(input);
    }

    throw new Error(
      'ChatRagWorkflow requires an intent classifier with classify() or classifyIntent().',
    );
  }

  async generateConversationalReply(input) {
    if (typeof this.chatModel?.generateConversationalReply === 'function') {
      return this.chatModel.generateConversationalReply(input);
    }

    return [
      '지금 메시지는 상품 검색으로 바로 이어가기보다 맥락을 먼저 맞추는 게 좋아 보여요.',
      '건강기능식품 추천과 관련해 피로, 수면, 장 건강, 복용 중인 약, 피하고 싶은 성분을 알려주시면 이어서 도와드릴게요.',
    ].join(' ');
  }
}

function isRelevantDocument(document, minSimilarityScore) {
  if (typeof document.score !== 'number') return true;
  return document.score >= minSimilarityScore;
}

function extractProductIds(documents) {
  return [
    ...new Set(
      documents
        .map((document) => document.metadata?.productId)
        .filter((productId) => productId !== undefined && productId !== null),
    ),
  ];
}

function mergeContextDocuments(loadedDocuments, retrievedDocuments) {
  const byId = new Map();

  for (const document of [...loadedDocuments, ...retrievedDocuments]) {
    byId.set(document.id, document);
  }

  return sortContextDocuments([...byId.values()]);
}

function sortContextDocuments(documents) {
  const order = new Map([
    ['summary', 0],
    ['ingredients', 1],
    ['claims', 2],
    ['cautions', 3],
    ['reviews', 4],
  ]);

  return documents
    .map((document, index) => ({ document, index }))
    .sort((leftEntry, rightEntry) => {
      const left = leftEntry.document;
      const right = rightEntry.document;
      const leftProductId = left.metadata?.productId ?? 0;
      const rightProductId = right.metadata?.productId ?? 0;
      if (leftProductId !== rightProductId) return leftProductId - rightProductId;

      const leftOrder = order.get(left.metadata?.chunkType) ?? 99;
      const rightOrder = order.get(right.metadata?.chunkType) ?? 99;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      return leftEntry.index - rightEntry.index;
    })
    .map((entry) => entry.document);
}

function extractRecommendations(documents) {
  const recommendations = [];
  const seen = new Set();

  for (const document of documents) {
    const metadata = document.metadata ?? {};
    const name = metadata.productName || metadata.product_name;
    const sourceUrl = metadata.sourceUrl || metadata.source_url;
    if (!name || !sourceUrl) continue;

    const key = `${name}|${sourceUrl}`;
    if (seen.has(key)) continue;

    seen.add(key);
    recommendations.push({
      name,
      brand: metadata.brand || '',
      source_url: sourceUrl,
    });
  }

  return recommendations;
}
