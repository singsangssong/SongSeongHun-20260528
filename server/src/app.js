import cors from 'cors';
import express from 'express';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'levit-assignment-server',
  });
});

app.post('/api/chat', (request, response) => {
  const { message, user_id } = request.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return response.status(400).json({
      error: 'message is required',
    });
  }

  return response.json({
    user_id: user_id || 'demo-user',
    next_action: 'ASK_QUESTION',
    message:
      '정확한 추천을 위해 몇 가지 여쭤볼게요. 현재 가장 큰 건강 고민은 무엇인가요? 예: 피로, 수면, 눈 건강, 갱년기, 장 건강',
  });
});

export default app;
