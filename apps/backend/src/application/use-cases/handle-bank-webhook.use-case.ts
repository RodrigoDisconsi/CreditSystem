import type { IApplicationRepository } from '../../domain/interfaces/application-repository.interface.js';
import type { ICacheService } from '../../domain/interfaces/cache-service.interface.js';
import type { IWebSocketEmitter } from '../../domain/interfaces/websocket-emitter.interface.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import { CountryRuleFactory } from '../../domain/factories/country-rule.factory.js';
import type { BankData } from '@credit-system/shared';
import { determineStatusFromRisk } from '../../domain/rules/risk-status.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { WebhookNotificationDto } from '../dto/webhook-notification.dto.js';
import type { ApplicationResponseDto } from '../dto/application-response.dto.js';
import { toApplicationResponse } from '../dto/application-response.dto.js';

export class HandleBankWebhookUseCase {
  private readonly countryRuleFactory: CountryRuleFactory;

  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly cacheService: ICacheService,
    private readonly webSocketEmitter: IWebSocketEmitter,
    private readonly encryptionService: IEncryptionService,
  ) {
    this.countryRuleFactory = new CountryRuleFactory();
  }

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
    const withBankData = await this.applicationRepository.updateBankData(
      dto.applicationId,
      dto.data,
    );

    // 4. Re-evaluate risk using country rules
    const countryRule = this.countryRuleFactory.getRule(withBankData.countryCode);
    const riskResult = countryRule.evaluateRisk(withBankData, dto.data as unknown as BankData);

    const newStatus = determineStatusFromRisk(riskResult);

    // 5. Validate transition via domain entity before persisting
    if (!withBankData.canTransitionTo(newStatus as import('@credit-system/shared').ApplicationStatus)) {
      // If transition is invalid (e.g., already approved), skip status update
      return toApplicationResponse(withBankData, this.encryptionService);
    }

    // 6. Update status based on risk evaluation
    const updated = await this.applicationRepository.updateStatus(dto.applicationId, newStatus);

    // 6. Invalidate caches (single + list)
    await Promise.all([
      this.cacheService.del(`application:${dto.applicationId}`),
      this.cacheService.invalidate('applications:*'),
    ]);

    // 7. Emit WebSocket events
    this.webSocketEmitter.emitToCountry(
      updated.countryCode,
      'application:status-changed',
      {
        applicationId: updated.id,
        oldStatus: application.status,
        newStatus,
        changedAt: new Date().toISOString(),
      },
    );

    this.webSocketEmitter.emitToApplication(
      updated.id,
      'application:risk-evaluated',
      {
        applicationId: updated.id,
        status: newStatus,
      },
    );

    // 8. Return response
    return toApplicationResponse(updated, this.encryptionService);
  }
}
