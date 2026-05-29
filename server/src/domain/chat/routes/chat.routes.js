import { Router } from 'express';

export function createChatRouter({ chatController }) {
  const router = Router();

  router.post('/chat', chatController.sendMessage);

  return router;
}

