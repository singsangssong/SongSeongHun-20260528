import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

const State = Annotation.Root({
  user: Annotation({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  preference: Annotation({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  message: Annotation({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  route: Annotation({
    reducer: (_left, right) => right,
    default: () => 'onboarding',
  }),
  nextAction: Annotation({
    reducer: (_left, right) => right,
    default: () => 'ASK_QUESTION',
  }),
  assistantMessage: Annotation({
    reducer: (_left, right) => right,
    default: () => '',
  }),
  preferencePatch: Annotation({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  retrievedDocuments: Annotation({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  recommendations: Annotation({
    reducer: (_left, right) => right,
    default: () => [],
  }),
});

export class ChatTurnWorkflow {
  constructor({ onboardingService, ragWorkflow = null }) {
    this.onboardingService = onboardingService;
    this.ragWorkflow = ragWorkflow;
    this.graph = this.createGraph();
  }

  async invoke({ user, preference, message }) {
    return this.graph.invoke({
      user,
      preference,
      message,
      route: 'onboarding',
      nextAction: 'ASK_QUESTION',
      assistantMessage: '',
      preferencePatch: null,
      retrievedDocuments: [],
      recommendations: [],
    });
  }

  createGraph() {
    return new StateGraph(State)
      .addNode('stateCheck', this.stateCheckNode)
      .addNode('onboarding', this.onboardingNode)
      .addNode('rag', this.ragNode)
      .addEdge(START, 'stateCheck')
      .addConditionalEdges(
        'stateCheck',
        (state) => state.route,
        {
          onboarding: 'onboarding',
          rag: 'rag',
        },
      )
      .addEdge('onboarding', END)
      .addEdge('rag', END)
      .compile();
  }

  stateCheckNode = async (state) => {
    const shouldUseRag =
      Boolean(state.preference?.isOnboardingCompleted) && Boolean(this.ragWorkflow);

    return {
      route: shouldUseRag ? 'rag' : 'onboarding',
    };
  };

  onboardingNode = async (state) => {
    const onboardingResult = await this.onboardingService.handleAnswer({
      preference: state.preference,
      message: state.message,
    });

    return {
      nextAction: onboardingResult.nextAction,
      assistantMessage: onboardingResult.assistantMessage,
      preferencePatch: onboardingResult.preferencePatch,
      retrievedDocuments: [],
      recommendations: [],
    };
  };

  ragNode = async (state) => {
    const ragResult = await this.ragWorkflow.invoke({
      userId: state.user.externalId,
      message: state.message,
      userPreferences: state.preference,
    });

    return {
      nextAction: ragResult.nextAction,
      assistantMessage: ragResult.answer,
      preferencePatch: null,
      retrievedDocuments: ragResult.retrievedDocuments,
      recommendations: ragResult.recommendations ?? [],
    };
  };
}
