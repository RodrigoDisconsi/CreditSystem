import type { CountryCode } from '@credit-system/shared';
import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import type { IQueueService } from '../../domain/interfaces/queue-service.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import { Application } from '../../domain/entities/application.entity.js';
import { createCountryRule } from '../../domain/factories/country-rule.factory.js';
import { ValidationError, ConflictError } from '../../shared/errors/index.js';
import { QUEUE_NAMES } from '../../infrastructure/queue/queue-names.js';
import type { CreateApplicationDto } from '../dto/create-application.dto.js';
import type { ApplicationResponseDto } from '../dto/application-response.dto.js';
import { toApplicationResponse } from '../dto/application-response.dto.js';

export class CreateApplicationUseCase {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly encryptionService: IEncryptionService,
    private readonly queueService: IQueueService,
    private readonly cacheService: ICacheService,
    private readonly webSocketEmitter: IWebSocketEmitter,
  ) {}

  async execute(dto: CreateApplicationDto): Promise<ApplicationResponseDto> {
    // 1. Validate document with country rules
    const countryRule = createCountryRule(dto.countryCode);
    if (!countryRule.validateDocument(dto.documentId)) {
      throw new ValidationError('Invalid document ID for country ' + dto.countryCode);
    }

    // 2. Encrypt documentId
    const encryptedDocId = this.encryptionService.encrypt(dto.documentId);

    // 3. Check for duplicates
    const exists = await this.applicationRepository.existsByDocumentAndCountry(
      encryptedDocId,
      dto.countryCode,
    );
    if (exists) {
      throw new ConflictError('Application already exists for this document and country');
    }

    // 4. Create domain entity
    const application = Application.create({
      countryCode: dto.countryCode as CountryCode,
      fullName: dto.fullName,
      documentId: encryptedDocId,
      requestedAmount: dto.requestedAmount,
      monthlyIncome: dto.monthlyIncome,
    });

    // 5. Persist
    const saved = await this.applicationRepository.create(application);

    // 6. Enqueue risk evaluation
    await this.queueService.enqueue(QUEUE_NAMES.RISK_EVALUATION, {
      applicationId: saved.id,
      countryCode: saved.countryCode,
    });

    // 7. Enqueue audit
    await this.queueService.enqueue(QUEUE_NAMES.AUDIT, {
      applicationId: saved.id,
      eventType: 'application_created',
      payload: { countryCode: saved.countryCode, fullName: saved.fullName },
    });

    // 8. Emit WebSocket
    this.webSocketEmitter.emitToCountry(saved.countryCode, 'application:created', saved);

    // 9. Invalidate list caches
    await this.cacheService.invalidate('applications:*');

    // 10. Return response (with decrypted+masked doc)
    return toApplicationResponse(saved, this.encryptionService);
  }
}
