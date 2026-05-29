import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

const iterations = 120000;
const keyLength = 32;
const digest = 'sha256';

export class PasswordService {
  hash(password) {
    const salt = randomBytes(16).toString('base64url');
    const key = pbkdf2Sync(password, salt, iterations, keyLength, digest)
      .toString('base64url');

    return `pbkdf2:${iterations}:${salt}:${key}`;
  }

  verify(password, storedHash) {
    const [algorithm, iterationText, salt, expectedKey] = storedHash?.split(':') ?? [];
    if (algorithm !== 'pbkdf2' || !iterationText || !salt || !expectedKey) {
      return false;
    }

    const actualKey = pbkdf2Sync(
      password,
      salt,
      Number.parseInt(iterationText, 10),
      keyLength,
      digest,
    ).toString('base64url');

    return timingSafeEqual(Buffer.from(actualKey), Buffer.from(expectedKey));
  }
}
