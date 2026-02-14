import { Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';
import { logger } from '../../shared/logger.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export const RATE_LIMITS = {
  auth: { windowMs: 60_000, maxRequests: 5, keyPrefix: 'rl:auth' },
  api: { windowMs: 60_000, maxRequests: 100, keyPrefix: 'rl:api' },
  webhooks: { windowMs: 60_000, maxRequests: 30, keyPrefix: 'rl:webhooks' },
} as const;

export function createRateLimitMiddleware(redis: Redis, config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${config.keyPrefix}:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      const pipeline = redis.pipeline();

      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);
      // Count requests in window
      pipeline.zcard(key);
      // Set expiry on the key
      pipeline.pexpire(key, config.windowMs);

      const results = await pipeline.exec();

      if (!results) {
        logger.warn('Rate limit Redis pipeline returned null, allowing request through');
        next();
        return;
      }

      const requestCount = results[2]?.[1] as number;

      const remaining = Math.max(0, config.maxRequests - requestCount);
      const resetTime = Math.ceil((now + config.windowMs) / 1000);

      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      if (requestCount > config.maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(config.windowMs / 1000),
          },
        });
        return;
      }

      next();
    } catch (error) {
      // Graceful degradation: if Redis is unavailable, allow through with warning
      logger.warn('Rate limiter Redis error, allowing request through', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      next();
    }
  };
}
