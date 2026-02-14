import dotenv from 'dotenv';
dotenv.config();

import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { WorkerRegistry } from './workers/worker-registry.js';
import { RiskEvaluationWorker } from './workers/risk-evaluation.worker.js';
import { AuditWorker } from './workers/audit.worker.js';
import { NotificationWorker } from './workers/notification.worker.js';
import { PrismaApplicationRepository } from './infrastructure/database/prisma-application.repository.js';
import { PrismaApplicationEventRepository } from './infrastructure/database/prisma-application-event.repository.js';
import { PiiEncryptionService } from './infrastructure/security/pii-encryption.service.js';
import { BullMQQueueService } from './infrastructure/queue/bullmq-queue.service.js';
import { CountryRuleFactory } from './domain/factories/country-rule.factory.js';
import { BankProviderFactory } from './domain/factories/bank-provider.factory.js';
import { SerasaBankProvider } from './infrastructure/providers/serasa-bank.provider.js';
import { BuroCreditoBankProvider } from './infrastructure/providers/buro-credito-bank.provider.js';
import { QUEUE_NAMES } from './infrastructure/queue/queue-names.js';

async function main() {
  console.log('Starting workers...');

  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  const prisma = new PrismaClient();

  const encryptionService = new PiiEncryptionService();
  const queueService = new BullMQQueueService(redis);

  const applicationRepo = new PrismaApplicationRepository(prisma, encryptionService);
  const eventRepo = new PrismaApplicationEventRepository(prisma);

  const countryRuleFactory = new CountryRuleFactory();
  const bankProviderFactory = new BankProviderFactory();
  bankProviderFactory.register('BR', new SerasaBankProvider());
  bankProviderFactory.register('MX', new BuroCreditoBankProvider());

  // Stub WebSocket emitter for worker process (no HTTP server)
  const workerWsEmitter = {
    emitToCountry: (countryCode: string, event: string, data: unknown) => {
      console.log(`[WS-STUB] emitToCountry(${countryCode}, ${event})`, JSON.stringify(data).substring(0, 100));
    },
    emitToApplication: (appId: string, event: string, data: unknown) => {
      console.log(`[WS-STUB] emitToApplication(${appId}, ${event})`, JSON.stringify(data).substring(0, 100));
    },
  };

  const riskWorker = new RiskEvaluationWorker(
    applicationRepo, bankProviderFactory, countryRuleFactory,
    workerWsEmitter, queueService, encryptionService,
  );
  const auditWorker = new AuditWorker(eventRepo);
  const notificationWorker = new NotificationWorker();

  const registry = new WorkerRegistry(redis);
  registry.register(QUEUE_NAMES.RISK_EVALUATION, riskWorker, 2);
  registry.register(QUEUE_NAMES.AUDIT, auditWorker, 3);
  registry.register(QUEUE_NAMES.NOTIFICATION, notificationWorker, 1);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Received shutdown signal');
    await registry.shutdown();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('All workers started and listening for jobs');
}

main().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
