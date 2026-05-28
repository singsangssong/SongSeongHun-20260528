import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import request from 'supertest';
import app from '../src/app.js';

describe('chat API', () => {
  it('returns a health response', async () => {
    const response = await request(app).get('/health').expect(200);

    assert.equal(response.body.status, 'ok');
  });

  it('returns an onboarding question for a valid message', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({
        user_id: 'demo-user',
        message: '요즘 피곤해서 비타민을 보고 있어요',
      })
      .expect(200);

    assert.equal(response.body.user_id, 'demo-user');
    assert.equal(response.body.next_action, 'ASK_QUESTION');
    assert.match(response.body.message, /건강 고민/);
  });

  it('rejects an empty message', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ user_id: 'demo-user', message: '' })
      .expect(400);

    assert.equal(response.body.error, 'message is required');
  });
});
