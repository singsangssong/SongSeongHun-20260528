import cors from 'cors';
import express from 'express';
import { ChatController } from './domain/chat/controller/chat.controller.js';
import { createChatRouter } from './domain/chat/routes/chat.routes.js';
import { ChatService } from './domain/chat/service/chat.service.js';
import { createDefaultRagWorkflow } from './domain/rag/service/create-default-rag-workflow.js';
import { createRepositories } from './global/db/create-repositories.js';

export async function createApp({ chatService } = {}) {
  const app = express();
  const repositories = createRepositories();

  const resolvedChatService =
    chatService ??
    new ChatService({
      ...repositories,
      ragWorkflow: await createDefaultRagWorkflow({
        productChunkRepository: repositories.productChunkRepository,
      }),
    });
  const chatController = new ChatController({
    chatService: resolvedChatService,
  });

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'levit-assignment-server',
    });
  });

  app.use('/api', createChatRouter({ chatController }));

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
      error: 'internal server error',
    });
  });

  return app;
}
