import type { Redis } from 'ioredis';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import { logger } from '../../shared/logger.js';

const CHANNEL = 'ws:events';

export interface WsRedisMessage {
  target: 'country' | 'application';
  id: string;
  event: string;
  data: unknown;
}

/**
 * Publishes WebSocket events to a Redis channel.
 * Used by the worker process which doesn't have a Socket.IO server.
 */
export class RedisWebSocketEmitter implements IWebSocketEmitter {
  constructor(private readonly redis: Redis) {}

  emitToCountry(countryCode: string, event: string, data: unknown): void {
    const message: WsRedisMessage = { target: 'country', id: countryCode, event, data };
    this.redis.publish(CHANNEL, JSON.stringify(message)).catch((err) => {
      logger.warn('Failed to publish WebSocket event via Redis', { event, error: String(err) });
    });
  }

  emitToApplication(applicationId: string, event: string, data: unknown): void {
    const message: WsRedisMessage = { target: 'application', id: applicationId, event, data };
    this.redis.publish(CHANNEL, JSON.stringify(message)).catch((err) => {
      logger.warn('Failed to publish WebSocket event via Redis', { event, error: String(err) });
    });
  }
}

export { CHANNEL as WS_REDIS_CHANNEL };
