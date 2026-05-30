import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuthService } from '../../../src/domain/auth/service/auth.service.js';
import { PasswordService } from '../../../src/domain/auth/service/password.service.js';
import { TokenService } from '../../../src/domain/auth/service/token.service.js';
import { User } from '../../../src/domain/user/entity/user.entity.js';

describe('AuthService', () => {
  it('creates a user and returns a signed token on signup', async () => {
    const users = [];
    const service = new AuthService({
      userRepository: {
        async findByEmail(email) {
          return users.find((user) => user.email === email) ?? null;
        },
        async createWithAuth({ email, nickname, passwordHash }) {
          const user = new User({
            id: 1,
            externalId: email,
            email,
            nickname,
            passwordHash,
          });
          users.push(user);
          return user;
        },
      },
      tokenService: new TokenService({ secret: 'test-secret' }),
    });

    const result = await service.signup({
      email: 'USER@example.com',
      nickname: '테스터',
      password: 'password123',
    });

    assert.equal(result.statusCode, 201);
    assert.equal(result.body.user.email, 'user@example.com');
    assert.ok(result.body.token);
    assert.notEqual(users[0].passwordHash, 'password123');
  });

  it('rejects invalid login credentials', async () => {
    const passwordService = new PasswordService();
    const service = new AuthService({
      userRepository: {
        async findByEmail() {
          return new User({
            id: 1,
            externalId: 'user@example.com',
            email: 'user@example.com',
            nickname: '테스터',
            passwordHash: passwordService.hash('password123'),
          });
        },
      },
      passwordService,
      tokenService: new TokenService({ secret: 'test-secret' }),
    });

    const result = await service.login({
      email: 'user@example.com',
      password: 'wrong-password',
    });

    assert.equal(result.statusCode, 401);
  });
});
