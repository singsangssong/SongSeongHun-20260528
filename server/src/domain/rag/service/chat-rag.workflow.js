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
  answer: Annotation({
    reducer: (_left, right) => right,
    default: () => '',
  }),
});

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
      answer: '',
    });
  }

  createGraph() {
    return new StateGraph(State)
      .addNode('retrieve', this.retrieveNode)
      .addNode('generate', this.generateNode)
      .addEdge(START, 'retrieve')
      .addEdge('retrieve', 'generate')
      .addEdge('generate', END)
      .compile();
  }

  retrieveNode = async (state) => {
    const question = state.messages.at(-1)?.content ?? '';
    const preferenceText = Object.values(state.userPreferences ?? {})
      .flat()
      .join(' ');
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

