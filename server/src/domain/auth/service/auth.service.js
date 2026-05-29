import { AuthResponse } from '../dto/auth.response.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';

export class AuthService {
  constructor({
    userRepository,
    passwordService = new PasswordService(),
    tokenService = new TokenService(),
  }) {
    this.userRepository = userRepository;
    this.passwordService = passwordService;
    this.tokenService = tokenService;
  }

  async signup({ email, nickname, password }) {
    const normalizedEmail = normalizeEmail(email);
    const trimmedNickname = normalizeRequiredText(nickname);
    const normalizedPassword = normalizeRequiredText(password);

    if (!normalizedEmail || !trimmedNickname || normalizedPassword.length < 8) {
      return {
        statusCode: 400,
        body: { error: 'email, nickname, and password(8+) are required' },
      };
    }

    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      return {
        statusCode: 409,
        body: { error: 'email already exists' },
      };
    }

    const user = await this.userRepository.createWithAuth({
      email: normalizedEmail,
      nickname: trimmedNickname,
      passwordHash: this.passwordService.hash(normalizedPassword),
    });
    const token = this.tokenService.sign({
      sub: user.id,
      email: user.email,
      external_id: user.externalId,
    });

    return {
      statusCode: 201,
      body: AuthResponse.from({ user, token }),
    };
  }

  async login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = normalizeRequiredText(password);
    const user = normalizedEmail
      ? await this.userRepository.findByEmail(normalizedEmail)
      : null;

    if (
      !user ||
      !user.passwordHash ||
      !this.passwordService.verify(normalizedPassword, user.passwordHash)
    ) {
      return {
        statusCode: 401,
        body: { error: 'invalid email or password' },
      };
    }

    const token = this.tokenService.sign({
      sub: user.id,
      email: user.email,
      external_id: user.externalId,
    });

    return {
      statusCode: 200,
      body: AuthResponse.from({ user, token }),
    };
  }
}

function normalizeEmail(value) {
  return normalizeRequiredText(value).toLowerCase();
}

function normalizeRequiredText(value) {
  return typeof value === 'string' ? value.trim() : '';
}
