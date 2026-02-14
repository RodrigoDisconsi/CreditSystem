import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { WebhookNotificationDto } from '../dto/webhook-notification.dto.js';
import type { ApplicationResponseDto } from '../dto/application-response.dto.js';
import { toApplicationResponse } from '../dto/application-response.dto.js';

export class HandleBankWebhookUseCase {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly cacheService: ICacheService,
    private readonly webSocketEmitter: IWebSocketEmitter,
    private readonly encryptionService: IEncryptionService,
  ) {}

  async execute(dto: WebhookNotificationDto): Promise<ApplicationResponseDto> {
    // 1. Find application by ID
    const application = await this.applicationRepository.findById(dto.applicationId);
    if (!application) {
      throw new NotFoundError(`Application with id '${dto.applicationId}' not found`);
    }

    // 2. Idempotency check: if bankData already set with same evaluatedAt, skip update
    const existingBankData = application.bankData;
    if (
      existingBankData &&
      'evaluatedAt' in existingBankData &&
      dto.data['evaluatedAt'] &&
      existingBankData.evaluatedAt === dto.data['evaluatedAt']
    ) {
      return toApplicationResponse(application, this.encryptionService);
    }

    // 3. Update bankData
    const updated = await this.applicationRepository.updateBankData(
      dto.applicationId,
      dto.data,
    );

    // 4. Invalidate caches (single + list)
    await Promise.all([
      this.cacheService.del(`application:${dto.applicationId}`),
      this.cacheService.invalidate('applications:*'),
    ]);

    // 5. Emit WebSocket event
    this.webSocketEmitter.emitToCountry(
      updated.countryCode,
      'application:risk-evaluated',
      {
        applicationId: updated.id,
        status: updated.status,
      },
    );

    this.webSocketEmitter.emitToApplication(
      updated.id,
      'application:risk-evaluated',
      {
        applicationId: updated.id,
        status: updated.status,
      },
    );

    // 6. Return response
    return toApplicationResponse(updated, this.encryptionService);
  }
}
