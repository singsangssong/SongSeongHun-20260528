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
  retrievedDocuments: Annotation({
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
  constructor({ vectorStore, chatModel }) {
    this.vectorStore = vectorStore;
    this.chatModel = chatModel;
    this.graph = this.createGraph();
  }

  async invoke({ userId, message, userPreferences = {} }) {
    return this.graph.invoke({
      messages: [{ role: 'user', content: message }],
      userId,
      userPreferences,
      nextAction: 'SEARCH_RAG',
      retrievedDocuments: [],
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
      .addNode('checkContextGap', this.checkContextGapNode)
      .addNode('askFollowUp', this.askFollowUpNode)
      .addNode('retrieve', this.retrieveNode)
      .addNode('generate', this.generateNode)
      .addEdge(START, 'checkContextGap')
      .addConditionalEdges(
        'checkContextGap',
        (state) => (state.contextGap.hasGap ? 'askFollowUp' : 'retrieve'),
        {
          askFollowUp: 'askFollowUp',
          retrieve: 'retrieve',
        },
      )
      .addEdge('askFollowUp', END)
      .addEdge('retrieve', 'generate')
      .addEdge('generate', END)
      .compile();
  }

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

    return {
      retrievedDocuments: documents,
      nextAction: 'RESPOND',
    };
  };

  generateNode = async (state) => {
    const question = state.messages.at(-1)?.content ?? '';
    const answer = await this.chatModel.generate({
      question,
      documents: state.retrievedDocuments,
      userPreferences: state.userPreferences,
    });

    return {
      ...state,
      answer,
      nextAction: 'RESPOND',
    };
  };
}
