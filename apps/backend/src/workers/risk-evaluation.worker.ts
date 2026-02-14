import type { Job } from 'bullmq';
import type { IApplicationRepository } from '../domain/interfaces/application-repository.interface.js';
import type { IWebSocketEmitter } from '../domain/interfaces/websocket-emitter.interface.js';
import type { IQueueService } from '../domain/interfaces/queue-service.interface.js';
import type { IEncryptionService } from '../domain/interfaces/encryption.interface.js';
import { CountryRuleFactory } from '../domain/factories/country-rule.factory.js';
import { BankProviderFactory } from '../domain/factories/bank-provider.factory.js';
import type { CountryCode } from '@credit-system/shared';

export class RiskEvaluationWorker {
  constructor(
    private readonly applicationRepository: IApplicationRepository,
    private readonly bankProviderFactory: BankProviderFactory,
    private readonly countryRuleFactory: CountryRuleFactory,
    private readonly webSocketEmitter: IWebSocketEmitter,
    private readonly queueService: IQueueService,
    private readonly encryptionService: IEncryptionService,
  ) {}

  async process(job: Job): Promise<void> {
    const { applicationId, countryCode } = job.data as { applicationId: string; countryCode: CountryCode };

    // 1. Fetch application
    const application = await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // 2. Get bank data from provider
    const provider = this.bankProviderFactory.getProvider(countryCode);
    const decryptedDocId = this.encryptionService.decrypt(application.documentId);
    const bankData = await provider.evaluate(applicationId, countryCode, decryptedDocId);

    // 3. Run country rules
    const countryRule = this.countryRuleFactory.getRule(countryCode);
    const result = countryRule.evaluateRisk(application, bankData);

    // 4. Determine status
    let newStatus: string;
    if (result.approved) {
      newStatus = 'approved';
    } else if (result.score >= 50 && !result.approved) {
      // Borderline - needs manual review (for MX high amounts)
      newStatus = 'under_review';
    } else {
      newStatus = 'rejected';
    }

    // 5. Update application with bank data
    await this.applicationRepository.updateBankData(applicationId, bankData as unknown as Record<string, unknown>);

    // 6. Update status
    await this.applicationRepository.updateStatus(applicationId, newStatus, application.updatedAt);

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

    console.log(`Risk evaluation completed for ${applicationId}: ${newStatus} (score: ${result.score})`);
  }
}
