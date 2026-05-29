import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createAuthMiddleware } from '../src/domain/auth/middleware/auth.middleware.js';
import { TokenService } from '../src/domain/auth/service/token.service.js';
import { User } from '../src/domain/user/entity/user.entity.js';

describe('auth middleware', () => {
  it('rejects requests without a bearer token', async () => {
    const response = createFakeResponse();
    let nextCalled = false;
    const middleware = createAuthMiddleware({
      userRepository: {},
      tokenService: new TokenService({ secret: 'test-secret' }),
    });

    await middleware({ headers: {} }, response, () => {
      nextCalled = true;
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error, 'authorization token is required');
    assert.equal(nextCalled, false);
  });

  it('sets request.user for a valid token', async () => {
    const tokenService = new TokenService({ secret: 'test-secret' });
    const token = tokenService.sign({
      sub: 1,
      email: 'user@example.com',
      external_id: 'user@example.com',
    });
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const middleware = createAuthMiddleware({
      userRepository: {
        async findByEmail(email) {
          return new User({
            id: 1,
            externalId: email,
            email,
            nickname: '테스터',
          });
        },
      },
      tokenService,
    });
    let nextCalled = false;

    await middleware(request, createFakeResponse(), () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(request.user.email, 'user@example.com');
  });
});

function createFakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
