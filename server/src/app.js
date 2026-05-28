import cors from 'cors';
import express from 'express';
import { ChatController } from './app/http/controllers/ChatController.js';
import { createChatRouter } from './app/http/routes/chatRoutes.js';
import { ChatService } from './application/chat/ChatService.js';
import { createRepositories } from './infrastructure/db/createRepositories.js';

export function createApp({ chatService } = {}) {
  const app = express();

  const resolvedChatService =
    chatService ?? new ChatService(createRepositories());
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
