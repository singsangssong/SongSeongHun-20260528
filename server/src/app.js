import cors from 'cors';
import express from 'express';
import { AuthController } from './domain/auth/controller/auth.controller.js';
import { createAuthMiddleware } from './domain/auth/middleware/auth.middleware.js';
import { createAuthRouter } from './domain/auth/routes/auth.routes.js';
import { AuthService } from './domain/auth/service/auth.service.js';
import { ChatController } from './domain/chat/controller/chat.controller.js';
import { createChatRouter } from './domain/chat/routes/chat.routes.js';
import { ChatService } from './domain/chat/service/chat.service.js';
import { OnboardingService } from './domain/onboarding/service/onboarding.service.js';
import { createDefaultRagWorkflow } from './domain/rag/service/create-default-rag-workflow.js';
import { createRepositories } from './global/db/create-repositories.js';
import { OpenAIChatModel } from './global/llm/openai-chat.model.js';

export async function createApp({ chatService } = {}) {
  const app = express();
  const repositories = createRepositories();

  const resolvedChatService =
    chatService ??
    new ChatService({
      ...repositories,
      onboardingService: new OnboardingService({
        extractionModel: process.env.OPENAI_API_KEY ? new OpenAIChatModel() : null,
      }),
      ragWorkflow: await createDefaultRagWorkflow({
        productChunkRepository: repositories.productChunkRepository,
      }),
    });
  const authController = new AuthController({
    authService: new AuthService({
      userRepository: repositories.userRepository,
    }),
  });
  const chatController = new ChatController({
    chatService: resolvedChatService,
  });

  app.use(
    cors({
      origin: parseAllowedOrigins(process.env.CLIENT_ORIGIN),
    }),
  );
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({
      status: 'ok',
      service: 'levit-assignment-server',
    });
  });

  app.use('/api', createAuthRouter({ authController }));
  app.use(
    '/api',
    createAuthMiddleware({
      userRepository: repositories.userRepository,
    }),
    createChatRouter({ chatController }),
  );

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
      error: 'internal server error',
    });
  });

  return app;
}

function parseAllowedOrigins(value) {
  if (!value) return true;

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
