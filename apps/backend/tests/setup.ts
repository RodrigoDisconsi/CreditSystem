import { beforeAll, afterAll, vi } from 'vitest';

// Mock env before anything else
vi.mock('../src/config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long-for-jwt',
    ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    PORT: 3000,
    NODE_ENV: 'test',
    CORS_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'error',
  },
}));

vi.mock('../src/config/encryption.config.js', () => ({
  encryptionConfig: {
    key: Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'),
    algorithm: 'aes-256-gcm' as const,
  },
}));

// Silence logger in tests
vi.mock('../src/shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long-for-jwt';
  process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

afterAll(() => {
  vi.restoreAllMocks();
});
