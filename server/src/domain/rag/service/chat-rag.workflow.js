import { END, START, StateGraph } from '@langchain/langgraph';
import {
  conditionKeywords,
  medicationKeywords,
  noProductDataAnswer,
  pregnancyKeywords,
} from '../rag.constants.js';
import {
  extractProductIds,
  findMentionedKeywords,
  findUnknownKeywords,
  flattenPreferenceValues,
  isRelevantDocument,
  mergeContextDocuments,
  sortContextDocuments,
} from '../rag.context.js';
import { extractRecommendations } from '../rag.recommendation.js';
import { RagState } from '../rag.state.js';

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
    return new StateGraph(RagState)
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
