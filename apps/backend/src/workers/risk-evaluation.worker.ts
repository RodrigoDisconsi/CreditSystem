import type { Job } from 'bullmq';
import type { IApplicationRepository } from '../domain/interfaces/application-repository.interface.js';
import type { IWebSocketEmitter } from '../domain/interfaces/websocket-emitter.interface.js';
import type { IQueueService } from '../domain/interfaces/queue-service.interface.js';
import type { IEncryptionService } from '../domain/interfaces/encryption.interface.js';
import type { ICacheService } from '../domain/interfaces/cache-service.interface.js';
import { CountryRuleFactory } from '../domain/factories/country-rule.factory.js';
import { BankProviderFactory } from '../domain/factories/bank-provider.factory.js';
import type { CountryCode } from '@credit-system/shared';
import { determineStatusFromRisk } from '../domain/rules/risk-status.js';
import { logger } from '../shared/logger.js';

export class RiskEvaluationWorker {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly bankProviderFactory: BankProviderFactory,
    private readonly countryRuleFactory: CountryRuleFactory,
    private readonly webSocketEmitter: IWebSocketEmitter,
    private readonly queueService: IQueueService,
    private readonly encryptionService: IEncryptionService,
    private readonly cacheService: ICacheService,
  ) {}

  async process(job: Job): Promise<void> {
    const { applicationId, countryCode } = job.data as { applicationId: string; countryCode: CountryCode };

    // 1. Fetch application
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // 2. Get bank data from provider (documentId already decrypted by repository)
    const provider = this.bankProviderFactory.getProvider(countryCode);
    const bankData = await provider.evaluate(applicationId, countryCode, application.documentId);

    // 3. Run country rules
    const countryRule = this.countryRuleFactory.getRule(countryCode);
    const result = countryRule.evaluateRisk(application, bankData);

    // 4. Determine status
    const newStatus = determineStatusFromRisk(result);

    // 5. Update application with bank data
    const updatedApp = await this.applicationRepository.updateBankData(applicationId, bankData as unknown as Record<string, unknown>);

    // 6. Validate domain transition before persisting
    if (!updatedApp.canTransitionTo(newStatus as import('@credit-system/shared').ApplicationStatus)) {
      logger.info(`Skipping status update for ${applicationId}: invalid transition from '${updatedApp.status}' to '${newStatus}'`);
      return;
    }

    // 7. Update status (use updatedAt from step 5, not the original fetch)
    await this.applicationRepository.updateStatus(applicationId, newStatus);

    // 6.1 Invalidate caches so API returns fresh data
    await Promise.all([
      this.cacheService.del(`application:${applicationId}`),
      this.cacheService.invalidate('applications:*'),
    ]);

    // 7. Emit WebSocket
    this.webSocketEmitter.emitToApplication(applicationId, 'application:risk-evaluated', {
      applicationId,
      status: newStatus,
      riskScore: result.score,
    });
    this.webSocketEmitter.emitToCountry(countryCode, 'application:status-changed', {
      applicationId,
      oldStatus: application.status,
      newStatus,
      changedAt: new Date().toISOString(),
    });

    // 8. Enqueue audit
    await this.queueService.enqueue('audit', {
      applicationId,
      eventType: 'risk_evaluated',
      payload: {
        bankData,
        result,
        newStatus,
      },
    });

    logger.info(`Risk evaluation completed for ${applicationId}: ${newStatus} (score: ${result.score})`);
  }
}
