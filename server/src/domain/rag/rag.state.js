import { Annotation } from '@langchain/langgraph';

export const RagState = Annotation.Root({
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
