import type Redis from 'ioredis';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import { logger } from '../../shared/logger.js';

export class RedisCacheService implements ICacheService {
  constructor(private readonly redis: Redis) {}

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      logger.warn('Redis getOrFetch: cache read failed, falling through to fetcher', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const result = await fetcher();

    try {
      await this.set(key, result, ttlSeconds);
    } catch (error) {
      logger.warn('Redis getOrFetch: cache write failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (data === null) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      logger.warn('Redis get: failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      logger.warn('Redis set: failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      logger.warn('Redis del: failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      logger.warn('Redis invalidate: failed', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
