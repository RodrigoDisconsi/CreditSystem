import { env } from './env.js';

export const encryptionConfig = {
  key: Buffer.from(env.ENCRYPTION_KEY, 'hex'),
  algorithm: 'aes-256-gcm' as const,
};
