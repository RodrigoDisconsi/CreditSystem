import { Queue } from 'bullmq';
import type Redis from 'ioredis';
import type { IQueueService } from '../../domain/interfaces/queue-service.interface.js';
import { logger } from '../../shared/logger.js';

export class BullMQQueueService implements IQueueService {
  private readonly queues: Map<string, Queue> = new Map();
  private readonly connection: Redis;

  constructor(connection: Redis) {
    this.connection = connection;
  }

  async enqueue(
    queueName: string,
    data: Record<string, unknown>,
    options?: { delay?: number; attempts?: number },
  ): Promise<void> {
    const queue = this.getQueue(queueName);

    const attempts = options?.attempts ?? 3;

    await queue.add(queueName, data, {
      delay: options?.delay,
      attempts,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    });

    logger.info(`Job enqueued on queue '${queueName}'`, {
      queueName,
      attempts,
      delay: options?.delay,
    });
  }

  getQueue(name: string): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: this.connection as any,
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) => queue.close());
    await Promise.all(closePromises);
    this.queues.clear();
    logger.info('All BullMQ queues closed');
  }
}
