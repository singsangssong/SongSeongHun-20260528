import { seedProductDocuments } from '../data/seed-product-documents.js';
import { ChatRagWorkflow } from './chat-rag.workflow.js';
import { OpenAIChatModel } from '../../../global/llm/openai-chat.model.js';
import { TemplateChatModel } from '../../../global/llm/template-chat.model.js';
import { InMemoryVectorStore } from '../../../global/vector/in-memory-vector.store.js';
import { LocalKeywordEmbeddingProvider } from '../../../global/vector/local-keyword-embedding.provider.js';
import { OpenAIEmbeddingProvider } from '../../../global/vector/openai-embedding.provider.js';

export async function createDefaultRagWorkflow() {
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);

  if (hasOpenAiKey) {
    try {
      return await createWorkflow({
        embeddingProvider: new OpenAIEmbeddingProvider(),
        chatModel: new OpenAIChatModel(),
      });
    } catch (error) {
      console.warn(
        `OpenAI RAG initialization failed. Falling back to local RAG: ${error.message}`,
      );
    }
  }

  return createWorkflow({
    embeddingProvider: new LocalKeywordEmbeddingProvider(),
    chatModel: new TemplateChatModel(),
  });
}

async function createWorkflow({ embeddingProvider, chatModel }) {
  const vectorStore = new InMemoryVectorStore({ embeddingProvider });

  await vectorStore.addDocuments(seedProductDocuments);

  return new ChatRagWorkflow({
    vectorStore,
    chatModel,
  });
}
