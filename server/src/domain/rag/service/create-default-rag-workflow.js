import { ChatRagWorkflow } from './chat-rag.workflow.js';
import { OpenAIChatModel } from '../../../global/llm/openai-chat.model.js';
import { TemplateChatModel } from '../../../global/llm/template-chat.model.js';
import { InMemoryVectorStore } from '../../../global/vector/in-memory-vector.store.js';
import { LocalKeywordEmbeddingProvider } from '../../../global/vector/local-keyword-embedding.provider.js';
import { OpenAIEmbeddingProvider } from '../../../global/vector/openai-embedding.provider.js';

export async function createDefaultRagWorkflow({
  productChunkRepository = null,
  embeddingProvider = null,
  chatModel = null,
} = {}) {
  if (embeddingProvider && chatModel) {
    return createWorkflow({
      embeddingProvider,
      chatModel,
      documents: await loadRagDocuments({ productChunkRepository }),
      productChunkRepository,
    });
  }

  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);

  if (hasOpenAiKey) {
    try {
      return await createWorkflow({
        embeddingProvider: new OpenAIEmbeddingProvider(),
        chatModel: new OpenAIChatModel(),
        documents: await loadRagDocuments({ productChunkRepository }),
        productChunkRepository,
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
    documents: await loadRagDocuments({ productChunkRepository }),
    productChunkRepository,
  });
}

async function loadRagDocuments({ productChunkRepository }) {
  if (!productChunkRepository) {
    return [];
  }

  try {
    return productChunkRepository.findDocumentsForRag();
  } catch (error) {
    console.warn(`Product chunk loading failed: ${error.message}`);
    return [];
  }
}

async function createWorkflow({
  embeddingProvider,
  chatModel,
  documents,
  productChunkRepository,
}) {
  const vectorStore = new InMemoryVectorStore({ embeddingProvider });

  await vectorStore.addDocuments(documents);

  return new ChatRagWorkflow({
    vectorStore,
    chatModel,
    productContextLoader: productChunkRepository
      ? {
          loadByProductIds(productIds) {
            return productChunkRepository.findDocumentsForRagByProductIds(productIds);
          },
        }
      : null,
  });
}
