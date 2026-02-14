import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Express } from 'express';
import { QUEUE_NAMES } from './queue-names.js';
import type { BullMQQueueService } from './bullmq-queue.service.js';

export function setupBullBoard(app: Express, queueService: BullMQQueueService): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = Object.values(QUEUE_NAMES).map(
    (name) => new BullMQAdapter(queueService.getQueue(name)),
  );

  createBullBoard({
    queues,
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}
