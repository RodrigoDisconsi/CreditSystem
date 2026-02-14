import Redis from 'ioredis';
import { redisConfig } from '../../config/redis.config.js';
import { logger } from '../../shared/logger.js';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(redisConfig.url, {
    maxRetriesPerRequest: null,
    retryStrategy(times: number): number | null {
      if (times > 10) {
        logger.error('Redis: max reconnection attempts reached, giving up');
        return null;
      }
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    reconnectOnError(err: Error): boolean {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  redisClient.on('connect', () => {
    logger.info('Redis: connected');
  });

  redisClient.on('error', (err: Error) => {
    logger.error('Redis: connection error', { error: err.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis: connection closed');
  });

  return redisClient;
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis: disconnected');
  }
}
