import { createHmac, timingSafeEqual } from 'node:crypto';

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export class TokenService {
  constructor({ secret = process.env.AUTH_TOKEN_SECRET || 'local-dev-secret' } = {}) {
    this.secret = secret;
  }

  sign(payload) {
    const header = encode({ alg: 'HS256', typ: 'JWT' });
    const body = encode(payload);
    const signature = this.createSignature(`${header}.${body}`);

    return `${header}.${body}.${signature}`;
  }

  verify(token) {
    const [header, body, signature] = token?.split('.') ?? [];
    if (!header || !body || !signature) return null;

    const expectedSignature = this.createSignature(`${header}.${body}`);
    if (!safeEqual(signature, expectedSignature)) return null;

    return decode(body);
  }

  createSignature(value) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}
