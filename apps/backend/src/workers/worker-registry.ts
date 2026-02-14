import { Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUE_NAMES } from '../infrastructure/queue/queue-names.js';

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
        console.log(`Processing job ${job.id} from queue ${queueName}`);
        await processor.process(job);
      },
      {
        connection: this.redisConnection as any,
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed on queue ${queueName}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed on queue ${queueName}:`, err.message);
    });

    this.workers.push({ name: queueName, worker });
    console.log(`Worker registered for queue: ${queueName} (concurrency: ${concurrency})`);
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down workers...');
    await Promise.all(this.workers.map(({ worker }) => worker.close()));
    console.log('All workers shut down');
  }
}
