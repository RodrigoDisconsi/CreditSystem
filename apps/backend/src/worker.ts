import { env } from './config/env.js';

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
import { RedisCacheService } from './infrastructure/cache/redis-cache.service.js';
import { RedisWebSocketEmitter } from './infrastructure/websocket/redis-websocket-emitter.js';
import { QUEUE_NAMES } from './infrastructure/queue/queue-names.js';
import { logger } from './shared/logger.js';

async function main() {
  logger.info('Starting workers...');

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  // Separate Redis connection for pub/sub publishing
  const redisPub = new Redis(env.REDIS_URL);
  const prisma = new PrismaClient();

  const encryptionService = new PiiEncryptionService();
  const queueService = new BullMQQueueService(redis);

  const applicationRepo = new PrismaApplicationRepository(prisma, encryptionService);
  const eventRepo = new PrismaApplicationEventRepository(prisma);

  const countryRuleFactory = new CountryRuleFactory();
  const bankProviderFactory = new BankProviderFactory();
  bankProviderFactory.register('BR', new SerasaBankProvider());
  bankProviderFactory.register('MX', new BuroCreditoBankProvider());

  // WebSocket emitter via Redis pub/sub (events forwarded to backend's Socket.IO)
  const workerWsEmitter = new RedisWebSocketEmitter(redisPub);

  const cacheService = new RedisCacheService(redis);
  const riskWorker = new RiskEvaluationWorker(
    applicationRepo, bankProviderFactory, countryRuleFactory,
    workerWsEmitter, queueService, encryptionService, cacheService,
  );
  const auditWorker = new AuditWorker(eventRepo);
  const notificationWorker = new NotificationWorker();

  const registry = new WorkerRegistry(redis);
  registry.register(QUEUE_NAMES.RISK_EVALUATION, riskWorker, 2);
  registry.register(QUEUE_NAMES.AUDIT, auditWorker, 3);
  registry.register(QUEUE_NAMES.NOTIFICATION, notificationWorker, 1);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Received shutdown signal');
    await registry.shutdown();
    await prisma.$disconnect();
    redis.disconnect();
    redisPub.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info('All workers started and listening for jobs');
}

main().catch((err) => {
  logger.error('Worker startup failed:', err);
  process.exit(1);
});
