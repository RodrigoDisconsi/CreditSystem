import { env } from './env.js';

export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: '24h',
  refreshExpiresIn: '7d',
} as const;
