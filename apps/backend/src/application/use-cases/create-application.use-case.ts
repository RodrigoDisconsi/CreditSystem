import type { CountryCode } from '@credit-system/shared';
import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import type { IQueueService } from '../../domain/interfaces/queue-service.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import { Application } from '../../domain/entities/application.entity.js';
import { createCountryRule } from '../../domain/factories/country-rule.factory.js';
import { ValidationError, ConflictError } from '../../shared/errors/index.js';
import { QUEUE_NAMES } from '../../domain/constants/queue-names.js';
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

    // 2. Check for duplicates (repository handles encryption)
    const exists = await this.applicationRepository.existsByDocumentAndCountry(
      dto.documentId,
      dto.countryCode,
    );
    if (exists) {
      throw new ConflictError('Application already exists for this document and country');
    }

    // 3. Create domain entity (repository handles encryption on persist)
    const application = Application.create({
      countryCode: dto.countryCode as CountryCode,
      fullName: dto.fullName,
      documentId: dto.documentId,
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

    // 8. Build response DTO (plain object with masked doc + proper field names)
    const responseDto = toApplicationResponse(saved, this.encryptionService);

    // 9. Emit WebSocket (must use DTO, not domain entity — entity has private _status fields)
    this.webSocketEmitter.emitToCountry(saved.countryCode, 'application:created', responseDto);

    // 10. Invalidate list caches
    await this.cacheService.invalidate('applications:*');

    return responseDto;
  }
}
