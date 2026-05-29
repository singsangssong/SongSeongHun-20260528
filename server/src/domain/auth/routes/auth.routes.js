import { Router } from 'express';

export function createAuthRouter({ authController }) {
  const router = Router();

  router.post('/auth/signup', authController.signup);
  router.post('/auth/login', authController.login);

  return router;
}
