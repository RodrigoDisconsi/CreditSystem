import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Infrastructure
import { PiiEncryptionService } from './infrastructure/security/pii-encryption.service.js';
import { JwtService } from './infrastructure/security/jwt.service.js';
import { PrismaApplicationRepository } from './infrastructure/database/prisma-application.repository.js';
import { PrismaApplicationEventRepository } from './infrastructure/database/prisma-application-event.repository.js';
import { RedisCacheService } from './infrastructure/cache/redis-cache.service.js';
import { BullMQQueueService } from './infrastructure/queue/bullmq-queue.service.js';
import { SerasaBankProvider } from './infrastructure/providers/serasa-bank.provider.js';
import { BuroCreditoBankProvider } from './infrastructure/providers/buro-credito-bank.provider.js';

// Domain
import { BankProviderFactory } from './domain/factories/bank-provider.factory.js';

// Use Cases
import { CreateApplicationUseCase } from './application/use-cases/create-application.use-case.js';
import { GetApplicationUseCase } from './application/use-cases/get-application.use-case.js';
import { ListApplicationsUseCase } from './application/use-cases/list-applications.use-case.js';
import { UpdateStatusUseCase } from './application/use-cases/update-status.use-case.js';
import { HandleBankWebhookUseCase } from './application/use-cases/handle-bank-webhook.use-case.js';

// Presentation
import { ApplicationController } from './presentation/controllers/application.controller.js';
import { WebhookController } from './presentation/controllers/webhook.controller.js';

// Types
import type { IWebSocketEmitter } from './domain/interfaces/websocket-emitter.interface.js';

export interface AppConfig {
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  encryptionKey: string;
  corsOrigin: string;
}

export class Container {
  // Singletons
  readonly prisma: PrismaClient;
  readonly redis: Redis;
  readonly encryptionService: PiiEncryptionService;
  readonly jwtService: JwtService;
  readonly cacheService: RedisCacheService;
  readonly queueService: BullMQQueueService;
  readonly bankProviderFactory: BankProviderFactory;

  // Repositories
  readonly applicationRepository: PrismaApplicationRepository;
  readonly applicationEventRepository: PrismaApplicationEventRepository;

  // Use Cases
  readonly createApplicationUseCase: CreateApplicationUseCase;
  readonly getApplicationUseCase: GetApplicationUseCase;
  readonly listApplicationsUseCase: ListApplicationsUseCase;
  readonly updateStatusUseCase: UpdateStatusUseCase;
  readonly handleBankWebhookUseCase: HandleBankWebhookUseCase;

  // Controllers
  readonly applicationController: ApplicationController;
  readonly webhookController: WebhookController;

  // WebSocket (set after HTTP server creation)
  private _webSocketEmitter: IWebSocketEmitter | null = null;

  constructor(config: AppConfig) {
    // Infrastructure singletons
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.encryptionService = new PiiEncryptionService();
    this.jwtService = new JwtService(config.jwtSecret);
    this.cacheService = new RedisCacheService(this.redis);
    this.queueService = new BullMQQueueService(this.redis);

    // Domain factories
    this.bankProviderFactory = new BankProviderFactory();
    this.bankProviderFactory.register('BR', new SerasaBankProvider());
    this.bankProviderFactory.register('MX', new BuroCreditoBankProvider());

    // Repositories
    this.applicationRepository = new PrismaApplicationRepository(this.prisma, this.encryptionService);
    this.applicationEventRepository = new PrismaApplicationEventRepository(this.prisma);

    // Lazy WebSocket emitter proxy
    const wsEmitterProxy: IWebSocketEmitter = {
      emitToCountry: (countryCode: string, event: string, data: unknown) => {
        this._webSocketEmitter?.emitToCountry(countryCode, event, data);
      },
      emitToApplication: (applicationId: string, event: string, data: unknown) => {
        this._webSocketEmitter?.emitToApplication(applicationId, event, data);
      },
    };

    // Use Cases
    this.createApplicationUseCase = new CreateApplicationUseCase(
      this.applicationRepository,
      this.encryptionService,
      this.queueService,
      this.cacheService,
      wsEmitterProxy,
    );

    this.getApplicationUseCase = new GetApplicationUseCase(
      this.applicationRepository,
      this.cacheService,
      this.encryptionService,
    );

    this.listApplicationsUseCase = new ListApplicationsUseCase(
      this.applicationRepository,
      this.cacheService,
      this.encryptionService,
    );

    this.updateStatusUseCase = new UpdateStatusUseCase(
      this.applicationRepository,
      this.cacheService,
      this.queueService,
      wsEmitterProxy,
      this.encryptionService,
    );

    this.handleBankWebhookUseCase = new HandleBankWebhookUseCase(
      this.applicationRepository,
      this.cacheService,
      wsEmitterProxy,
      this.encryptionService,
    );

    // Controllers
    this.applicationController = new ApplicationController(
      this.createApplicationUseCase,
      this.getApplicationUseCase,
      this.listApplicationsUseCase,
      this.updateStatusUseCase,
    );

    this.webhookController = new WebhookController(this.handleBankWebhookUseCase);
  }

  setWebSocketEmitter(emitter: IWebSocketEmitter): void {
    this._webSocketEmitter = emitter;
  }

  async shutdown(): Promise<void> {
    await this.prisma.$disconnect();
    this.redis.disconnect();
  }
}
