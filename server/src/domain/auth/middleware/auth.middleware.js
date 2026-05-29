import { TokenService } from '../service/token.service.js';

export function createAuthMiddleware({
  userRepository,
  tokenService = new TokenService(),
} = {}) {
  return async (request, response, next) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token) {
      return response.status(401).json({ error: 'authorization token is required' });
    }

    const payload = tokenService.verify(token);
    if (!payload?.email) {
      return response.status(401).json({ error: 'invalid authorization token' });
    }

    const user = await userRepository.findByEmail(payload.email);
    if (!user) {
      return response.status(401).json({ error: 'invalid authorization token' });
    }

    request.user = user;
    return next();
  };
}

export function createOptionalAuthMiddleware({
  userRepository,
  tokenService = new TokenService(),
} = {}) {
  return async (request, _response, next) => {
    const token = readBearerToken(request.headers.authorization);
    if (!token) return next();

    const payload = tokenService.verify(token);
    if (!payload?.email) return next();

    const user = await userRepository.findByEmail(payload.email);
    if (user) request.user = user;

    return next();
  };
}

function readBearerToken(value) {
  if (!value?.startsWith('Bearer ')) return null;
  return value.slice('Bearer '.length).trim();
}
