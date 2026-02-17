import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { logger } from '../shared/logger.js';

interface WorkerProcessor {
  process(job: Job): Promise<void>;
}

interface RegisteredWorker {
  name: string;
  worker: Worker;
}

export class WorkerRegistry {
  private workers: RegisteredWorker[] = [];

  constructor(private readonly redisConnection: Redis) {}

  register(queueName: string, processor: WorkerProcessor, concurrency: number = 1): void {
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        logger.info(`Processing job ${job.id} from queue ${queueName}`);
        await processor.process(job);
      },
      {
        connection: this.redisConnection as any,
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed on queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed on queue ${queueName}: ${err.message}`);
    });

    this.workers.push({ name: queueName, worker });
    logger.info(`Worker registered for queue: ${queueName} (concurrency: ${concurrency})`);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down workers...');
    await Promise.all(this.workers.map(({ worker }) => worker.close()));
    logger.info('All workers shut down');
  }
}
