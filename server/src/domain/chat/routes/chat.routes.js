import { Router } from 'express';

export function createChatRouter({ chatController }) {
  const router = Router();

  router.get('/chat/sessions', chatController.listSessions);
  router.get('/chat/sessions/:sessionId/messages', chatController.listMessages);
  router.post('/chat', chatController.sendMessage);

  return router;
}
